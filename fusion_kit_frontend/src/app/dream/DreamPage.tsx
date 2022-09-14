import React, { useCallback } from "react";
import { useMutation, useSubscription } from "@apollo/client";
import {
  StartDreamDocument, WatchDreamDocument, WatchDreamSubscription,
} from "../../generated/graphql";
import { unreachable } from "../../utils";
import { PromptInput } from "./PromptInput";

export const DreamPage: React.FC = () => {
  const [startDream, startDreamResult] = useMutation(StartDreamDocument);

  const dreamId = startDreamResult.data?.startDream.id;

  const watchDreamResult = useSubscription(WatchDreamDocument, {
    variables: {
      dreamId: dreamId!,
    },
    skip: dreamId == null,
  });

  const onStartDream = useCallback(async (prompt: string) => {
    const response = await startDream({
      variables: {
        prompt,
      },
    });
    console.info("Started dream", { prompt, response });
  }, [startDream]);

  const dreamImages = getDreamImages(watchDreamResult.data);

  return (
    <>
      <main className="h-full flex-grow p-6 overflow-auto absolute lg:static inset-0">
        <div className="w-full max-w-2xl mx-auto">
          <PromptInput onStartDream={onStartDream} />
          {!startDreamResult.called || watchDreamResult.data?.watchDream.__typename === "FinishedDream" ? null : "Loading"}
          <ul className="py-6 gap-2 md:gap-4 grid justify-center grid-cols-repeat-fit-20">
            {dreamImages.map((dreamImage) => (
              <li key={dreamImage.imageUri}>
                <div className="relative group max-w-32 aspect-w-10 aspect-h-7 block w-full overflow-hidden rounded-lg bg-gray-100 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-100">
                  <img src={dreamImage.imageUri} alt="" className="pointer-events-none object-cover group-hover:opacity-75" />
                  <button type="button" className="absolute inset-0 focus:outline-none">
                    <span className="sr-only">Expand image</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <aside className="hidden xl:block h-80 max-h-full w-auto lg:h-auto lg:w-80 border-l-0 lg:border-l p-6">Recent</aside>
    </>
  );
};

function getDreamImages(dream?: WatchDreamSubscription): { imageUri: string }[] {
  if (dream == null) {
    return [];
  }

  return dream.watchDream.images.flatMap((dreamImage) => {
    switch (dreamImage.__typename) {
      case "PendingDreamImage":
        return [];
      case "RunningDreamImage":
        return dreamImage.previewImageUri != null ? [{ imageUri: dreamImage.previewImageUri }] : [];
      case "FinishedDreamImage":
        return [{ imageUri: dreamImage.imageUri }];
      case "StoppedDreamImage":
        return [];
      default:
        return unreachable(dreamImage);
    }
  });
}
