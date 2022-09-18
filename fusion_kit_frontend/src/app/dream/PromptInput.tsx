import React, {
  useCallback, useEffect, useId, useState,
} from "react";
import { AdjustmentsVerticalIcon } from "@heroicons/react/24/outline";
import { PaintBrushIcon } from "@heroicons/react/24/solid";
import Textarea from "react-expanding-textarea";
import { clamp } from "../../utils";
import { DreamOptions, UpdateDreamOptions } from "./hooks";

interface PromptInputProps {
  options: DreamOptions,
  updateOptions: UpdateDreamOptions,
  onStartDream: () => void,
}

export const PromptInput: React.FC<PromptInputProps> = (props) => {
  const { onStartDream, options, updateOptions } = props;

  const promptInputId = useId();
  const [showOptions, setShowOptions] = useState(false);

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

  const onToggleOptions: React.MouseEventHandler<HTMLButtonElement> = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();

    setShowOptions((showOptions) => !showOptions);
  }, []);

  return (
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

      <div className="">
        <div className="flex items-center justify-between space-x-3 border-t border-gray-200 px-2 py-2 sm:px-3">
          <div className="flex space-x-1">
            <button
              type="button"
              className="group -my-2 inline-flex items-center rounded-full px-4 py-2 text-left text-sm bg-slate-200 text-gray-500 hover:bg-slate-100"
              onClick={onToggleOptions}
            >
              <AdjustmentsVerticalIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
              <span>Options</span>
            </button>
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
      </div>

      {showOptions ? (
        <div className="border-t border-gray-300 p-3">
          <OptionsForm options={options} updateOptions={updateOptions} />
        </div>
      ) : null}
    </form>
  );
};

interface OptionsFormProps {
  options: DreamOptions,
  updateOptions: (_newOptions: Partial<DreamOptions>) => void,
}

const OptionsForm: React.FC<OptionsFormProps> = (props) => {
  const { options, updateOptions } = props;

  return (
    <div className="flex justify-center">
      <div className="w-64 max-w-full">
        <NumberSliderInput
          label="Number of images"
          value={options.numImages}
          onChange={(newValue) => updateOptions({ numImages: clamp(newValue, 1, 99) })}
          lowValue={1}
          highValue={10}
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
      <div className="flex justify-between">
        <label htmlFor={textInputId}>{label}</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className="w-16 px-2 py-1 mx-2 border border-gray-300 rounded-full"
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
