import sys

def processor_runner(req_queue, res_queue):
    sys.path.append('./invoke_ai')
    from .dreamer import Dreamer

    print("started processor")

    dreamer = Dreamer()
    while True:
        request = req_queue.get()
        request_id = request['request_id']
        request_type = request['request']
        request_body = request['body']
        if request_type == 'dream':
            def image_progress_callback(image_progress):
                res_queue.put({
                    'request_id': request_id,
                    'stopped': False,
                    'body': {
                        'state': 'running',
                        'image_progress': image_progress,
                    }
                })

            options = request_body['options']
            result = dreamer.dream(
                prompt=options['prompt'],
                num_images=options['num_images'],
                seed=options['seed'],
                base_image=options.get('base_image'),
                base_image_decimation=options.get('base_image_decimation'),
                sampler=options['sampler'],
                sampler_steps=options['sampler_steps'],
                sampler_eta=options['sampler_eta'],
                guidance_scale=options['guidance_scale'],
                downsampling_factor=options['downsampling_factor'],
                latent_channels=options['latent_channels'],
                num_images_per_batch=request_body['num_images_per_batch'],
                steps_per_image_preview=request_body['steps_per_image_preview'],
                image_progress_callback=image_progress_callback,
            )
            res_queue.put({
                'request_id': request_id,
                'stopped': True,
                'body': {
                    'state': 'complete',
                    'images': result['images'],
                    'seed': result['seed'],
                }
            })
        else:
            print(f"Unkown request type: {request_type}")
            res_queue.put({
                'request_id': request_id,
                'stopped': True,
                'body': {
                    'error': Exception(f"Runner received unknown request type: {request_type}"),
                }
            })

def txt2img_preview_callback(images, n, request_id, res_queue):
    res_queue.put({
        'request_id': request_id,
        'stopped': False,
        'body': {
            'state': 'running',
            'preview_images': images,
        }
    })
