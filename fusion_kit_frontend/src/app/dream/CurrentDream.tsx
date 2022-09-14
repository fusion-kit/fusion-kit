import { clsx } from "clsx";
import React from "react";
import { unreachable } from "../../utils";
import { ErrorBox } from "../ErrorBox";
import { DreamState, Dream } from "./hooks";

interface CurrentDreamProps {
  dreamState: DreamState,
  numImages: number,
}

export const CurrentDream: React.FC<CurrentDreamProps> = (props) => {
  const { dreamState, numImages } = props;

  const { dream } = dreamState;

  const images = dream?.images
    ?? Array(numImages).fill(null).map(() => pendingImage());

  return (
    <>
      {dreamState.type === "error" ? (
        <ErrorBox>
          <h3 className="text-sm font-medium text-red-800">Got error while creating dream</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>
              {dreamState.message}
            </p>
          </div>
        </ErrorBox>
      ) : null}
      <ShowDreamImages images={images} />
    </>
  );
};

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
