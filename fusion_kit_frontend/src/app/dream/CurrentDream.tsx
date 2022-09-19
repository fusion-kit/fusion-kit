import { clsx } from "clsx";
import React from "react";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { unreachable } from "../../utils";
import { ErrorBox } from "../ErrorBox";
import {
  DreamState, Dream, UseDreamImageSelection,
} from "./hooks";
import { BACKEND_URL, joinUrlPath } from "../../client";
import { useStableKeys } from "../../hooks";

interface CurrentDreamProps {
  dreamState: DreamState,
  numImages: number,
  dreamImageSelection: UseDreamImageSelection,
}

export const CurrentDream: React.FC<CurrentDreamProps> = (props) => {
  const { dreamState, numImages, dreamImageSelection } = props;

  const { dream } = dreamState;

  const images = dream?.images
    ?? Array(numImages).fill(null);

  return (
    <>
      <DreamStatus dreamState={dreamState} />
      <ShowDreamImages images={images} dreamImageSelection={dreamImageSelection} />
    </>
  );
};

interface DreamStatusProps {
  dreamState: DreamState,
}

const DreamStatus: React.FC<DreamStatusProps> = (props) => {
  const { dreamState } = props;
  const { dream } = dreamState;

  if (dreamState.type === "error") {
    return (
      <ErrorBox>
        <h3 className="text-sm font-medium text-red-800">Got error while creating dream</h3>
        <div className="mt-2 text-sm text-red-700">
          <p>
            {dreamState.message}
          </p>
        </div>
      </ErrorBox>
    );
  }

  if (dream == null || dream.__typename === "PendingDream") {
    return (
      <div className="h-8 mt-6 rounded-lg overflow-hidden shadow-sm border border-gray-300">
        <ProgressBar status="indeterminate" progress={1} label="Starting dream..." />
      </div>
    );
  }

  if (dream.__typename === "StoppedDream") {
    return (
      <ErrorBox>
        <h3 className="text-sm font-medium text-red-800">Dream stopped unexpectedly</h3>
        <div className="mt-2 text-sm text-red-700">
          <p>
            {dream.reason}
            :
            {" "}
            {dream.message}
          </p>
        </div>
      </ErrorBox>
    );
  }

  switch (dream.__typename) {
    case "RunningDream": {
      const progress = dream.numFinishedSteps / dream.numTotalSteps;
      const percentage = `${Math.round(progress * 100)}%`;
      const numImages = dream.images.length;
      const plural = numImages !== 1;
      const label = `Generating ${numImages} image${plural ? "s" : ""} (${percentage})`;
      return (
        <div className="h-8 mt-6 rounded-lg overflow-hidden shadow-sm border border-gray-300">
          <ProgressBar status="loading" progress={progress} label={label} />
        </div>
      );
    }
    case "FinishedDream":
      return (
        <div className="h-8 mt-6 rounded-lg shadow-sm border border-green-300 bg-green-50 text-green-700 px-2 flex justify-between items-center">
          <div className="flex items-center">
            <CheckCircleIcon className="h-4 w-4 text-green-400" aria-hidden="true" />
            <span className="ml-1">Dream finished</span>
          </div>
        </div>
      );
    default:
      return unreachable(dream);
  }
};

type DreamImage = Dream["images"][0];

interface ShowDreamImagesProps {
  images: (DreamImage | null)[],
  dreamImageSelection: UseDreamImageSelection,
}

const ShowDreamImages: React.FC<ShowDreamImagesProps> = (props) => {
  const { images, dreamImageSelection } = props;
  const { selectImageIndex, selectedImageIndex } = dreamImageSelection;

  const { getKey } = useStableKeys();

  return (
    <ul className="mt-6 gap-2 md:gap-4 grid justify-center grid-cols-repeat-fit-20">
      {images.map((image, index) => {
        const imageUri = getDreamImageUri(image);
        const isLoading = isDreamImageLoading(image);
        const progress = getDreamImageProgress(image);
        return (
          <li key={getKey(index, image?.id)}>
            <div
              className={clsx(
                "relative group max-w-20 block w-full overflow-hidden rounded-lg bg-gray-100 focus-within:ring-indigo-500",
                selectedImageIndex === index
                  ? "ring-2 ring-offset-0 ring-indigo-500 focus-within:ring-4"
                  : "focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-100",
              )}
            >
              {imageUri != null ? (
                <img src={imageUri} alt="" className="pointer-events-none object-cover group-hover:opacity-75" />
              ) : <div className={clsx("w-20 h-20 bg-gray-300", isLoading ? "animate-pulse" : null)}></div>}

              {progress != null ? (
                <div className="h-3 absolute inset-x-0 bottom-0">
                  <MiniProgressBar progress={progress} />
                </div>
              ) : null}

              <button
                type="button"
                className="absolute inset-0 focus:outline-none"
                onClick={() => { selectImageIndex(index); }}
              >
                <span className="sr-only">Expand image</span>
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

function getDreamImageUri(dreamImage: DreamImage | null): string | null {
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

function isDreamImageLoading(dreamImage: DreamImage | null): boolean {
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

function getDreamImageProgress(dreamImage: DreamImage | null): number | null {
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

interface ProgressBarProps {
  status: "loading" | "indeterminate",
  progress: number,
  label?: string,
}

const ProgressBar: React.FC<ProgressBarProps> = (props) => {
  const percent = Math.min(Math.max(props.progress * 100, 0), 100);

  return (
    <div className="h-full relative bg-gray-100 text-black">
      {props.label != null ? (
        <div className="absolute z-10 flex items-center justify-center inset-0">
          <span className="text-shadow-sm shadow-black/50">{props.label}</span>
        </div>
      ) : null}
      <span
        // We set a key so that changing statuses doesn't trigger a CSS
        // transition (since this causes the element to be replaced)
        key={props.status}
        className={clsx(
          "block h-full bg-50 animate-slide-background-xy-50 relative overflow-hidden transition-width duration-250",
          props.status === "loading"
            ? "bg-candystripes from-blue-200 to-blue-300"
            : "bg-candystripes from-gray-200 to-gray-300",
        )}
        style={{ width: `${percent}%` }}
      >
      </span>
    </div>
  );
};

interface MiniProgressBarProps {
  progress: number,
}

const MiniProgressBar: React.FC<MiniProgressBarProps> = (props) => {
  const percent = Math.min(Math.max(props.progress * 100, 0), 100);

  return (
    <div className="h-full bg-gray-100 text-black opacity-90">
      <span
        className="block h-full relative overflow-hidden bg-blue-500"
        style={{ width: `${percent}%` }}
      >
      </span>
    </div>
  );
};
