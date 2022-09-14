import React, { useCallback } from "react";
import { useMutation } from "@apollo/client";
import {
  StartDreamDocument,
} from "../../generated/graphql";
import { PromptInput } from "./PromptInput";
import { CurrentDream } from "./CurrentDream";

export const DreamPage: React.FC = () => {
  const [startDream, startDreamResult] = useMutation(StartDreamDocument);

  const onStartDream = useCallback(async (prompt: string) => {
    const response = await startDream({
      variables: {
        prompt,
      },
    });
    console.info("Started dream", { prompt, response });
  }, [startDream]);

  return (
    <>
      <main className="h-full flex-grow p-6 overflow-auto absolute lg:static inset-0">
        <div className="w-full max-w-2xl mx-auto">
          <PromptInput onStartDream={onStartDream} />
          <CurrentDream startDreamResult={startDreamResult} numImages={1} />
        </div>
      </main>
      <aside className="hidden xl:block h-80 max-h-full w-auto lg:h-auto lg:w-80 border-l-0 lg:border-l p-6">Recent</aside>
    </>
  );
};
