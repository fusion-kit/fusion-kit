import {
  MutationResult, SubscriptionResult, useMutation, useSubscription,
} from "@apollo/client";
import { useCallback, useState } from "react";
import {
  StartDreamDocument, StartDreamMutation, StoppedDreamReason,
  WatchDreamDocument, WatchDreamSubscription,
} from "../../generated/graphql";
import { unreachable } from "../../utils";

export interface DreamOptions {
  prompt: string,
  numImages: number,
}

interface UseCreateDream {
  createDream: (_opts: DreamOptions) => Promise<void>,
  dreamState?: DreamState,
}

export type DreamState =
  | {
    type: "pending",
    dream?: Dream & {__typename: "PendingDream"},
  }
  | {
    type: "running",
    dream: Dream & {__typename: "RunningDream"},
  }
  | {
    type: "finished",
    dream: Dream & {__typename: "FinishedDream"},
  }
  | {
    type: "error",
    message: string,
    dream?: Dream & {__typename: "StoppedDream"},
  };

export type Dream = WatchDreamSubscription["watchDream"];

export function useCreateDream(): UseCreateDream {
  const [startDream, startDreamResult] = useMutation(StartDreamDocument);
  const createDream = useCallback(async (opts: DreamOptions) => {
    await startDream({
      variables: {
        options: {
          prompt: opts.prompt,
          numImages: opts.numImages,
        },
      },
    });
  }, [startDream]);

  const currentDreamId = startDreamResult.data?.startDream.id;
  const watchDreamResult = useSubscription(WatchDreamDocument, {
    variables: {
      dreamId: currentDreamId!,
    },
    skip: currentDreamId == null,
  });

  const dreamState = getDreamState({
    startDreamResult,
    watchDreamResult,
  });

  return {
    createDream,
    dreamState,
  };
}

interface CreateDreamContext {
  startDreamResult: MutationResult<StartDreamMutation>,
  watchDreamResult: SubscriptionResult<WatchDreamSubscription>,
}

function getDreamState(context: CreateDreamContext): DreamState | undefined {
  const { startDreamResult, watchDreamResult } = context;

  if (!startDreamResult.called) {
    return undefined;
  }

  const error = startDreamResult.error ?? watchDreamResult.error;
  if (error != null) {
    return {
      type: "error",
      message: `Dream failed with error: ${error.message}`,
    };
  }

  if (startDreamResult.loading || watchDreamResult.loading) {
    return {
      type: "pending",
    };
  }

  if (watchDreamResult.data == null) {
    return {
      type: "pending",
    };
  }

  const dream = watchDreamResult.data.watchDream;
  switch (dream.__typename) {
    case "PendingDream":
      return {
        type: "pending",
        dream,
      };
    case "RunningDream":
      return {
        type: "running",
        dream,
      };
    case "FinishedDream":
      return {
        type: "finished",
        dream,
      };
    case "StoppedDream":
      switch (dream.reason) {
        case StoppedDreamReason.DreamError:
          return {
            type: "error",
            dream,
            message: dream.message ?? "Unknown error while dreaming",
          };
        default:
          return unreachable(dream.reason);
      }
    default:
      return unreachable(dream);
  }
}

interface UseDreamOptions {
  options: DreamOptions,
  updateOptions: UpdateDreamOptions,
  defaultOptions: DreamOptions,
}

export type UpdateDreamOptions = (_newOptions: Partial<DreamOptions>) => void;

export function useDreamOptions(defaultOptions: DreamOptions): UseDreamOptions {
  const [options, setOptions] = useState(defaultOptions);
  const updateOptions = useCallback((newOptions: Partial<DreamOptions>) => {
    setOptions((currentOptions) => ({ ...currentOptions, ...newOptions }));
  }, []);

  return {
    options,
    updateOptions,
    defaultOptions,
  };
}
