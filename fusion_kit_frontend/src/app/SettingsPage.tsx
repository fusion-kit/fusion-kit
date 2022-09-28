import { Switch } from "@headlessui/react";
import { PlusIcon, TrashIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import React, {
  useCallback, useId, useMemo, useState,
} from "react";
import { ulid } from "ulid";
import { removeAt, replaceAt } from "../utils";
import { NumberInput } from "./inputs";

const CONFIG_FILE = "v1-inference.yaml";

interface SdModel {
  id: string,
  name: string,
  filename: string,
  configFile: string,
  width: number,
  height: number,
}

export const SettingsPage: React.FC = () => {
  const [currentModels, setCurrentModels] = useState<SdModel[]>([
    {
      id: ulid(),
      name: "Stable Diffusion v1.2",
      filename: "sd-v1-2.ckpt",
      configFile: CONFIG_FILE,
      width: 512,
      height: 512,
    },
    {
      id: ulid(),
      name: "Stable Diffusion v1.4",
      filename: "sd-v1-4.ckpt",
      configFile: CONFIG_FILE,
      width: 512,
      height: 512,
    },
    {
      id: ulid(),
      name: "Stable Diffusion v1.5",
      filename: "sd-v1-5.ckpt",
      configFile: CONFIG_FILE,
      width: 512,
      height: 512,
    },
  ]);
  const [device, setDevice] = useState("cuda");
  const [useFullPrecision, setUseFullPrecision] = useState(false);
  const [showPreviews, setShowPreviews] = useState(true);
  const [stepsPerPreview, setStepsPerPreview] = useState(10);

  const canSave = useMemo(() => {
    return device !== "" && currentModels.length > 0 && currentModels.every((model) => (
      model.name !== "" && model.filename !== ""
    ));
  }, [device, currentModels]);

  const formId = useId();

  const onSetName = useCallback((index: number, name: string) => {
    setCurrentModels((models) => replaceAt(models, index, { ...models[index], name }));
  }, []);
  const onSetFilename = useCallback((index: number, filename: string) => {
    setCurrentModels((models) => replaceAt(models, index, { ...models[index], filename }));
  }, []);
  const onSetWidth = useCallback((index: number, width: number) => {
    setCurrentModels((models) => replaceAt(models, index, { ...models[index], width }));
  }, []);
  const onSetHeight = useCallback((index: number, height: number) => {
    setCurrentModels((models) => replaceAt(models, index, { ...models[index], height }));
  }, []);
  const onAddModel = useCallback(() => {
    setCurrentModels((models) => [...models, newModel()]);
  }, []);
  const onRemoveModel = useCallback((index: number) => {
    setCurrentModels((models) => removeAt(models, index));
  }, []);

  return (
    <form className="space-y-6 px-2 py-6 sm:px-6 bg-gray-100 h-full absolute lg:static inset-0 overflow-auto lg:overflow-visible" action="#" method="POST">
      <div className="bg-white px-4 py-5 shadow rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Models</h3>
            <p className="mt-1 text-sm text-gray-500">
              {/* eslint-disable-next-line max-len */}
              Stable Diffusion model weights used for dreaming. Newer versions have been refined and can produce better results. Custom model weights may be better suited for specific tasks.
            </p>
          </div>
          <div className="mt-5 md:col-span-2 md:mt-0 divide-y divide-gray-300">
            {currentModels.length === 0 ? (
              <p className="py-4 text-gray-500 text-center">Add a model to use Stable Diffusion</p>
            ) : null}
            {currentModels.map((model, index) => {
              return (
                <div key={model.id} className={clsx("pb-4 grid grid-cols-6 gap-4", index === 0 ? "" : "pt-4")}>
                  <div className="flex justify-between col-span-6">
                    <div>
                      <label htmlFor={`${formId}-name-${model.id}`} className="block text-sm font-medium text-gray-700">
                        Model name
                      </label>
                      <input
                        type="text"
                        id={`${formId}-name-${model.id}`}
                        value={model.name}
                        onChange={(e) => onSetName(index, e.target.value)}
                        className="mt-1 flex rounded-md shadow-sm border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div className="self-end">
                      <button
                        type="button"
                        className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        onClick={() => onRemoveModel(index)}
                      >
                        <TrashIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
                        Remove model
                      </button>
                    </div>
                  </div>

                  <div className="col-span-6">
                    <label htmlFor={`${formId}-filename-${model.id}`} className="block text-sm font-medium text-gray-700">
                      Filename
                    </label>
                    <input
                      type="text"
                      id={`${formId}-filename-${model.id}`}
                      value={model.filename}
                      onChange={(e) => onSetFilename(index, e.target.value)}
                      className="mt-1 flex w-full rounded-md shadow-sm border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    <p className="mt-2 text-sm text-gray-500">The model file should be placed in the &quot;models&quot; directory.</p>
                  </div>

                  <div className="col-span-2">
                    <NumberInput
                      label="Width"
                      value={model.width}
                      onChange={(width) => onSetWidth(index, width)}
                    />
                  </div>

                  <div className="col-span-2">
                    <NumberInput
                      label="Height"
                      value={model.height}
                      onChange={(height) => onSetHeight(index, height)}
                    />
                  </div>
                </div>
              );
            })}
            <div>

              <button
                type="button"
                className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 mt-4"
                onClick={onAddModel}
              >
                <PlusIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
                Add a new model
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white px-4 py-5 shadow rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">System settings</h3>
            <p className="mt-1 text-sm text-gray-500">Tweak options to adjust resource usage and performance.</p>
          </div>
          <div className="mt-5 md:col-span-2 md:mt-0">
            <div className="grid grid-cols-6 gap-x-12 gap-y-6 items-center">
              <div className="col-span-6">
                <label htmlFor={`${formId}-device`} className="block text-sm font-medium text-gray-700">
                  PyTorch Device
                </label>
                <input
                  type="text"
                  id={`${formId}-device`}
                  placeholder="cuda"
                  value={device}
                  onChange={(e) => setDevice(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div className="col-span-6">
                <Switch.Group as="div" className="flex items-center justify-between">
                  <span className="flex flex-grow flex-col">
                    <Switch.Label as="span" className="text-sm font-medium text-gray-900 cursor-default">
                      Always use full precision
                    </Switch.Label>
                    <Switch.Description as="span" className="text-sm text-gray-500">
                      Can improve accuracy at the cost of VRAM usage.
                    </Switch.Description>
                  </span>
                  <Switch
                    checked={useFullPrecision}
                    onChange={setUseFullPrecision}
                    className={clsx(
                      useFullPrecision ? "bg-indigo-600" : "bg-gray-200",
                      "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={clsx(
                        useFullPrecision ? "translate-x-5" : "translate-x-0",
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      )}
                    />
                  </Switch>
                </Switch.Group>
              </div>
              <div className="col-span-6 sm:col-span-2">
                <Switch.Group as="div" className="flex items-center justify-between">
                  <span className="flex flex-grow flex-col">
                    <Switch.Label as="span" className="text-sm font-medium text-gray-900 cursor-default">
                      Show previews
                    </Switch.Label>
                  </span>
                  <Switch
                    checked={showPreviews}
                    onChange={setShowPreviews}
                    className={clsx(
                      showPreviews ? "bg-indigo-600" : "bg-gray-200",
                      "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={clsx(
                        showPreviews ? "translate-x-5" : "translate-x-0",
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      )}
                    />
                  </Switch>
                </Switch.Group>
              </div>
              <div className="col-span-6 sm:col-span-2">
                <NumberInput
                  label="Steps per preview"
                  value={stepsPerPreview}
                  onChange={setStepsPerPreview}
                  disabled={!showPreviews}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-200 disabled:cursor-not-allowed"
          disabled={!canSave}
        >
          Save
        </button>
      </div>
    </form>
  );
};

function newModel(): SdModel {
  return {
    id: ulid(),
    name: "",
    filename: "",
    configFile: CONFIG_FILE,
    width: 512,
    height: 512,
  };
}
