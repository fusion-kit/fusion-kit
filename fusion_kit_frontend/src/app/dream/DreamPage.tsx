import React, { useCallback } from "react";
import { PromptInput } from "./PromptInput";
import { CurrentDream } from "./CurrentDream";
import { useCreateDream } from "./hooks";

export const DreamPage: React.FC = () => {
  const { createDream, dreamState } = useCreateDream();

  const onStartDream = useCallback(async (prompt: string) => {
    const response = await createDream({ prompt, numImages: 1 });
    console.info("Started dream", { prompt, response });
  }, [createDream]);

  return (
    <>
      <main className="h-full flex-grow p-6 overflow-auto absolute lg:static inset-0">
        <div className="w-full max-w-2xl mx-auto">
          <PromptInput onStartDream={onStartDream} />
          {dreamState != null ? (<CurrentDream dreamState={dreamState} numImages={1} />) : null}
        </div>
      </main>
      <aside className="hidden xl:block h-80 max-h-full w-auto lg:h-auto lg:w-80 border-l-0 lg:border-l p-6">Recent</aside>
    </>
  );
};
