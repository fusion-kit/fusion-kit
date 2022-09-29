import {
  MutationResult, SubscriptionResult, useMutation, useSubscription,
} from "@apollo/client";
import { useCallback, useEffect, useState } from "react";
import { BACKEND_URL, joinUrlPath } from "../../client";
import {
  DreamBaseImageMaskType,
  DreamSampler,
  StartDreamDocument, StartDreamMutation, StoppedDreamReason,
  WatchDreamDocument, WatchDreamSubscription,
} from "../../generated/graphql";
import { clamp, unreachable } from "../../utils";
import { Dimensions } from "../image-editor/hooks";

export interface DreamOptions {
  prompt: string,
  numImages: number,
  seed: number | null,
  width: number,
  height: number,
  baseImage: File | Blob | null,
  baseImageMask: File | Blob | null,
  baseImageMaskType: DreamBaseImageMaskType,
  baseImageDecimation: number,
  sampler: DreamSampler,
  samplerSteps: number,
  samplerEta: number,
  guidanceScale: number,
}

export interface SelectedFile {
  file: File,
  url: string,
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

export type DreamImage = Dream["images"][0];

export function useCreateDream(): UseCreateDream {
  const [startDream, startDreamResult] = useMutation(StartDreamDocument);
  const createDream = useCallback(async (opts: DreamOptions) => {
    const baseImageDecimation = opts.baseImage != null ? opts.baseImageDecimation : null;
    const baseImageMask = opts.baseImage != null ? opts.baseImageMask : null;
    const baseImageMaskType = baseImageMask != null ? opts.baseImageMaskType : null;
    const width = opts.baseImage != null ? null : opts.width;
    const height = opts.baseImage != null ? null : opts.height;
    await startDream({
      variables: {
        options: {
          prompt: opts.prompt,
          numImages: opts.numImages,
          seed: opts.seed ?? undefined,
          width,
          height,
          baseImage: opts.baseImage ?? undefined,
          baseImageMask,
          baseImageMaskType,
          baseImageDecimation,
          sampler: opts.sampler,
          samplerSteps: opts.samplerSteps,
          samplerEta: opts.samplerEta,
          guidanceScale: opts.guidanceScale,
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

export interface UseDreamImageSelection {
  selectedImage: DreamImage | null,
  selectedImageIndex: number | null,
  selectImageIndex: (_index: number | null) => void,
}

export function useDreamImageSelection(images: (DreamImage | null)[]): UseDreamImageSelection {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const selectImageIndex = useCallback((newIndex: number | null) => {
    setSelectedIndex((currentIndex) => {
      if (newIndex != null && newIndex === currentIndex) {
        return null;
      } else {
        return getEffectiveImageSelectionIndex(newIndex, images);
      }
    });
  }, [images]);

  const effectiveIndex = getEffectiveImageSelectionIndex(selectedIndex, images);
  const selectedImage = effectiveIndex != null ? images[effectiveIndex] : null;

  return {
    selectedImage,
    selectedImageIndex: effectiveIndex,
    selectImageIndex,
  };
}

function getEffectiveImageSelectionIndex(
  selectedIndex: number | null,
  images: unknown[],
): number | null {
  if (images.length === 0 || selectedIndex == null) {
    return null;
  }

  return clamp(selectedIndex, 0, images.length - 1);
}

export function getDreamImageUri(dreamImage: DreamImage | null): string | null {
  const path = getDreamImagePath(dreamImage);
  if (path == null) {
    return null;
  }

  return joinUrlPath(BACKEND_URL, path);
}

function getDreamImagePath(dreamImage: DreamImage | null): string | null {
  if (dreamImage == null) {
    return null;
  }

  switch (dreamImage.__typename) {
    case "PendingDreamImage":
      return null;
    case "RunningDreamImage":
      return dreamImage.previewImagePath ?? null;
    case "FinishedDreamImage":
      return dreamImage.imagePath;
    case "StoppedDreamImage":
      return null;
    default:
      return unreachable(dreamImage);
  }
}

export function isDreamImageLoading(dreamImage: DreamImage | null): boolean {
  if (dreamImage == null) {
    return true;
  }

  switch (dreamImage.__typename) {
    case "PendingDreamImage":
    case "RunningDreamImage":
      return true;
    case "FinishedDreamImage":
    case "StoppedDreamImage":
      return false;
    default:
      return unreachable(dreamImage);
  }
}

export function getDreamImageProgress(dreamImage: DreamImage | null): number | null {
  if (dreamImage == null) {
    return null;
  }

  switch (dreamImage.__typename) {
    case "PendingDreamImage":
      return null;
    case "RunningDreamImage":
      return dreamImage.numFinishedSteps / dreamImage.numTotalSteps;
    case "FinishedDreamImage":
      return null;
    case "StoppedDreamImage":
      return null;
    default:
      return unreachable(dreamImage);
  }
}

export function useFileObjectUrl(file: File | Blob | null): string | null {
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

  return objectUrl;
}

export function useImageDimensions(url: string | null): Dimensions | null {
  const [dimensions, setDimensions] = useState<Dimensions | null>(null);

  useEffect(() => {
    setDimensions(null);

    if (url != null) {
      const image = new Image();
      image.onload = () => {
        setDimensions({ width: image.width, height: image.height });
      };
      image.src = url;

      return () => {
        image.src = "";
      };
    } else {
      return undefined;
    }
  }, [url]);

  return dimensions;
}
