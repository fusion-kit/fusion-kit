from .dreamer import Dreamer

def processor_runner(req_queue, res_queue):
    print("started processor")
    dreamer = Dreamer()
    while True:
        request = req_queue.get()
        request_id = request['request_id']
        request_type = request['request']
        request_body = request['body']
        if request_type == 'txt2img':
            def image_progress_callback(image_progress):
                res_queue.put({
                    'request_id': request_id,
                    'stopped': False,
                    'body': {
                        'state': 'running',
                        'image_progress': image_progress,
                    }
                })

            result = dreamer.txt2img(
                prompt=request_body['prompt'],
                num_images=request_body['num_images'],
                num_steps_per_image=request_body['num_steps_per_image'],
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
