import React, { useCallback } from "react";
import { PromptInput } from "./PromptInput";
import { CurrentDream } from "./CurrentDream";
import { useCreateDream, useDreamOptions } from "./hooks";

export const DreamPage: React.FC = () => {
  const { options, updateOptions } = useDreamOptions({
    prompt: "",
  });
  const { createDream, dreamState } = useCreateDream();

  const onStartDream = useCallback(async () => {
    const response = await createDream(options);
    console.info("Started dream", { prompt, response });
  }, [createDream, options]);

  return (
    <>
      <main className="h-full flex-grow p-6 overflow-auto absolute lg:static inset-0">
        <div className="w-full max-w-2xl mx-auto">
          <PromptInput
            options={options}
            updateOptions={updateOptions}
            onStartDream={onStartDream}
          />
          {dreamState != null ? (<CurrentDream dreamState={dreamState} numImages={1} />) : null}
        </div>
      </main>
      <aside className="hidden xl:block h-80 max-h-full w-auto lg:h-auto lg:w-80 border-l-0 lg:border-l p-6">Recent</aside>
    </>
  );
};
