from itertools import islice
from ldm.generate import Generate
import numpy
import os
import tempfile
from ulid import ULID

def chunk(iterator, size):
    iterator = iter(iterator)
    return iter(lambda: tuple(islice(iterator, size)), ())

CONFIG_FILE = 'invoke_ai/configs/stable-diffusion/v1-inference.yaml'
CKPT_FILE = 'invoke_ai/models/ldm/stable-diffusion-v1/model.ckpt'

class Dreamer():
    def __init__(
        self,
        device_type='cuda',
        full_precision=False,
        config=CONFIG_FILE,
        weights=CKPT_FILE,
    ):
        self.generator = Generate(
            weights=weights,
            config=config,
            device_type=device_type,
            full_precision=full_precision,
        )

    def dream(
        self,
        prompt,
        seed,
        num_images,
        sampler,
        sampler_steps,
        sampler_eta,
        guidance_scale,
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
        if sampler == 'DDIM':
            sampler_name = 'ddim'
        elif sampler == 'PLMS':
            sampler_name = 'plms'
        else:
            raise Exception(f'Unknown sampler: {sampler}')

        actual_sampler_steps = sampler_steps

        if base_image is not None:
            assert base_image_decimation is not None, 'base_image_decimation is required if base_image is set'
            base_image_decimation = numpy.clip(base_image_decimation, 0.0, 1.0)

            # Reduce the sampler steps when using a base image
            actual_sampler_steps = int(base_image_decimation * sampler_steps)

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

        results = []
        for image in images:
            step_callback = make_img_callback(
                image_progress_callback=image_progress_callback,
                generator=self.generator,
                images=images,
                image_index=image['index'],
                steps_per_image_preview=steps_per_image_preview,
            )

            result = self.generator.prompt2image(
                prompt=prompt,
                iterations=1,
                steps=sampler_steps,
                seed=image['seed'],
                cfg_scale=guidance_scale,
                ddim_eta=sampler_eta,
                skip_normalize=False,
                image_callback=None,
                step_callback=step_callback,
                width=None,
                height=None,
                sampler_name=sampler_name,
                seamless=False,
                log_tokenization=False,
                with_variations=None,
                variation_amount=0.0,
                init_img=base_image,
                init_mask=None,
                fit=False,
                strength=base_image_decimation,
                gfpgan_strength=0,
                save_original=False,
                upscale=None,
            )
            results += result

            image['state'] = 'complete'
            image_progress_callback(image_progress=images)

        for index, result in enumerate(results):
            image, seed = result
            images[index]['image'] = image
            images[index]['seed'] = seed
            images[index]['image_key'] = 'image'
            images[index]['state'] = 'complete'
            images[index]['completed_steps'] = actual_sampler_steps

        return {
            'images': images,
            'seed': seed,
        }

def make_img_callback(
    image_progress_callback,
    generator,
    images,
    image_index,
    steps_per_image_preview,
):
    if image_progress_callback is None:
        return None

    previews_enabled = steps_per_image_preview > 0

    def img_callback(image_samples, step_index):
        images[image_index]['state'] = 'running'
        images[image_index]['completed_steps'] = step_index

        should_generate_preview = previews_enabled and step_index % steps_per_image_preview == 0
        if should_generate_preview:
            preview_image = generator.sample_to_image(image_samples)

            images[image_index]['image'] = preview_image
            images[image_index]['image_key'] = f'preview_{ULID()}'

        image_progress_callback(image_progress=images)

    return img_callback
