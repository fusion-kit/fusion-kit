import { clsx } from "clsx";
import React from "react";
import { unreachable } from "../../utils";
import { ErrorBox } from "../ErrorBox";
import { DreamState, Dream } from "./hooks";
import { BACKEND_URL, joinUrlPath } from "../../graphql-client";

interface CurrentDreamProps {
  dreamState: DreamState,
  numImages: number,
}

export const CurrentDream: React.FC<CurrentDreamProps> = (props) => {
  const { dreamState, numImages } = props;

  const { dream } = dreamState;

  const images = dream?.images
    ?? Array(numImages).fill(null);

  return (
    <>
      <DreamStatus dreamState={dreamState} />
      <ShowDreamImages images={images} />
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
      <div className="h-8 mt-6">
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
        <div className="h-8 mt-6">
          <ProgressBar status="loading" progress={progress} label={label} />
        </div>
      );
    }
    case "FinishedDream":
      return null;
    default:
      return unreachable(dream);
  }
};

type DreamImage = Dream["images"][0];

interface ShowDreamImagesProps {
  images: (DreamImage | null)[],
}

const ShowDreamImages: React.FC<ShowDreamImagesProps> = (props) => {
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
      return dreamImage.previewImageUri ?? null;
    case "FinishedDreamImage":
      return dreamImage.imageUri;
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

interface ProgressBarProps {
  status: "loading" | "indeterminate",
  progress: number,
  label?: string,
}

const ProgressBar: React.FC<ProgressBarProps> = (props) => {
  const percent = Math.min(Math.max(props.progress * 100, 0), 100);

  return (
    <div className="h-full relative bg-gray-100 rounded-lg text-black overflow-hidden shadow-sm border border-gray-300 box-content">
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
