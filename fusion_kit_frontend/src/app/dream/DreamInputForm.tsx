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
import { DreamOptions, UpdateDreamOptions } from "./hooks";

interface DreamInputFormProps {
  options: DreamOptions,
  updateOptions: UpdateDreamOptions,
  onStartDream: () => void,
}

export const DreamInputForm: React.FC<DreamInputFormProps> = (props) => {
  const { onStartDream, options, updateOptions } = props;

  const promptInputId = useId();

  const onSubmit = useCallback((e?: React.FormEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    onStartDream();
  }, [onStartDream]);

  const onPromptKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = useCallback((e) => {
    if (!e.shiftKey && e.key === "Enter") {
      e.stopPropagation();
      e.preventDefault();

      onSubmit();
    }
  }, [onSubmit]);

  return (
    <Disclosure>
      {({ open }) => (
        <form onSubmit={onSubmit} className="flex flex-col border border-gray-300 shadow-sm rounded-lg">
          <div className="overflow-hidden rounded-t-lg z-10 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500">
            <label htmlFor={promptInputId} className="sr-only">
              Prompt
            </label>
            <Textarea
              rows={1}
              name="prompt"
              id={promptInputId}
              onKeyDown={onPromptKeyDown}
              className="block w-full resize-none border-0 py-4 placeholder-gray-500 focus:ring-0 sm:text-sm"
              placeholder="Enter a prompt..."
              onChange={(e) => { updateOptions({ prompt: e.target.value }); }}
              value={options.prompt}
            />
          </div>

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
    <div className="flex justify-center items-start space flex-wrap">
      <div className="m-3 w-36 max-w-full">
        <NumberSliderInput
          label="Images"
          value={options.numImages}
          onChange={(newValue) => updateOptions({ numImages: clamp(newValue, 1, 99) })}
          lowValue={1}
          highValue={10}
        />
      </div>
      <div className="m-3 w-48 max-w-full">
        <OptionalNumberInput
          label="Seed"
          placeholder="Random seed"
          value={options.seed}
          onChange={(newValue) => updateOptions({
            seed: newValue != null ? clamp(newValue, 0, Number.MAX_SAFE_INTEGER) : null,
          })}
        />
      </div>
      <div className="m-3 w-full">
        <ImageInput
          file={options.baseImage}
          onChange={(newFile) => updateOptions({ baseImage: newFile })}
        />
      </div>
    </div>
  );
};

interface NumberSliderInputProps {
  label: string,
  value: number,
  onChange: (_newValue: number) => void,
  lowValue: number,
  highValue: number,
}

const NumberSliderInput: React.FC<NumberSliderInputProps> = (props) => {
  const {
    label, value, onChange, lowValue, highValue,
  } = props;

  const textInputId = useId();

  const [textValue, setTextValue] = useState(value.toString());

  const onTextInputChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    const newStringValue = e.target.value;

    setTextValue(newStringValue);

    const newValue = Number(newStringValue);
    if (newStringValue !== "" && Number.isSafeInteger(newValue)) {
      onChange(newValue);
    }
  }, [onChange]);
  const onTextInputBlur: React.FocusEventHandler<HTMLInputElement> = useCallback(() => {
    setTextValue(value.toString());
  }, [value]);
  const onTextInputKeyDown: React.KeyboardEventHandler<HTMLInputElement> = useCallback((e) => {
    const currentValue = Number(textValue);
    const isValidValue = textValue !== "" && Number.isSafeInteger(currentValue);

    if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();

      if (isValidValue) {
        const newValue = currentValue + 1;

        onChange(newValue);
      }

      return false;
    } if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();

      if (isValidValue) {
        const newValue = currentValue - 1;

        onChange(newValue);
      }

      return false;
    }

    return undefined;
  }, [textValue, onChange]);
  const onRangeChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    const newValue = e.target.valueAsNumber;
    onChange(newValue);
    setTextValue(newValue.toString());
  }, [onChange]);

  useEffect(() => {
    setTextValue(value.toString());
  }, [value]);

  return (
    <>
      <div className="flex justify-between items-baseline space-x-6">
        <label htmlFor={textInputId} className="font-bold">{label}</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className="flex-1 w-full py-1 mx-2 border border-gray-300 rounded-full text-center"
          id={textInputId}
          value={textValue}
          onChange={onTextInputChange}
          onBlur={onTextInputBlur}
          onKeyDown={onTextInputKeyDown}
        />
      </div>
      <input
        type="range"
        className="appearance-none w-full h-2 bg-gray-200 shadow-sm rounded-full"
        min={lowValue}
        max={highValue}
        value={value}
        onChange={onRangeChange}
      />
    </>
  );
};

interface OptionalNumberInputProps {
  label: string,
  placeholder: string,
  value: number | null,
  onChange: (_newValue: number | null) => void,
}

const OptionalNumberInput: React.FC<OptionalNumberInputProps> = (props) => {
  const {
    label, placeholder, value, onChange,
  } = props;

  const textInputId = useId();

  const [textValue, setTextValue] = useState(value != null ? value.toString() : "");

  const onTextInputChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    const newStringValue = e.target.value;

    setTextValue(newStringValue);

    const newValue = Number(newStringValue);
    if (newStringValue !== "" && Number.isSafeInteger(newValue)) {
      onChange(newValue);
    } else {
      onChange(null);
    }
  }, [onChange]);
  const onTextInputBlur: React.FocusEventHandler<HTMLInputElement> = useCallback(() => {
    setTextValue(value != null ? value.toString() : "");
  }, [value]);

  return (
    <div className="">
      <label htmlFor={textInputId} className="font-bold">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className="flex-1 w-full px-2 py-1 border border-gray-300 rounded-full"
        id={textInputId}
        value={textValue}
        placeholder={placeholder}
        onChange={onTextInputChange}
        onBlur={onTextInputBlur}
      />
    </div>
  );
};

interface ImageInputProps {
  file: File | null,
  onChange: (_newFile: File | null) => void,
}

const ImageInput: React.FC<ImageInputProps> = (props) => {
  const { file, onChange } = props;
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    const newObjectUrl = file != null ? URL.createObjectURL(file) : null;
    setObjectUrl(newObjectUrl);

    return () => {
      if (newObjectUrl != null) {
        URL.revokeObjectURL(newObjectUrl);
      }
    };
  }, [file]);

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
      <span className="font-bold">
        Base image
      </span>
      <div className="mt-2">
        <Dropzone onDrop={onDrop} multiple={false} noClick={file != null}>
          {({ getRootProps, getInputProps, isDragAccept }) => (
            <div
              className={clsx(
                "h-32 flex max-w-lg rounded-md px-6 pt-5 pb-6 box-content border-2 border-dashed transition-colors duration-300 justify-center",
                file != null ? "" : "items-center",
                file == null || isDragAccept ? "border-gray-300" : "border-transparent",
              )}
              {...getRootProps()}
            >
              <input id="file-upload" type="file" {...getInputProps()} />
              {file != null
                ? (
                  <div className="bg-gray-200 p-2 rounded-lg shadow-sm relative">
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
                      className="h-full"
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
                        className="relative cursor-pointer rounded-md bg-white font-medium text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-400 focus-within:ring-offset-2 hover:text-indigo-400 transition-none"
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
