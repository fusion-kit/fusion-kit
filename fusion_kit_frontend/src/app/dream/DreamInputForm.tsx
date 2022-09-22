import React, {
  useCallback, useEffect, useId, useState,
} from "react";
import { AdjustmentsVerticalIcon, PencilSquareIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { PaintBrushIcon } from "@heroicons/react/24/solid";
import Textarea from "react-expanding-textarea";
import { Disclosure } from "@headlessui/react";
import { ChevronRightIcon } from "@heroicons/react/20/solid";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import Dropzone from "react-dropzone";
import { clamp } from "../../utils";
import { DreamOptions, UpdateDreamOptions, useFileObjectUrl } from "./hooks";
import { DreamSampler } from "../../generated/graphql";

const PASTEABLE_MIME_TYPES = ["image/avif", "image/bmp", "image/png", "image/jpeg", "image/webp"];

interface DreamInputFormProps {
  options: DreamOptions,
  updateOptions: UpdateDreamOptions,
  onStartDream: () => void,
}

export const DreamInputForm: React.FC<DreamInputFormProps> = (props) => {
  const { onStartDream, options, updateOptions } = props;

  const baseImageObjectUrl = useFileObjectUrl(options.baseImage);

  const promptInputId = useId();

  const onSubmit = useCallback((close: () => void, e?: React.FormEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    close();
    onStartDream();
  }, [onStartDream]);

  const onPromptKeyDown = useCallback((close: () => void, e: React.KeyboardEvent) => {
    if (!e.shiftKey && e.key === "Enter") {
      e.stopPropagation();
      e.preventDefault();

      onSubmit(close);
    }
  }, [onSubmit]);

  const onPromptDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length !== 1) {
      console.warn("multiple files selected in dropzone");
      return;
    }

    const [acceptedFile] = acceptedFiles;
    updateOptions({ baseImage: acceptedFile });
  }, [updateOptions]);

  const onPromptPaste: React.ClipboardEventHandler = useCallback((e) => {
    for (const pastedFile of Array.from(e.clipboardData.files)) {
      if (PASTEABLE_MIME_TYPES.includes(pastedFile.type)) {
        e.stopPropagation();
        e.preventDefault();

        updateOptions({ baseImage: pastedFile });

        return;
      }
    }
  }, [updateOptions]);

  const onRemoveBaseImage: React.MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();

    updateOptions({ baseImage: null });
  }, [updateOptions]);

  return (
    <Disclosure>
      {({ open, close }) => (
        <form onSubmit={(e) => onSubmit(close, e)} className="flex flex-col border border-gray-300 shadow-sm rounded-lg">
          <Dropzone onDrop={onPromptDrop} multiple={false} noClick noKeyboard>
            {({ getRootProps, getInputProps, isDragAccept }) => (
              <div
                className={clsx(
                  "flex overflow-hidden rounded-t-lg z-10 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500 transition-colors duration-300",
                  isDragAccept ? "bg-green-100" : "",
                )}
                {...getRootProps()}
              >
                <input id="prompt-file-upload" type="file" {...getInputProps()} />
                <label htmlFor={promptInputId} className="sr-only">
                  Prompt
                </label>
                {options.baseImage != null
                  ? (
                    <div className="self-center bg-gray-200 p-1.5 m-4 rounded-md shadow-sm relative h-min">
                      <div className="absolute -top-3 -right-3 rounded-full overflow-hidden shadow-xl divide-x divide-slate-400 text-slate-600">
                        <button
                          type="button"
                          className="h-8 w-8 p-2 bg-slate-200 hover:bg-slate-100"
                          onClick={onRemoveBaseImage}
                        >
                          <XMarkIcon className="h-full w-full" />
                        </button>
                      </div>
                      <img
                        src={baseImageObjectUrl ?? undefined}
                        alt="Uploaded file"
                        className="max-h-full w-16 object-contain"
                      />
                    </div>
                  ) : null}
                <Textarea
                  rows={1}
                  name="prompt"
                  id={promptInputId}
                  onKeyDown={(e) => onPromptKeyDown(close, e)}
                  onPaste={onPromptPaste}
                  className={clsx(
                    "flex-1 block w-full resize-none border-0 py-4 placeholder-gray-500 focus:ring-0 sm:text-sm bg-transparent",
                  )}
                  placeholder="Enter a prompt..."
                  onChange={(e) => { updateOptions({ prompt: e.target.value }); }}
                  value={options.prompt}
                />
              </div>
            )}
          </Dropzone>

          <div className="flex items-center justify-between space-x-3 border-t border-gray-200 px-2 py-2 sm:px-3">
            <div className="flex space-x-1">
              <Disclosure.Button
                className="group -my-2 inline-flex items-center rounded-full px-4 py-2 text-left text-sm bg-slate-200 text-gray-500 hover:bg-slate-100"
              >
                <AdjustmentsVerticalIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                <span>
                  Options
                  <ChevronRightIcon className={clsx("h-4 w-4 inline-block transition-transform", open ? "rotate-90 transform" : "")} aria-hidden="true" />
                </span>
              </Disclosure.Button>
            </div>
            <div className="flex-shrink-0">
              <button
                type="submit"
                className="inline-flex items-center space-x-2 rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <PaintBrushIcon className="h-5 w-5" aria-hidden="true" />
                <span>Dream</span>
              </button>
            </div>
          </div>

          <Disclosure.Panel static>
            <AnimatePresence>
              {open ? (
                <motion.div
                  className="border-t border-gray-300"
                  key="dream-options"
                  initial="collapsed"
                  animate="open"
                  exit="collapsed"
                  variants={{
                    open: { height: "auto" },
                    collapsed: { height: 0, overflow: "hidden" },
                  }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  <OptionsForm options={options} updateOptions={updateOptions} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </Disclosure.Panel>
        </form>
      )}
    </Disclosure>
  );
};

interface OptionsFormProps {
  options: DreamOptions,
  updateOptions: (_newOptions: Partial<DreamOptions>) => void,
}

const OptionsForm: React.FC<OptionsFormProps> = (props) => {
  const { options, updateOptions } = props;

  return (
    <>
      <div className="m-6 grid grid-cols-1 gap-y-6 gap-x-8 sm:grid-cols-6">
        <div className="sm:col-span-4">
          <NumberSliderInput
            label="Images"
            value={options.numImages}
            onChange={(newValue) => updateOptions({ numImages: clamp(newValue, 1, 99) })}
            lowValue={1}
            highValue={10}
          />
        </div>
        <div className="sm:col-span-2">
          <OptionalNumberInput
            label="Seed"
            placeholder="Random seed"
            value={options.seed}
            onChange={(newValue) => updateOptions({
              seed: newValue != null ? clamp(newValue, 0, Number.MAX_SAFE_INTEGER) : null,
            })}
          />
        </div>
        <div className="sm:col-span-6">
          <ImageInput
            label="Base image"
            file={options.baseImage}
            onChange={(newFile) => updateOptions({ baseImage: newFile })}
          />
        </div>
        <div className="sm:col-span-6">
          <NumberSliderInput
            label="Base image decimation"
            value={options.baseImageDecimation}
            disabled={options.baseImage == null}
            onChange={(newDecimation) => updateOptions({ baseImageDecimation: newDecimation })}
            lowValue={0}
            highValue={1}
            step={0.01}
            allowDecimal
          />
        </div>
      </div>
      <div className="m-6 grid grid-cols-1 gap-y-6 gap-x-8 sm:grid-cols-6">
        <div className="sm:col-span-2">
          <DropdownInput
            label="Sampler"
            options={[
              { label: "DDIM", value: DreamSampler.Ddim },
              { label: "PLMS", value: DreamSampler.Plms },
            ]}
            value={options.sampler}
            onChange={(newSampler) => updateOptions({ sampler: newSampler })}
          />
        </div>
        <div className="sm:col-span-4">
          <NumberSliderInput
            label="Steps"
            value={options.samplerSteps}
            onChange={(newSteps) => updateOptions({ samplerSteps: newSteps })}
            lowValue={1}
            highValue={100}
          />
        </div>
        <div className="sm:col-span-3">
          <NumberInput
            label="Sampler eta"
            value={options.samplerEta}
            onChange={(newEta) => updateOptions({ samplerEta: newEta })}
            allowDecimal
          />
        </div>
        <div className="sm:col-span-3">
          <NumberInput
            label="Guidance scale"
            value={options.guidanceScale}
            onChange={(newScale) => updateOptions({ guidanceScale: newScale })}
            allowDecimal
          />
        </div>
      </div>
    </>
  );
};

interface NumberSliderInputProps {
  label: string,
  value: number,
  disabled?: boolean,
  onChange: (_newValue: number) => void,
  lowValue: number,
  highValue: number,
  step?: number,
  allowDecimal?: boolean,
}

const NumberSliderInput: React.FC<NumberSliderInputProps> = (props) => {
  const {
    label, value, onChange,
    lowValue, highValue,
    step = 1, allowDecimal = false, disabled = false,
  } = props;

  const textInputId = useId();

  const [textValue, setTextValue] = useState(value.toString());

  const onTextInputChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    const newStringValue = e.target.value;

    setTextValue(newStringValue);

    const newValue = Number(newStringValue);
    if (newStringValue !== "" && (allowDecimal || Number.isSafeInteger(newValue)) && !disabled) {
      onChange(newValue);
    }
  }, [onChange, allowDecimal, disabled]);
  const onTextInputBlur: React.FocusEventHandler<HTMLInputElement> = useCallback(() => {
    setTextValue(value.toString());
  }, [value]);
  const onTextInputKeyDown: React.KeyboardEventHandler<HTMLInputElement> = useCallback((e) => {
    const currentValue = Number(textValue);
    const isValidValue = textValue !== "" && (allowDecimal || Number.isSafeInteger(currentValue));

    if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();

      if (isValidValue && !disabled) {
        const newValue = currentValue + step;

        onChange(newValue);
      }

      return false;
    } if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();

      if (isValidValue && !disabled) {
        const newValue = currentValue - step;

        onChange(newValue);
      }

      return false;
    }

    return undefined;
  }, [textValue, allowDecimal, onChange, step, disabled]);
  const onRangeChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    const newValue = e.target.valueAsNumber;
    if (!disabled) {
      onChange(newValue);
      setTextValue(newValue.toString());
    }
  }, [onChange, disabled]);

  useEffect(() => {
    setTextValue(value.toString());
  }, [value]);

  return (
    <>
      <label
        htmlFor={textInputId}
        className={clsx(
          "block text-sm font-medium transition-colors",
          disabled ? "text-gray-400" : "text-gray-700",
        )}
      >
        {label}

      </label>
      <div className="flex justify-between items-baseline space-x-2">
        <input
          type="range"
          className="appearance-none flex-1 w-full h-2 bg-gray-200 shadow-sm rounded-full disabled:cursor-not-allowed"
          min={lowValue}
          max={highValue}
          value={value}
          disabled={disabled}
          step={step}
          onChange={onRangeChange}
        />
        <input
          type="text"
          inputMode="numeric"
          pattern={allowDecimal ? "[0-9\\.]*" : "[0-9]*"}
          id={textInputId}
          value={textValue}
          disabled={disabled}
          onChange={onTextInputChange}
          onBlur={onTextInputBlur}
          onKeyDown={onTextInputKeyDown}
          className={clsx(
            "block w-16 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-center disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-500",
          )}
        />
      </div>
    </>
  );
};

interface OptionalNumberInputProps {
  label: string,
  placeholder?: string,
  value: number | null,
  onChange: (_newValue: number | null) => void,
  allowDecimal?: boolean,
}

const OptionalNumberInput: React.FC<OptionalNumberInputProps> = (props) => {
  const {
    label, placeholder, value, onChange, allowDecimal = false,
  } = props;

  const textInputId = useId();

  const [textValue, setTextValue] = useState(value != null ? value.toString() : "");

  const onTextInputChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    const newStringValue = e.target.value;

    setTextValue(newStringValue);

    const newValue = Number(newStringValue);
    if (newStringValue !== "" && (allowDecimal || Number.isSafeInteger(newValue))) {
      onChange(newValue);
    } else {
      onChange(null);
    }
  }, [onChange, allowDecimal]);
  const onTextInputBlur: React.FocusEventHandler<HTMLInputElement> = useCallback(() => {
    setTextValue(value != null ? value.toString() : "");
  }, [value]);

  return (
    <>
      <label htmlFor={textInputId} className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        pattern={allowDecimal ? "[0-9\\.]*" : "[0-9]*"}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        id={textInputId}
        value={textValue}
        placeholder={placeholder}
        onChange={onTextInputChange}
        onBlur={onTextInputBlur}
      />
    </>
  );
};

interface NumberInputProps {
  label: string,
  placeholder?: string,
  value: number | null,
  onChange: (_newValue: number) => void,
  allowDecimal?: boolean,
}

const NumberInput: React.FC<NumberInputProps> = (props) => {
  const {
    label, placeholder, value, onChange, allowDecimal,
  } = props;

  const onInputChange = useCallback((newValue: number | null) => {
    if (newValue != null) {
      onChange(newValue);
    }
  }, [onChange]);

  return (
    <OptionalNumberInput
      label={label}
      placeholder={placeholder}
      value={value}
      onChange={onInputChange}
      allowDecimal={allowDecimal}
    />
  );
};

interface DropdownInputProps<V extends string> {
  label: string,
  options: DropdownOption<V>[],
  value: V,
  onChange: (_newValue: V) => void,
}

interface DropdownOption<V extends string> {
  label: string,
  value: V,
}

const DropdownInput = <V extends string = string>(
  props: DropdownInputProps<V>,
) => {
  const {
    label, options, value, onChange,
  } = props;

  const selectId = useId();

  const onSelectChange: React.ChangeEventHandler<HTMLSelectElement> = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    onChange(e.target.value as V);
  }, [onChange]);

  return (
    <>
      <label htmlFor={selectId} className="block text-sm font-medium text-gray-700">{label}</label>
      <select
        id={selectId}
        value={value}
        onChange={onSelectChange}
        className="block w-full max-w-lg rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:max-w-xs sm:text-sm"
      >
        {options.map((option) => (
          <option key={option.value}>{option.label}</option>
        ))}
      </select>
    </>
  );
};

interface ImageInputProps {
  label: string,
  file: File | null,
  onChange: (_newFile: File | null) => void,
}

const ImageInput: React.FC<ImageInputProps> = (props) => {
  const { label, file, onChange } = props;

  const objectUrl = useFileObjectUrl(file);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length !== 1) {
      console.warn("multiple files selected in dropzone");
      return;
    }

    const [acceptedFile] = acceptedFiles;
    onChange(acceptedFile);
  }, [onChange]);

  const onRemove: React.MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();

    onChange(null);
  }, [onChange]);

  return (
    <div>
      <span className="block text-sm font-medium text-gray-700">
        {label}
      </span>
      <div className="mt-2">
        <Dropzone onDrop={onDrop} multiple={false} noClick={file != null}>
          {({ getRootProps, getInputProps, isDragAccept }) => (
            <div
              className={clsx(
                "h-36 flex max-w-lg rounded-md box-content border-2 border-dashed transition-all duration-300 justify-center",
                file != null ? "" : "items-center",
                file == null || isDragAccept ? "border-gray-300" : "border-transparent",
                isDragAccept ? "bg-green-100" : "",
              )}
              {...getRootProps()}
            >
              <input id="file-upload" type="file" {...getInputProps()} />
              {file != null
                ? (
                  <div className="bg-gray-200 p-2 m-4 rounded-lg shadow-sm relative">
                    <div className="absolute -top-3 -right-6 rounded-full overflow-hidden shadow-xl divide-x divide-slate-400 text-slate-600">
                      <button type="button" className="h-12 w-12 p-3 bg-slate-200 hover:bg-slate-100">
                        <PencilSquareIcon className="h-full w-full" />
                      </button>
                      <button type="button" className="h-12 w-12 p-3 bg-slate-200 hover:bg-slate-100" onClick={onRemove}>
                        <XMarkIcon className="h-full w-full" />
                      </button>
                    </div>
                    <img
                      src={objectUrl ?? undefined}
                      alt="Uploaded file"
                      className="h-full object-contain"
                    />
                  </div>
                )
                : (
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <span
                        className="relative cursor-pointer rounded-md font-medium text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-400 focus-within:ring-offset-2 hover:text-indigo-400 transition-none"
                      >
                        Upload a file
                      </span>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                  </div>
                )}
            </div>
          )}
        </Dropzone>
      </div>
    </div>
  );
};
