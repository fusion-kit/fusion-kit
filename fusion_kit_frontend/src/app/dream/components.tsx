import React from "react";
import { clsx } from "clsx";
import { DreamImage } from "./hooks";
import { BACKEND_URL, joinUrlPath } from "../../client";
import { unreachable } from "../../utils";

interface ShowDreamImageProps {
  image: DreamImage | null,
}

export const ShowDreamImage: React.FC<ShowDreamImageProps> = (props) => {
  const { image } = props;

  const imageUri = getDreamImageUri(image);
  const isLoading = isDreamImageLoading(image);
  const progress = getDreamImageProgress(image);

  if (imageUri != null) {
    return (
      <BigImageContainer widthRatio={1} heightRatio={1}>
        <div
          className={clsx(
            "transition-[border-radius] overflow-hidden relative",
            progress != null ? "rounded-lg" : "",
          )}
        >
          <img src={imageUri} alt="" className="w-full h-full object-contain" />
          {progress != null ? (
            <div className="h-[10%] absolute inset-x-0 bottom-0">
              <MiniProgressBar progress={progress} />
            </div>
          ) : null}
        </div>
      </BigImageContainer>
    );
  } else {
    return (
      <BigImageContainer widthRatio={1} heightRatio={1}>
        <div
          className={clsx(
            "bg-gray-200 w-full h-full rounded-lg",
            isLoading ? "animate-pulse" : "",
          )}
        >
        </div>
      </BigImageContainer>
    );
  }
};

type BigImageContainerProps = React.PropsWithChildren<{
  widthRatio: number,
  heightRatio: number,
}>;

const BigImageContainer: React.FC<BigImageContainerProps> = (props) => {
  const { widthRatio, heightRatio } = props;
  return (
    <div className="h-full max-h-[70vmin] lg:w-full lg:max-h-full">
      <div
        className="max-w-[70vmin] lg:max-w-full lg:max-h-full m-auto relative"
        style={{ aspectRatio: `${widthRatio} / ${heightRatio}` }}
      >
        {props.children}
      </div>
    </div>
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

interface MiniProgressBarProps {
  progress: number,
}

export const MiniProgressBar: React.FC<MiniProgressBarProps> = (props) => {
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
