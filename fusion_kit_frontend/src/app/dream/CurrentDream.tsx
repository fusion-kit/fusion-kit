import { clsx } from "clsx";
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { unreachable } from "../../utils";
import { ErrorBox } from "../ErrorBox";
import {
  DreamState, UseDreamImageSelection, isDreamImageLoading,
  getDreamImageUri, getDreamImageProgress, DreamImage,
} from "./hooks";
import { useStableKeys } from "../../hooks";
import { MiniProgressBar } from "./components";

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
      <AnimatePresence>
        <ErrorBox>
          <h3 className="text-sm font-medium text-red-800">Got error while creating dream</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>
              {dreamState.message}
            </p>
          </div>
        </ErrorBox>
      </AnimatePresence>
    );
  }

  if (dream == null || dream.__typename === "PendingDream") {
    return (
      <AnimatePresence>
        <DreamProgressBar status="indeterminate" progress={1} label="Starting dream..." />
      </AnimatePresence>
    );
  }

  if (dream.__typename === "StoppedDream") {
    return (
      <AnimatePresence>
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
      </AnimatePresence>
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
        <AnimatePresence>
          <DreamProgressBar status="loading" progress={progress} label={label} />
        </AnimatePresence>
      );
    }
    case "FinishedDream":
      return <AnimatePresence></AnimatePresence>;
    default:
      return unreachable(dream);
  }
};

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
                "relative group max-w-20 block w-full overflow-hidden rounded-lg bg-gray-100 focus-within:ring-indigo-700",
                selectedImageIndex === index
                  ? "ring-4 ring-offset-0 ring-indigo-500 focus-within:ring-indigo-700"
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

const DreamProgressBar: React.FC<ProgressBarProps> = (props) => {
  return (
    <motion.div
      className="h-8 mt-6 rounded-lg overflow-hidden box-border shadow-sm ring-1 ring-gray-300"
      key="dream-progress-bar"
      initial="collapsed"
      animate="open"
      exit="collapsed"
      variants={{
        open: { height: "2rem", marginTop: "1.5rem" },
        collapsed: { height: 0, marginTop: 0 },
      }}
      transition={{ duration: 0.1, ease: "easeInOut" }}
    >
      <ProgressBar {...props} />
    </motion.div>
  );
};

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
