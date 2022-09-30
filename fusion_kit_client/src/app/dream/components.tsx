import React, { useCallback } from "react";
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

  const isComplete = image?.__typename === "FinishedDreamImage";
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
        <DreamImageActionLink
          label="Download"
          href={imageUri ?? "#"}
          disabled={!isComplete || imageUri == null}
          download
          target="_blank"
        >
          <ArrowDownTrayIcon className="h-8 w-8" aria-hidden="true" />
        </DreamImageActionLink>
        <DreamImageActionLink
          label="Open in new window"
          href={imageUri ?? "#"}
          disabled={!isComplete || imageUri == null}
          target="_blank"
        >
          <ArrowTopRightOnSquareIcon className="h-full w-full" aria-hidden="true" />
        </DreamImageActionLink>
      </div>
    </div>
  );
};

type DreamImageActionLinkProps = React.PropsWithChildren<{
  label: string,
  href: string,
  disabled?: boolean,
  target?: string,
  download?: boolean,
}>;

const DreamImageActionLink: React.FC<DreamImageActionLinkProps> = (props) => {
  const {
    label, href, disabled = false, target, download,
  } = props;

  const onClick: React.MouseEventHandler = useCallback((e) => {
    if (disabled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, [disabled]);

  return (
    <a
      href={href}
      target={target}
      title={label}
      download={download}
      className={clsx(
        "flex h-10 w-10 p-1.5 items-center justify-center rounded-full border-2 focus:outline-none focus:border-blue-600 focus:text-blue-600",
        disabled ? "text-gray-200 border-gray-200 cursor-not-allowed" : "text-gray-400 border-gray-400 hover:text-gray-600 hover:border-gray-600",
      )}
      onClick={onClick}
    >
      {props.children}
      <span className="sr-only">{props.label}</span>
    </a>
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
