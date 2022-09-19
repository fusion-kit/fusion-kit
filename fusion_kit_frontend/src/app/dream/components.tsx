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

  if (imageUri != null) {
    return (
      <BigImageContainer widthRatio={1} heightRatio={1}>
        <img src={imageUri} alt="" className="w-full h-full object-contain" />
      </BigImageContainer>
    );
  } else {
    return (
      <BigImageContainer widthRatio={1} heightRatio={1}>
        <div className={clsx("bg-gray-200 w-full h-full", isLoading ? "animate-pulse" : "")}>
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
        className="max-w-[70vmin] lg:max-w-full lg:max-h-full m-auto"
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
