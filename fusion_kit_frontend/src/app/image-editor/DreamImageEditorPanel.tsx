import { Dialog, Transition } from "@headlessui/react";
import { clsx } from "clsx";
import React, {
  Fragment, useCallback, useState,
} from "react";
import { DreamBaseImageMaskType } from "../../generated/graphql";
import { Dimensions, useCreateCanvas } from "./hooks";
import { ImageMaskEditor } from "./ImageMaskEditor";
import { ImageResizeEditor } from "./ImageResizeEditor";

const IMAGE_EDITOR_TABS = [
  {
    name: "Image mask",
    key: "image-mask",
    component: (props: ImageEditorProps) => (<ImageMaskEditor {...props} />),
  },
  {
    name: "Resize",
    key: "resize",
    component: (props: ImageEditorProps) => (<ImageResizeEditor {...props} />),
  },
] as const;

interface DreamImageEditorPanelProps {
  open: boolean,
  image: File | Blob | null,
  imageMask: File | Blob | null,
  imageMaskType: DreamBaseImageMaskType,
  onClose: () => void,
  onSaveImage: () => void,
  onSaveMask: (_newMask: Blob, _newMaskType: DreamBaseImageMaskType) => void,
}

export const DreamImageEditorPanel: React.FC<DreamImageEditorPanelProps> = (props) => {
  const {
    open, onClose, image, imageMask, imageMaskType, onSaveImage: _, onSaveMask,
  } = props;

  const [currentTab, setCurrentTab] = useState(0);
  const [currentImageMaskType, setCurrentImageMaskType] = useState(imageMaskType);

  const {
    canvas: imageCanvas,
    dimensions,
  } = useCreateCanvas({ image });
  const {
    canvas: maskCanvas,
  } = useCreateCanvas({ image: imageMask, dimensions });

  const onSaveClick = useCallback(() => {
    maskCanvas?.toBlob((blob) => {
      if (blob == null) {
        console.warn("Failed to create blob");
        return;
      }

      onSaveMask(blob, currentImageMaskType);
      onClose();
    });
  }, [onSaveMask, onClose, maskCanvas, currentImageMaskType]);

  const TabComponent = IMAGE_EDITOR_TABS[currentTab].component;

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-xl sm:p-6">
                <Dialog.Title className="text-lg font-medium leading-6 text-gray-900">
                  Edit base image
                </Dialog.Title>
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {IMAGE_EDITOR_TABS.map((tab, index) => {
                      const isCurrent = index === currentTab;
                      return (
                        <button
                          // eslint-disable-next-line react/no-array-index-key
                          key={index}
                          type="button"
                          className={clsx(
                            isCurrent
                              ? "border-indigo-500 text-indigo-600"
                              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
                            "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm",
                          )}
                          onClick={() => setCurrentTab(index)}
                          aria-current={isCurrent}
                        >
                          {tab.name}
                        </button>
                      );
                    })}
                  </nav>
                </div>
                <TabComponent
                  dimensions={dimensions}
                  imageCanvas={imageCanvas}
                  imageMaskCanvas={maskCanvas}
                  currentImageMaskType={currentImageMaskType}
                  setCurrentImageMaskType={setCurrentImageMaskType}
                />
                <div className="mt-4 flex justify-end space-x-2">
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                    onClick={onSaveClick}
                  >
                    Save
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export interface ImageEditorProps {
  dimensions: Dimensions | null,
  imageCanvas: HTMLCanvasElement | null,
  imageMaskCanvas: HTMLCanvasElement | null,
  currentImageMaskType: DreamBaseImageMaskType,
  setCurrentImageMaskType: (_maskType: DreamBaseImageMaskType) => void,
}

type ImageEditorActionButtonProps = React.PropsWithChildren<{
  label?: string,
  disabled?: boolean,
  showLabel?: boolean,
  selected?: boolean,
  onClick?: () => void,
}>;

export const ImageEditorActionButton: React.FC<ImageEditorActionButtonProps> = (props) => {
  const { selected = false, showLabel = false, onClick } = props;
  return (
    <button
      type="button"
      title={props.label}
      disabled={props.disabled}
      onClick={onClick}
      className={clsx(
        "flex h-8 p-1.5 items-center justify-center rounded-full",
        selected
          ? "bg-gray-400 text-white border-2 border-gray-400 hover:border-gray-600 hover:bg-gray-600 focus:outline-none focus:border-blue-600 disabled:bg-gray-200 disabled:border-gray-200"
          : "text-gray-400 border-2 border-gray-400 hover:text-gray-600 hover:border-gray-600 focus:outline-none focus:border-blue-600 focus:text-blue-600 disabled:text-gray-200 disabled:border-gray-200",
      )}
    >
      {props.children}
      <span className={clsx(showLabel ? "px-2" : "sr-only")}>{props.label}</span>
    </button>
  );
};
