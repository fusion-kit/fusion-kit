import { Switch } from "@headlessui/react";
import { ArrowDownTrayIcon, TrashIcon } from "@heroicons/react/20/solid";
import { CheckIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import React, { useCallback, useId, useState } from "react";
import { ErrorBox } from "../ErrorBox";
import { DropdownInput, NumberInput } from "../inputs";
import { DownloadPanel } from "./DownloadPanel";
import { useSettings } from "./hooks";

export const SettingsPage: React.FC = () => {
  const {
    currentSettings, setCurrentSettings, loadError,
    createModel, addModel, updateModel, removeModel, setActiveModel,
    canSave, saveSettings, saveError,
  } = useSettings();

  const formId = useId();

  const [showDownloads, setShowDownloads] = useState(false);

  const onSaveSettings: React.FormEventHandler = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();

    if (canSave) {
      saveSettings();
    }
  }, [saveSettings, canSave]);

  return (
    <>
      <form
        className="space-y-6 px-2 py-6 sm:px-6 bg-gray-100 h-full absolute lg:static inset-0 overflow-auto"
        onSubmit={onSaveSettings}
      >
        {loadError != null ? (
          <ErrorBox className="shadow">
            <h3 className="text-sm font-medium text-red-800">Failed to load current settings</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{loadError.message}</p>
            </div>
          </ErrorBox>
        ) : null}
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
              {currentSettings.models.length === 0 ? (
                <p className="py-4 text-gray-500 text-center">Add a model to use Stable Diffusion</p>
              ) : null}
              {currentSettings.models.map((model, index) => {
                return (
                  <div key={model.id} className={clsx("pb-4 grid grid-cols-6 gap-4", index === 0 ? "" : "pt-4")}>
                    <div className="flex flex-wrap justify-between col-span-6">
                      <div className="flex-1">
                        <label htmlFor={`${formId}-name-${model.id}`} className="block text-sm font-medium text-gray-700">
                          Model name
                        </label>
                        <input
                          type="text"
                          id={`${formId}-name-${model.id}`}
                          value={model.name}
                          onChange={(e) => {
                            updateModel(model.id, (m) => ({ ...m, name: e.target.value }));
                          }}
                          className="mt-1 flex rounded-md shadow-sm border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                      <div className="self-end space-x-2 mt-2 flex items-center">
                        <button
                          type="button"
                          className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-200"
                          onClick={() => setActiveModel(model.id)}
                          disabled={model.isActive}
                        >
                          {model.isActive ? (
                            <>
                              <CheckIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
                              Acitve model
                            </>
                          ) : (
                            <>Set active model</>
                          )}
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                          onClick={() => removeModel(model.id)}
                        >
                          <TrashIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
                          Remove model
                        </button>
                      </div>
                    </div>

                    <div className="col-span-6">
                      <label htmlFor={`${formId}-filename-${model.id}`} className="block text-sm font-medium text-gray-700">
                        Weights filename
                      </label>
                      <input
                        type="text"
                        id={`${formId}-filename-${model.id}`}
                        value={model.weightsFilename}
                        onChange={(e) => {
                          updateModel(model.id, (m) => ({ ...m, weightsFilename: e.target.value }));
                        }}
                        className="mt-1 flex w-full rounded-md shadow-sm border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      {currentSettings.modelsFilePath !== "" ? (
                        <p className="mt-2 text-sm text-gray-500">
                          The model file should be placed in the directory
                          {" "}
                          {currentSettings.modelsFilePath}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-gray-500">The model file should be placed in the &quot;models&quot; directory.</p>
                      )}

                    </div>

                    <div className="col-span-2">
                      <NumberInput
                        label="Width"
                        value={model.width}
                        onChange={(width) => updateModel(model.id, (m) => ({ ...m, width }))}
                      />
                    </div>

                    <div className="col-span-2">
                      <NumberInput
                        label="Height"
                        value={model.height}
                        onChange={(height) => updateModel(model.id, (m) => ({ ...m, height }))}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center flex-wrap">
                <button
                  type="button"
                  className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 mt-4 mr-2"
                  onClick={() => setShowDownloads(true)}
                >
                  <ArrowDownTrayIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
                  Download a model
                </button>
                <button
                  type="button"
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 mt-4"
                  onClick={createModel}
                >
                  Configure custom model
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
                  <DropdownInput
                    label="PyTorch Device"
                    value={currentSettings.device}
                    options={currentSettings.availableDevices.map((device) => (
                      {
                        label: device,
                        value: device,
                      }
                    ))}
                    onChange={(device) => setCurrentSettings((s) => ({ ...s, device }))}
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
                      checked={currentSettings.useFullPrecision}
                      onChange={(useFullPrecision) => {
                        setCurrentSettings((s) => ({ ...s, useFullPrecision }));
                      }}
                      className={clsx(
                        currentSettings.useFullPrecision ? "bg-indigo-600" : "bg-gray-200",
                        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={clsx(
                          currentSettings.useFullPrecision ? "translate-x-5" : "translate-x-0",
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
                      checked={currentSettings.showPreviews}
                      onChange={(showPreviews) => {
                        setCurrentSettings((s) => ({ ...s, showPreviews }));
                      }}
                      className={clsx(
                        currentSettings.showPreviews ? "bg-indigo-600" : "bg-gray-200",
                        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={clsx(
                          currentSettings.showPreviews ? "translate-x-5" : "translate-x-0",
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        )}
                      />
                    </Switch>
                  </Switch.Group>
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <NumberInput
                    label="Steps per preview"
                    value={currentSettings.stepsPerPreview}
                    onChange={(stepsPerPreview) => {
                      setCurrentSettings((s) => ({ ...s, stepsPerPreview }));
                    }}
                    disabled={!currentSettings.showPreviews}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {saveError != null ? (
          <ErrorBox className="shadow">
            <h3 className="text-sm font-medium text-red-800">Failed to save</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{saveError.message}</p>
            </div>
          </ErrorBox>
        ) : null}

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
      <DownloadPanel
        open={showDownloads}
        onAddModel={addModel}
        onClose={() => setShowDownloads(false)}
      />
    </>
  );
};
