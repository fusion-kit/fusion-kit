# Based on `optimized_txt2img.py` and `optimized_img2img.py` from optimizedSD

import torch
import numpy as np
from omegaconf import OmegaConf
from PIL import Image
from itertools import islice
from einops import rearrange, repeat
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

def transform_image(image, target_width=None, target_height=None):
    image = image.convert("RGB")
    width, height = image.size

    if target_width is not None and target_height is not None:
        width, height = target_width, target_height

    width, height = map(lambda x: x - x % 64, (width, height))  # resize to integer multiple of 32

    image = image.resize((width, height), resample=Image.Resampling.LANCZOS)
    image = np.array(image).astype(np.float32) / 255.0
    image = image[None].transpose(0, 3, 1, 2)
    image = torch.from_numpy(image)
    return 2.0 * image - 1.0

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
        self.config = OmegaConf.load(config)
        self.ckpt = ckpt
        self.sd = None
        self.model = None
        self.model_cs = None
        self.model_fs = None
        self.model_fs_precision = None

        self.load()

    def load_sd(self):
        print("Loading Stable Diffusion model")
        sd = load_model_from_config(self.ckpt)
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

        return sd

    def load(self, model_fs_precision="full"):
        sd = None

        if self.model is None:
            if sd is None:
                sd = self.load_sd()

            model = instantiate_from_config(self.config.modelUNet)
            _, _ = model.load_state_dict(sd, strict=False)
            model.eval()
            model.unet_bs = self.unet_bs
            model.cdevice = self.device
            model.turbo = self.turbo

            if self.device != "cpu" and self.precision == "autocast":
                model.half()

            self.model = model

        if self.model_cs is None:
            if sd is None:
                sd = self.load_sd()

            modelCS = instantiate_from_config(self.config.modelCondStage)
            _, _ = modelCS.load_state_dict(sd, strict=False)
            modelCS.eval()
            modelCS.cond_stage_model.device = self.device

            if self.device != "cpu" and self.precision == "autocast":
                modelCS.half()

            self.model_cs = modelCS

        if self.model_fs is None or self.model_fs_precision != model_fs_precision:
            if sd is None:
                sd = self.load_sd()

            modelFS = instantiate_from_config(self.config.modelFirstStage)
            _, _ = modelFS.load_state_dict(sd, strict=False)
            modelFS.eval()

            if self.device != "cpu" and self.precision == "autocast" and model_fs_precision != "full":
                modelFS.half()

            self.model_fs = modelFS
            self.model_fs_precision = model_fs_precision

        del sd

        print("Finished loading Stable Diffusion model")

    def dream(
        self,
        prompt,
        seed,
        num_images,
        sampler,
        sampler_steps,
        sampler_eta,
        guidance_scale,
        downsampling_factor,
        latent_channels,
        num_images_per_batch,
        steps_per_image_preview,
        base_image=None,
        base_image_decimation=None,
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
        sampler
            Sampler to use ('DDIM', 'PLMS').
        sampler_steps
            Number of sampler (DDIM/PLMS) sampling steps to use per image.
        sampler_eta
            Sampler eta (a value of 0.0 corresponds to deterministic
            sampling).
        guidance_scale
            Unconditional guidance scale (how closely to follow the prompt).
        downsampling_factor
            Downsampling factor.
        latent_channels
            Latent channels.
        num_images_per_batch
            Number of images to submit to the model in a single batch.
        image_progress_callback
            A callback function that gets invoked repeatedly with the total
            progress of each image. Image previews and the final image are
            sent to the callback when available.
        steps_per_image_preview:
            How many sampling steps should be run before generating a preview
            image. A value of 1 will generate a preview at every step, which
            will also be twice as slow as generating an image with previews
            disabled. Set to 0 to disable preview generation.
        base_image
            A base image to use when generating images. When set, images
            will be "inspired by" the base image guided by the prompt
            (img2img mode). When not set, only the prompt will be used to
            generate images (txt2img mode).
        base_image_decimation
            Value between 0.0 and 1.0 indicating the strength used for
            noising/denoising the base image. Must be set when `base_image`
            is set. A value of 1.0 completely decimates the input image,
            discarding most details.
        """
        # opt_fixed_code = False # if enabled, uses the same starting code across samples
        opt_ddim_eta = sampler_eta
        opt_H = 512 # image height, in pixel space
        opt_W = 512 # image width, in pixel space
        opt_C = latent_channels
        opt_f = downsampling_factor
        opt_scale = guidance_scale
        opt_device = self.device
        opt_precision = self.precision
        if sampler == "DDIM":
            opt_sampler = "ddim"
        elif sampler == "PLMS":
            opt_sampler = "plms"
        else:
            raise Exception(f'Unknown sampler: {sampler}')

        model_fs_precision = "full"

        # Reduce the sampler steps when using a base image
        actual_sampler_steps = sampler_steps

        if base_image is not None:
            assert base_image_decimation is not None, "base_image_decimation is required if base_image is set"
            base_image_decimation = np.clip(base_image_decimation, 0.0, 1.0)

            # load the first-stage model with the same precision as the other models
            model_fs_precision = "autocast"

            # Reduce the sampler steps when using a base image
            actual_sampler_steps = int(base_image_decimation * sampler_steps)

        seed_everything(seed)

        self.load(model_fs_precision=model_fs_precision)
        model = self.model
        modelCS = self.model_cs
        modelFS = self.model_fs

        start_code = None
        # if opt_fixed_code:
        #     start_code = torch.randn([opt_n_samples, opt_C, opt_H // opt_f, opt_W // opt_f], device=opt_device)

        batches = chunk(range(num_images), num_images_per_batch)

        init_image_batch_size = np.minimum(num_images_per_batch, num_images)
        init_latent = None

        if base_image is not None:
            init_image = transform_image(base_image).to(opt_device)
            if opt_precision == "autocast" and opt_device != "cpu":
                init_image = init_image.half()

            init_image_batch = repeat(init_image, "1 ... -> b ...", b=init_image_batch_size)

            modelFS.to(opt_device)

            init_image_encoded = modelFS.encode_first_stage(init_image_batch)
            init_latent = modelFS.get_first_stage_encoding(init_image_encoded)

            if opt_device != "cpu":
                mem = torch.cuda.memory_allocated() / 1e6
                modelFS.to("cpu")
                while torch.cuda.memory_allocated() / 1e6 >= mem:
                    time.sleep(1)

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
                'total_steps': actual_sampler_steps,
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

                    x0 = None
                    if base_image is not None:
                        if init_image_batch_size != batch_size:
                            # TODO: Refactor this
                            init_image_batch_size = batch_size
                            init_image_batch = repeat(init_image, "1 ... -> b ...", b=init_image_batch_size)

                            modelFS.to(opt_device)

                            init_image_encoded = modelFS.encode_first_stage(init_image_batch)
                            init_latent = modelFS.get_first_stage_encoding(init_image_encoded)

                            # TODO: Skip this when previews are used (modelFS
                            # gets moved to the target device anyway)
                            if opt_device != "cpu":
                                mem = torch.cuda.memory_allocated() / 1e6
                                modelFS.to("cpu")
                                while torch.cuda.memory_allocated() / 1e6 >= mem:
                                    time.sleep(1)

                        # Start the model with the base image instead of noise
                        x0 = model.stochastic_encode(
                            init_latent,
                            torch.tensor([actual_sampler_steps] * batch_size).to(opt_device),
                            batch_seed,
                            opt_ddim_eta,
                            sampler_steps,
                        )

                    img_callback = make_img_callback(
                        image_progress_callback=image_progress_callback,
                        images=images,
                        batch_image_indices=batch_image_indices,
                        steps_per_image_preview=steps_per_image_preview,
                        modelFS=modelFS,
                        preview_device=opt_device,
                    )

                    samples_ddim = model.sample(
                        S=actual_sampler_steps,
                        conditioning=c,
                        x0=x0,
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
                        images[image_index]['completed_steps'] = actual_sampler_steps

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
