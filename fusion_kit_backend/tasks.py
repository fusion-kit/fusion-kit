# Based on `optimized_txt2img.py` from optimizedSD

import argparse, os, re
import torch
import numpy as np
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


def txt2img():
    opt_prompt = "high speed photo of a lightning bolt at night"
    opt_outdir = "../sd-outputs-test/"
    opt_ddim_steps = 50 # number of ddim sampling steps
    opt_fixed_code = False # if enabled, uses the same starting code across samples
    opt_ddim_eta = 0.0 # ddim eta (eta=0.0 corresponds to deterministic sampling)
    opt_n_iter = 1 # sample this often
    opt_H = 512 # image height, in pixel space
    opt_W = 512 # image width, in pixel space
    opt_C = 4 # latent channels
    opt_f = 8 # downsampling factor
    opt_n_samples = 5 # how many samples to produce for each given prompt. A.k.a. batch size
    opt_n_rows = 0 # rows in the grid (default: n_samples)
    opt_scale = 7.5 # unconditional guidance scale: eps = eps(x, empty) + scale * (eps(x, cond) - eps(x, empty))
    opt_device = "cuda" # specify GPU (cuda/cuda:0/cuda:1/...)
    opt_from_file = None # if specified, load prompts from this file
    opt_seed = None # the seed (for reproducible sampling)
    opt_unet_bs = 1 # Slightly reduces inference time at the expense of high VRAM (value > 1 not recommended)
    opt_turbo = False # Reduces inference time on the expense of 1GB VRAM
    opt_precision = "autocast" # evaluate at this precision [full, autocast]
    opt_format = "png" # output image format [jpg, png]
    opt_sampler = "plms" # sampler [ddim, plms]

    config = CONFIG_FILE
    ckpt = CKPT_FILE


    tic = time.time()
    # os.makedirs(opt_outdir, exist_ok=True)
    outpath = opt_outdir
    grid_count = len(os.listdir(outpath)) - 1

    if opt_seed == None:
        opt_seed = randint(0, 1000000)
    seed_everything(opt_seed)

    # Logging
    # logger(vars(opt), log_csv = "logs/txt2img_logs.csv")

    sd = load_model_from_config(f"{ckpt}")
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

    config = OmegaConf.load(f"{config}")

    model = instantiate_from_config(config.modelUNet)
    _, _ = model.load_state_dict(sd, strict=False)
    model.eval()
    model.unet_bs = opt_unet_bs
    model.cdevice = opt_device
    model.turbo = opt_turbo

    modelCS = instantiate_from_config(config.modelCondStage)
    _, _ = modelCS.load_state_dict(sd, strict=False)
    modelCS.eval()
    modelCS.cond_stage_model.device = opt_device

    modelFS = instantiate_from_config(config.modelFirstStage)
    _, _ = modelFS.load_state_dict(sd, strict=False)
    modelFS.eval()
    del sd

    if opt_device != "cpu" and opt_precision == "autocast":
        model.half()
        modelCS.half()

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

    seeds = ""
    images = []
    with torch.no_grad():

        all_samples = list()
        for n in trange(opt_n_iter, desc="Sampling"):
            for prompts in tqdm(data, desc="data"):

                sample_path = os.path.join(outpath, "_".join(re.split(":| ", prompts[0])))[:150]
                os.makedirs(sample_path, exist_ok=True)
                base_count = len(os.listdir(sample_path))

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

                    samples_ddim = model.sample(
                        S=opt_ddim_steps,
                        conditioning=c,
                        seed=opt_seed,
                        shape=shape,
                        verbose=False,
                        unconditional_guidance_scale=opt_scale,
                        unconditional_conditioning=uc,
                        eta=opt_ddim_eta,
                        x_T=start_code,
                        sampler = opt_sampler,
                    )

                    modelFS.to(opt_device)

                    print(samples_ddim.shape)
                    print("saving images")
                    for i in range(batch_size):

                        x_samples_ddim = modelFS.decode_first_stage(samples_ddim[i].unsqueeze(0))
                        x_sample = torch.clamp((x_samples_ddim + 1.0) / 2.0, min=0.0, max=1.0)
                        x_sample = 255.0 * rearrange(x_sample[0].cpu().numpy(), "c h w -> h w c")
                        image = Image.fromarray(x_sample.astype(np.uint8))
                        images.append(image)
                        seeds += str(opt_seed) + ","
                        opt_seed += 1
                        base_count += 1

                    if opt_device != "cpu":
                        mem = torch.cuda.memory_allocated() / 1e6
                        modelFS.to("cpu")
                        while torch.cuda.memory_allocated() / 1e6 >= mem:
                            time.sleep(1)
                    del samples_ddim
                    print("memory_final = ", torch.cuda.memory_allocated() / 1e6)

    toc = time.time()

    time_taken = (toc - tic) / 60.0

    print(
        (
            "Samples finished in {0:.2f} minutes and exported to "
            + sample_path
            + "\n Seeds used = "
            + seeds[:-1]
        ).format(time_taken)
    )

    return images
