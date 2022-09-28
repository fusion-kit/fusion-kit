import os
import re
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

# Don't allow path separators in filenames (avoids path traversal issues)
FILENAME_REGEX = r'\A[^/\\]*\Z'

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

        active_models = [model for model in self.models if model['is_active']]
        if len(active_models) == 0:
            errors.append('no active model')
        elif len(active_models) > 1:
            errors.append('more than one active model')

        for model in self.models:
            errors += self._validate_model(model, data_dir)

        if self.device not in get_available_devices():
            errors.append(f'unsupported device: {self.device}')

        if self.show_previews:
            if self.steps_per_preview is None:
                errors.append('previews enabled but steps per preview not set')
        else:
            if self.steps_per_preview is not None:
                errors.append('previews disabled but steps per preview is set')

        return errors

    def _validate_model(self, model, data_dir):
        models_dir = os.path.join(data_dir, 'models')
        configs_dir = os.path.join(data_dir, 'configs')

        errors = []

        if re.match(FILENAME_REGEX, model['weight_filename']) is None:
            errors.append(f"invalid model weight filename '{model['weight_filename']}'")
        elif not os.path.isfile(os.path.join(models_dir, model['weight_filename'])):
            errors.append(f"model weight file '{model['weight_filename']}' does not exist")

        if re.match(FILENAME_REGEX, model['config_filename']) is None:
            errors.append(f"invalid model config filename '{model['config_filename']}'")
        elif not os.path.isfile(os.path.join(configs_dir, model['config_filename'])):
            errors.append(f"model config '{model['config_filename']}' does not exist")

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

    def active_model(self, *_):
        active_models = [model for model in self.models if model['is_active']]
        if len(active_models) == 1:
            return active_models[0]
        else:
            return None

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
