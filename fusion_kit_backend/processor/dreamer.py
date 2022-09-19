# Based on `optimized_txt2img.py` from optimizedSD

import torch
import numpy as np
from random import randint
from omegaconf import OmegaConf
from PIL import Image
from itertools import islice
from einops import rearrange
import time
from pytorch_lightning import seed_everything
from torch import autocast
from contextlib import nullcontext
from ldm.util import instantiate_from_config
from optimizedSD.optimUtils import split_weighted_subprompts
from transformers import logging
from ulid import ULID

logging.set_verbosity_error()


def chunk(it, size):
    it = iter(it)
    return iter(lambda: tuple(islice(it, size)), ())


def load_model_from_config(ckpt, verbose=False):
    print(f"Loading model from {ckpt}")
    pl_sd = torch.load(ckpt, map_location="cpu")
    if "global_step" in pl_sd:
        print(f"Global Step: {pl_sd['global_step']}")
    sd = pl_sd["state_dict"]
    return sd


CONFIG_FILE = "stable_diffusion/optimizedSD/v1-inference.yaml"
CKPT_FILE = "stable_diffusion/models/ldm/stable-diffusion-v1/model.ckpt"

class Dreamer():
    def __init__(
        self,
        device="cuda",
        unet_bs=1,
        turbo=True,
        precision="autocast",
        config=CONFIG_FILE,
        ckpt=CKPT_FILE,
    ):
        self.device = device
        self.unet_bs = unet_bs
        self.turbo = turbo
        self.precision = precision
        self.config = config
        self.ckpt = ckpt
        self.models = None

        self.load()

    def load(self):
        if self.models is not None:
            return self.models

        print("Loading Stable Diffusion model")
        sd = load_model_from_config(f"{self.ckpt}")
        li, lo = [], []
        for key, value in sd.items():
            sp = key.split(".")
            if (sp[0]) == "model":
                if "input_blocks" in sp:
                    li.append(key)
                elif "middle_block" in sp:
                    li.append(key)
                elif "time_embed" in sp:
                    li.append(key)
                else:
                    lo.append(key)
        for key in li:
            sd["model1." + key[6:]] = sd.pop(key)
        for key in lo:
            sd["model2." + key[6:]] = sd.pop(key)

        config = OmegaConf.load(f"{self.config}")

        model = instantiate_from_config(config.modelUNet)
        _, _ = model.load_state_dict(sd, strict=False)
        model.eval()
        model.unet_bs = self.unet_bs
        model.cdevice = self.device
        model.turbo = self.turbo

        modelCS = instantiate_from_config(config.modelCondStage)
        _, _ = modelCS.load_state_dict(sd, strict=False)
        modelCS.eval()
        modelCS.cond_stage_model.device = self.device

        modelFS = instantiate_from_config(config.modelFirstStage)
        _, _ = modelFS.load_state_dict(sd, strict=False)
        modelFS.eval()
        del sd

        if self.device != "cpu" and self.precision == "autocast":
            model.half()
            modelCS.half()

        self.models = {
            'model': model,
            'modelCS': modelCS,
            'modelFS': modelFS,
        }

        print("Finished loading Stable Diffusion model")
        return self.models

    def txt2img(
        self,
        prompt,
        seed,
        num_images,
        num_steps_per_image,
        num_images_per_batch,
        steps_per_image_preview,
        image_progress_callback=None,
    ):
        """
        Generate a set of images with Stable Diffusion.

        Parameters
        ----------
        prompt
            A text description of an image to generate.
        seed
            The RNG seed value to use to generate images. Using the same
            seed value with the same inputs will produce the same result.
        num_images
            The total number of images to generate.
        num_steps_per_image
            Number of sampler (DDIM/PLMS) sampling steps to use per image.
        num_images_per_batch
            Number of images to submit to the model in a single batch.
        image_preview_callback
            A callback function that gets invoked whenever a preview image
            is generated. Set to `None` to disable preview generation.
        steps_per_image_preview:
            How many sampling steps should be run before generating a preview
            image. A value of 1 will generate a preview at every step, which
            will also be twice as slow as generating an image with previews
            disabled. Set to 0 to disable preview generation.
        """
        # opt_ddim_steps = 50 # number of ddim sampling steps
        # opt_fixed_code = False # if enabled, uses the same starting code across samples
        opt_ddim_eta = 0.0 # ddim eta (eta=0.0 corresponds to deterministic sampling)
        opt_H = 512 # image height, in pixel space
        opt_W = 512 # image width, in pixel space
        opt_C = 4 # latent channels
        opt_f = 8 # downsampling factor
        opt_scale = 7.5 # unconditional guidance scale: eps = eps(x, empty) + scale * (eps(x, cond) - eps(x, empty))
        opt_device = self.device # specify GPU (cuda/cuda:0/cuda:1/...)
        opt_precision = self.precision # evaluate at this precision [full, autocast]
        opt_sampler = "ddim" # sampler [ddim, plms]

        seed_everything(seed)

        models = self.load()
        model = models['model']
        modelCS = models['modelCS']
        modelFS = models['modelFS']

        start_code = None
        # if opt_fixed_code:
        #     start_code = torch.randn([opt_n_samples, opt_C, opt_H // opt_f, opt_W // opt_f], device=opt_device)

        batches = chunk(range(num_images), num_images_per_batch)

        if opt_precision == "autocast" and opt_device != "cpu":
            precision_scope = autocast
        else:
            precision_scope = nullcontext

        images = [
            {
                'index': i,
                'state': 'pending',
                'seed': seed + i,
                'image': None,
                'image_key': None,
                'completed_steps': 0,
                'total_steps': num_steps_per_image,
            }
            for i in range(num_images)
        ]

        with torch.no_grad():
            for batch_image_indices in batches:
                batch_size = len(batch_image_indices)
                batch_seed = images[batch_image_indices[0]]['seed']

                for i in batch_image_indices:
                    images[i]['state'] = 'running'
                    images[i]['completed_steps'] = 0

                with precision_scope("cuda"):
                    modelCS.to(opt_device)
                    uc = None
                    if opt_scale != 1.0:
                        uc = modelCS.get_learned_conditioning(batch_size * [""])

                    subprompts, weights = split_weighted_subprompts(prompt)
                    if len(subprompts) > 1:
                        c = torch.zeros_like(uc)
                        totalWeight = sum(weights)
                        # normalize each "sub prompt" and add it
                        for i in range(len(subprompts)):
                            weight = weights[i]
                            # if not skip_normalize:
                            weight = weight / totalWeight
                            c = torch.add(c, modelCS.get_learned_conditioning(subprompts[i]), alpha=weight)
                    else:
                        c = modelCS.get_learned_conditioning([prompt] * batch_size)

                    shape = [batch_size, opt_C, opt_H // opt_f, opt_W // opt_f]

                    if opt_device != "cpu":
                        mem = torch.cuda.memory_allocated() / 1e6
                        modelCS.to("cpu")
                        while torch.cuda.memory_allocated() / 1e6 >= mem:
                            time.sleep(1)

                    img_callback = make_img_callback(
                        image_progress_callback=image_progress_callback,
                        images=images,
                        batch_image_indices=batch_image_indices,
                        steps_per_image_preview=steps_per_image_preview,
                        modelFS=modelFS,
                        preview_device=opt_device,
                    )

                    samples_ddim = model.sample(
                        S=num_steps_per_image,
                        conditioning=c,
                        seed=batch_seed,
                        shape=shape,
                        verbose=False,
                        unconditional_guidance_scale=opt_scale,
                        unconditional_conditioning=uc,
                        eta=opt_ddim_eta,
                        x_T=start_code,
                        sampler = opt_sampler,
                        img_callback=img_callback,
                    )

                    modelFS.to(opt_device)

                    for batch_index, image_index in enumerate(batch_image_indices):
                        x_samples_ddim = modelFS.decode_first_stage(samples_ddim[batch_index].unsqueeze(0))
                        x_sample = torch.clamp((x_samples_ddim + 1.0) / 2.0, min=0.0, max=1.0)
                        x_sample = 255.0 * rearrange(x_sample[0].cpu().numpy(), "c h w -> h w c")
                        image = Image.fromarray(x_sample.astype(np.uint8))
                        images[image_index]['image'] = image
                        images[image_index]['image_key'] = 'image'
                        images[image_index]['state'] = 'complete'
                        images[image_index]['completed_steps'] = num_steps_per_image

                    image_progress_callback(image_progress=images)

                    if opt_device != "cpu":
                        mem = torch.cuda.memory_allocated() / 1e6
                        modelFS.to("cpu")
                        while torch.cuda.memory_allocated() / 1e6 >= mem:
                            time.sleep(1)
                    del samples_ddim
                    print("memory_final = ", torch.cuda.memory_allocated() / 1e6)

        return {
            'images': images,
            'seed': seed,
        }

# Based on `sample_iteration_callback` from this PR:
# https://github.com/sd-webui/stable-diffusion-webui/pull/611
#
# Full file here:
# https://github.com/cobryan05/stable-diffusion-webui/blob/19dc3779f603a736f3f15dbf78ea402640bff3af/webui.py
def image_samples_to_images(image_samples, modelFS, batch_size):
    images = []
    for i in range(batch_size):
        x_samples_ddim = modelFS.decode_first_stage(image_samples[i].unsqueeze(0))
        x_sample = torch.clamp((x_samples_ddim + 1.0) / 2.0, min=0.0, max=1.0)
        x_sample = 255.0 * rearrange(x_sample[0].cpu().numpy(), "c h w -> h w c")
        image = Image.fromarray(x_sample.astype(np.uint8))
        images.append(image)
    return images

def make_img_callback(
    image_progress_callback,
    images,
    batch_image_indices,
    steps_per_image_preview,
    modelFS,
    preview_device,
):
    if image_progress_callback is None:
        return None

    previews_enabled = steps_per_image_preview > 0

    if previews_enabled:
        # The model must be moved before generating previews
        modelFS.to(preview_device)

    def img_callback(image_samples, step_index):
        should_generate_preview = previews_enabled and step_index % steps_per_image_preview == 0
        if should_generate_preview:
            batch_preview_images = image_samples_to_images(
                image_samples=image_samples,
                modelFS=modelFS,
                batch_size=len(batch_image_indices),
            )

            for batch_index, image_index in enumerate(batch_image_indices):
                images[image_index]['image'] = batch_preview_images[batch_index]
                images[image_index]['image_key'] = f'preview_{ULID()}'

        for image_index in batch_image_indices:
            images[image_index]['completed_steps'] = step_index

        image_progress_callback(image_progress=images)

    return img_callback
