import React from "react";
import { clsx } from "clsx";
import { ArrowDownTrayIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/20/solid";
import {
  DreamImage, getDreamImageUri, isDreamImageLoading, getDreamImageProgress, getDreamImageDimensions,
} from "./hooks";

interface ShowDreamImageProps {
  image: DreamImage | null,
}

export const ShowDreamImage: React.FC<ShowDreamImageProps> = (props) => {
  const { image } = props;

  const imageUri = getDreamImageUri(image);
  const isLoading = isDreamImageLoading(image);
  const progress = getDreamImageProgress(image);
  const dimensions = getDreamImageDimensions(image);

  return (
    <div className="flex flex-col lg:h-full">
      <div className="min-h-0">
        <BigImageContainer
          widthRatio={dimensions?.width ?? 1}
          heightRatio={dimensions?.height ?? 1}
        >
          {imageUri != null ? (
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
          ) : (
            <div
              className={clsx(
                "bg-gray-200 w-full h-full rounded-lg",
                isLoading ? "animate-pulse" : "",
              )}
            >
            </div>
          )}
        </BigImageContainer>
      </div>
      <div className="mx-auto py-2 max-w-lg lg:max-w-full lg:pb-0 flex space-x-2">
        <DreamImageActionButton label="Download">
          <ArrowDownTrayIcon className="h-8 w-8" aria-hidden="true" />
        </DreamImageActionButton>
        <DreamImageActionButton label="Open in new window">
          <ArrowTopRightOnSquareIcon className="h-full w-full" aria-hidden="true" />
        </DreamImageActionButton>
      </div>
    </div>
  );
};

type DreamImageActionButtonProps = React.PropsWithChildren<{
  label: string,
}>;

const DreamImageActionButton: React.FC<DreamImageActionButtonProps> = (props) => {
  return (
    <button
      type="button"
      title={props.label}
      className="flex h-10 w-10 p-1.5 items-center justify-center rounded-full text-gray-400 border-2 border-gray-400 hover:text-gray-600 hover:border-gray-600 focus:outline-none focus:border-blue-600 focus:text-blue-600"
    >
      {props.children}
      <span className="sr-only">{props.label}</span>
    </button>
  );
};

type DreamImageActionButtonProps = React.PropsWithChildren<{
  label: string,
}>;

const DreamImageActionLink: React.FC<DreamImageActionButtonProps> = (props) => {
  return (
    <button
      type="button"
      title={props.label}
      className="flex h-10 w-10 p-1.5 items-center justify-center rounded-full text-gray-400 border-2 border-gray-400 hover:text-gray-600 hover:border-gray-600 focus:outline-none focus:border-blue-600 focus:text-blue-600"
    >
      {props.children}
      <span className="sr-only">{props.label}</span>
    </button>
  );
};

type BigImageContainerProps = React.PropsWithChildren<{
  widthRatio: number,
  heightRatio: number,
}>;

export const BigImageContainer: React.FC<BigImageContainerProps> = (props) => {
  const { widthRatio, heightRatio } = props;
  return (
    <div className="h-full">
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
