import React, {
  useCallback, useId, useRef, useState,
} from "react";
import { PhotoIcon } from "@heroicons/react/24/outline";
import { PaintBrushIcon } from "@heroicons/react/24/solid";
import Textarea from "react-expanding-textarea";

interface PromptInputProps {
  onGenerate: (_prompt: string) => void,
}

export const PromptInput: React.FC<PromptInputProps> = (props) => {
  const { onGenerate } = props;

  const promptInputId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [prompt, setPrompt] = useState("");

  const onSubmit = useCallback((e?: React.FormEvent) => {
    e?.stopPropagation();
    e?.preventDefault();

    onGenerate(prompt);
  }, [prompt, onGenerate]);

  const onPromptKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = useCallback((e) => {
    if (!e.shiftKey && e.key === "Enter") {
      e.stopPropagation();
      e.preventDefault();

      onSubmit();
    }
  }, [onSubmit]);

  return (
    <form onSubmit={onSubmit} ref={formRef} className="relative">
      <div className="overflow-hidden rounded-lg border border-gray-300 shadow-sm focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
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
          onChange={(e) => { setPrompt(e.target.value); }}
          value={prompt}
        />

        {/* Spacer element to match the height of the toolbar */}
        <div aria-hidden="true">
          <div className="h-px" />
          <div className="py-2">
            <div className="py-px">
              <div className="h-9" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-px bottom-0">
        <div className="flex items-center justify-between space-x-3 border-t border-gray-200 px-2 py-2 sm:px-3">
          <div className="flex">
            <button
              type="button"
              className="group -my-2 -ml-2 inline-flex items-center rounded-full px-3 py-2 text-left text-gray-400"
            >
              <PhotoIcon className="-ml-1 mr-2 h-5 w-5 group-hover:text-gray-500" aria-hidden="true" />
              <span className="text-sm italic text-gray-400 group-hover:text-gray-700">Add base image</span>
            </button>
          </div>
          <div className="flex-shrink-0">
            <button
              type="submit"
              className="inline-flex items-center space-x-2 rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <PaintBrushIcon className="h-5 w-5" aria-hidden="true" />
              <span>Generate</span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};
