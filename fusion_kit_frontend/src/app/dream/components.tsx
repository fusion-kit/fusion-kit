import React from "react";
import { clsx } from "clsx";
import {
  DreamImage, getDreamImageUri, isDreamImageLoading, getDreamImageProgress,
} from "./hooks";

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
