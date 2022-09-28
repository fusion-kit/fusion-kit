import os
from ariadne import ObjectType
import torch.cuda

def get_available_devices():
    available_devices = {'cpu': 0}

    if torch.cuda.is_available():
        available_devices['cuda'] = 20

        for index in range(torch.cuda.device_count()):
            available_devices[f'cuda:{index}'] = 10

    return available_devices

def get_default_device():
    devices = get_available_devices()

    sorted_devices = sorted(devices.items(), key=lambda pair: pair[1])
    return sorted_devices[-1][0]

gql_settings = ObjectType('Settings')

class Settings():
    def __init__(
        self,
        models,
        device,
        use_full_precision,
        show_previews,
        steps_per_preview,
    ):
        self.models = models
        self.device = device
        self.use_full_precision = use_full_precision
        self.show_previews = show_previews
        self.steps_per_preview = steps_per_preview

    def validate(self, data_dir):
        errors = []

        if len(self.models) <= 0:
            errors.append('No models configured')

        for model in self.models:
            errors += self._validate_model(model, data_dir)

        if self.device not in get_available_devices():
            errors.append(f'unsupported device: {self.device}')

        return errors

    def _validate_model(self, model, data_dir):
        models_dir = os.path.join(data_dir, 'models')
        configs_dir = os.path.join(data_dir, 'configs')

        errors = []

        if not os.path.isfile(os.path.join(models_dir, model['filename'])):
            errors.append(f"model file '{model['filename']}' does not exist")

        if not os.path.isfile(os.path.join(configs_dir, model['config_file'])):
            errors.append(f"model config '{model['config_file']}' does not exist")

        return errors

    def synthesize_invoke_ai_config(self, path):
        print("TODO: Synthesize InvokeAI config")

    def to_json(self):
        return {
            'models': self.models,
            'device': self.device,
            'use_full_precision': self.use_full_precision,
            'show_previews': self.show_previews,
            'steps_per_preview': self.steps_per_preview,
        }

    @staticmethod
    def get_default_settings():
        return Settings(
            models=[],
            device=get_default_device(),
            use_full_precision=False,
            show_previews=True,
            steps_per_preview=10,
        )

    @staticmethod
    def from_json(json):
        return Settings(
            models=json['models'],
            device=json['device'],
            use_full_precision=json['use_full_precision'],
            show_previews=json['show_previews'],
            steps_per_preview=json['steps_per_preview'],
        )

    ### GraphQL resolvers ###

    def is_ready(self, info):
        manager = info.context['manager']

        return len(self.validate(manager.data_dir)) == 0

    def available_devices(self, *_):
        devices = get_available_devices()

        sorted_devices = sorted(devices.items(), key=lambda pair: pair[1])
        return [pair[0] for pair in reversed(sorted_devices)]

    def models_file_path(self, info):
        manager = info.context['manager']

        return manager.models_dir
