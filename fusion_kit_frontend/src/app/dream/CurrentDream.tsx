import { MutationResult, useSubscription } from "@apollo/client";
import { clsx } from "clsx";
import React from "react";
import {
  StartDreamMutation, StoppedDreamReason, WatchDreamDocument, WatchDreamSubscription,
} from "../../generated/graphql";
import { unreachable } from "../../utils";
import { ErrorBox } from "../ErrorBox";

interface CurrentDreamProps {
  startDreamResult: MutationResult<StartDreamMutation>,
  numImages: number,
}

export const CurrentDream: React.FC<CurrentDreamProps> = (props) => {
  const { startDreamResult, numImages } = props;

  const currentDreamId = startDreamResult.data?.startDream.id;

  const watchDreamResult = useSubscription(WatchDreamDocument, {
    variables: {
      dreamId: currentDreamId!,
    },
    skip: currentDreamId == null,
  });

  if (!startDreamResult.called) {
    return null;
  }

  const error = startDreamResult.error ?? watchDreamResult.error;
  if (error != null) {
    return (
      <ErrorBox>
        <h3 className="text-sm font-medium text-red-800">Got error while generating dream</h3>
        <div className="mt-2 text-sm text-red-700">
          <p>
            Error message:
            {" "}
            {error.message}
          </p>
        </div>
      </ErrorBox>
    );
  }

  const dream = watchDreamResult.data?.watchDream;

  const images = dream?.images
    ?? Array(numImages).fill(null).map(() => pendingImage());

  return (
    <>
      {dream?.__typename === "StoppedDream" ? <ShowStoppedDream dream={dream} /> : null}
      <ShowDreamImages images={images} />
    </>
  );
};

type Dream = WatchDreamSubscription["watchDream"];

type DreamImage = Dream["images"][0];

function pendingImage(): DreamImage {
  return {
    __typename: "PendingDreamImage",
  };
}

interface ShowDreamImagesProps {
  images: DreamImage[],
}

export const ShowDreamImages: React.FC<ShowDreamImagesProps> = (props) => {
  const { images } = props;

  return (
    <ul className="py-6 gap-2 md:gap-4 grid justify-center grid-cols-repeat-fit-20">
      {images.map((image, index) => {
        const imageUri = getDreamImageUri(image);
        const isLoading = isDreamImageLoading(image);
        return (
          // eslint-disable-next-line react/no-array-index-key
          <li key={index.toString()}>
            <div
              className={clsx(
                "relative group max-w-20 block w-full overflow-hidden rounded-lg bg-gray-100 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-100",
              )}
            >
              {imageUri != null ? (
                <img src={imageUri} alt="" className="pointer-events-none object-cover group-hover:opacity-75" />
              ) : <div className={clsx("w-20 h-20 bg-gray-300", isLoading ? "animate-pulse" : null)}></div>}

              <button type="button" className="absolute inset-0 focus:outline-none">
                <span className="sr-only">Expand image</span>
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

interface ShowStoppedDreamProps {
  dream: Dream & {__typename: "StoppedDream"},
}

const ShowStoppedDream: React.FC<ShowStoppedDreamProps> = (props) => {
  const { dream } = props;

  switch (dream.reason) {
    case StoppedDreamReason.DreamError:
      return (
        <ErrorBox>
          <h3 className="text-sm font-medium text-red-800">Dream stopped due to error</h3>
          <div className="mt-2 text-sm text-red-700">
            {dream.message != null ? (
              <p>{dream.message}</p>
            ) : <p>Unknown error</p>}

          </div>
        </ErrorBox>
      );
    default:
      return unreachable(dream.reason);
  }
};

function getDreamImageUri(dreamImage: DreamImage): string | null {
  switch (dreamImage.__typename) {
    case "PendingDreamImage":
      return null;
    case "RunningDreamImage":
      return dreamImage.previewImageUri ?? null;
    case "FinishedDreamImage":
      return dreamImage.imageUri;
    case "StoppedDreamImage":
      return null;
    default:
      return unreachable(dreamImage);
  }
}

function isDreamImageLoading(dreamImage: DreamImage): boolean {
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
