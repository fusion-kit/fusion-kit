# Based on `optimized_txt2img.py` from optimizedSD

import argparse, os, re
import torch
import numpy as np
import copy
from random import randint
from omegaconf import OmegaConf
from PIL import Image
from tqdm import tqdm, trange
from itertools import islice
from einops import rearrange
from torchvision.utils import make_grid
import time
from pytorch_lightning import seed_everything
from torch import autocast
from contextlib import contextmanager, nullcontext
from ldm.util import instantiate_from_config
from optimizedSD.optimUtils import split_weighted_subprompts, logger
from transformers import logging
# from samplers import CompVisDenoiser
# set logging for stable diffusion

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
        image_sample_callback=None,
        steps_per_image_preview=10
    ):
        opt_prompt = prompt
        opt_ddim_steps = 50 # number of ddim sampling steps
        opt_fixed_code = False # if enabled, uses the same starting code across samples
        opt_ddim_eta = 0.0 # ddim eta (eta=0.0 corresponds to deterministic sampling)
        opt_n_iter = 1 # sample this often
        opt_H = 512 # image height, in pixel space
        opt_W = 512 # image width, in pixel space
        opt_C = 4 # latent channels
        opt_f = 8 # downsampling factor
        opt_n_samples = 1 # how many samples to produce for each given prompt. A.k.a. batch size
        opt_n_rows = 0 # rows in the grid (default: n_samples)
        opt_scale = 7.5 # unconditional guidance scale: eps = eps(x, empty) + scale * (eps(x, cond) - eps(x, empty))
        opt_device = self.device # specify GPU (cuda/cuda:0/cuda:1/...)
        opt_from_file = None # if specified, load prompts from this file
        opt_seed = None # the seed (for reproducible sampling)
        opt_precision = self.precision # evaluate at this precision [full, autocast]
        opt_sampler = "ddim" # sampler [ddim, plms]

        initial_seed = opt_seed
        if initial_seed == None:
            initial_seed = randint(0, 1000000)
        seed_everything(initial_seed)

        current_seed = initial_seed

        models = self.load()
        model = models['model']
        modelCS = models['modelCS']
        modelFS = models['modelFS']

        start_code = None
        if opt_fixed_code:
            start_code = torch.randn([opt_n_samples, opt_C, opt_H // opt_f, opt_W // opt_f], device=opt_device)


        batch_size = opt_n_samples
        n_rows = opt_n_rows if opt_n_rows > 0 else batch_size
        if not opt_from_file:
            prompt = opt_prompt
            assert prompt is not None
            data = [batch_size * [prompt]]

        else:
            print(f"reading prompts from {opt_from_file}")
            with open(opt_from_file, "r") as f:
                data = f.read().splitlines()
                data = batch_size * list(data)
                data = list(chunk(sorted(data), batch_size))


        if opt_precision == "autocast" and opt_device != "cpu":
            precision_scope = autocast
        else:
            precision_scope = nullcontext

        images = []
        with torch.no_grad():
            all_samples = list()
            for n in trange(opt_n_iter, desc="Sampling"):
                for prompts in tqdm(data, desc="data"):
                    with precision_scope("cuda"):
                        modelCS.to(opt_device)
                        uc = None
                        if opt_scale != 1.0:
                            uc = modelCS.get_learned_conditioning(batch_size * [""])
                        if isinstance(prompts, tuple):
                            prompts = list(prompts)

                        subprompts, weights = split_weighted_subprompts(prompts[0])
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
                            c = modelCS.get_learned_conditioning(prompts)

                        shape = [opt_n_samples, opt_C, opt_H // opt_f, opt_W // opt_f]

                        if opt_device != "cpu":
                            mem = torch.cuda.memory_allocated() / 1e6
                            modelCS.to("cpu")
                            while torch.cuda.memory_allocated() / 1e6 >= mem:
                                time.sleep(1)


                        if image_sample_callback is not None:
                            modelFS.to(opt_device)
                            img_callback = make_img_callback(
                                image_sample_callback=image_sample_callback,
                                total_steps=opt_ddim_steps,
                                steps_per_preview=steps_per_image_preview,
                                modelFS=modelFS,
                                batch_size=batch_size,
                            )
                        else:
                            img_callback = None

                        samples_ddim = model.sample(
                            S=opt_ddim_steps,
                            conditioning=c,
                            seed=current_seed,
                            shape=shape,
                            verbose=False,
                            unconditional_guidance_scale=opt_scale,
                            unconditional_conditioning=uc,
                            eta=opt_ddim_eta,
                            x_T=start_code,
                            sampler = opt_sampler,
                            img_callback=img_callback
                        )

                        modelFS.to(opt_device)

                        print(samples_ddim.shape)
                        for i in range(batch_size):
                            x_samples_ddim = modelFS.decode_first_stage(samples_ddim[i].unsqueeze(0))
                            x_sample = torch.clamp((x_samples_ddim + 1.0) / 2.0, min=0.0, max=1.0)
                            x_sample = 255.0 * rearrange(x_sample[0].cpu().numpy(), "c h w -> h w c")
                            image = Image.fromarray(x_sample.astype(np.uint8))
                            images.append({
                                'image': image,
                                'seed': current_seed,
                            })
                            current_seed += 1

                        if opt_device != "cpu":
                            mem = torch.cuda.memory_allocated() / 1e6
                            modelFS.to("cpu")
                            while torch.cuda.memory_allocated() / 1e6 >= mem:
                                time.sleep(1)
                        del samples_ddim
                        print("memory_final = ", torch.cuda.memory_allocated() / 1e6)

        return {
            'images': images,
            'seed': initial_seed,
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

def make_img_callback(image_sample_callback, total_steps, steps_per_preview, modelFS, batch_size):
    if image_sample_callback is None:
        return None

    def img_callback(image_samples, step_index):
        should_generate_preview = step_index % steps_per_preview == 0
        if should_generate_preview:
            images = image_samples_to_images(
                image_samples=image_samples,
                modelFS=modelFS,
                batch_size=batch_size,
            )
            image_sample_callback(images, step_index)

    return img_callback
