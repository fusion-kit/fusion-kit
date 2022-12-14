import React, { useCallback, useState } from "react";
import clsx from "clsx";
import { DreamInputForm } from "./DreamInputForm";
import { CurrentDream } from "./CurrentDream";
import { useCreateDream, useDreamImageSelection, useDreamOptions } from "./hooks";
import { ShowDreamImage } from "./components";
import { DreamBaseImageMaskType, DreamSampler } from "../../generated/graphql";
import { DreamImageEditorPanel } from "../image-editor/DreamImageEditorPanel";

export const DreamPage: React.FC = () => {
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);

  const { options, updateOptions } = useDreamOptions({
    prompt: "",
    numImages: 1,
    seed: null,
    width: 512,
    height: 512,
    baseImage: null,
    baseImageMask: null,
    baseImageMaskType: DreamBaseImageMaskType.ReplaceMasked,
    baseImageDecimation: 0.75,
    sampler: DreamSampler.Ddim,
    samplerSteps: 50,
    samplerEta: 0.0,
    guidanceScale: 7.5,
  });
  const { createDream, dreamState } = useCreateDream();

  const images = dreamState?.dream?.images ?? Array(options.numImages).fill(null);
  const dreamImageSelection = useDreamImageSelection(images);
  const { selectedImage } = dreamImageSelection;

  const onStartDream = useCallback(async () => {
    const response = await createDream(options);
    console.info("Started dream", { prompt, response });
  }, [createDream, options]);

  const onSaveImage = useCallback(
    (newImage: File | Blob | null) => {
      updateOptions({ baseImage: newImage });
    },
    [updateOptions],
  );

  const onSaveMask = useCallback(
    (
      newMask: File | Blob | null,
      newMaskType: DreamBaseImageMaskType,
    ) => {
      updateOptions({
        baseImageMask: newMask,
        baseImageMaskType: newMaskType,
      });
    },
    [updateOptions],
  );

  return (
    <>
      <div className="flex flex-1 flex-col lg:flex-row h-full absolute lg:static inset-0 overflow-auto lg:overflow-visible">
        <main className="lg:flex-grow p-6 lg:h-full lg:overflow-auto">
          <div className="w-full max-w-lg mx-auto">
            <DreamInputForm
              options={options}
              updateOptions={updateOptions}
              onStartDream={onStartDream}
              onEditImage={() => setIsImageEditorOpen(true)}
            />
            {dreamState != null ? (
              <CurrentDream
                dreamState={dreamState}
                numImages={options.numImages}
                dreamImageSelection={dreamImageSelection}
              />
            ) : null}
          </div>
        </main>
        <aside
          className={clsx(
            "w-auto xl:w-[30rem] border-l-0 lg:border-l px-6 pb-6 lg:h-auto lg:w-80 lg:pt-6 lg:overflow-auto",
            selectedImage != null ? "" : "hidden lg:block lg:invisible",
          )}
        >
          {selectedImage != null ? (<ShowDreamImage image={selectedImage} />) : null}
        </aside>
      </div>

      <DreamImageEditorPanel
        open={isImageEditorOpen}
        image={options.baseImage}
        imageMask={options.baseImageMask}
        imageMaskType={options.baseImageMaskType}
        onClose={() => setIsImageEditorOpen(false)}
        onSaveImage={onSaveImage}
        onSaveMask={onSaveMask}
      />
    </>
  );
};
