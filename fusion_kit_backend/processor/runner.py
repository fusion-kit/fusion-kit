from functools import partial
from .txt2img import txt2img

def processor_runner(req_queue, res_queue):
    print("started processor")
    while True:
        request = req_queue.get()
        request_id = request['request_id']
        request_type = request['request']
        request_body = request['body']
        if request_type == 'txt2img':
            image_sample_callback = partial(
                txt2img_sample_callback,
                request_id=request_id,
                res_queue=res_queue,
            )
            result = txt2img(request_body['prompt'], image_sample_callback=image_sample_callback)
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

def txt2img_sample_callback(images, n, request_id, res_queue):
    res_queue.put({
        'request_id': request_id,
        'stopped': False,
        'body': {
            'state': 'running',
            'preview_images': images,
        }
    })
