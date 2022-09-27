import { Dialog, RadioGroup, Transition } from "@headlessui/react";
import { CheckCircleIcon } from "@heroicons/react/20/solid";
import { clsx } from "clsx";
import React, {
  Fragment, useCallback, useEffect, useRef, useState,
} from "react";
import {
  ArrowClockwise, ArrowCounterclockwise, BrushFill, EraserFill, TrashFill,
} from "react-bootstrap-icons";
import { DreamBaseImageMaskType } from "../../generated/graphql";
import { unreachable } from "../../utils";
import { BigImageContainer } from "./components";

const IMAGE_EDITOR_TABS = [
  {
    name: "Image mask",
    key: "image-mask",
    component: (props: ImageEditorProps) => (<ImageMaskEditor {...props} />),
  },
  {
    name: "Resize",
    key: "resize",
    component: (_props: ImageEditorProps) => null,
  },
] as const;

const IMAGE_MASK_TYPES = [
  {
    value: DreamBaseImageMaskType.ReplaceMasked,
    title: "Replace Masked Sections",
    description: "Replace only the parts of the image covered by the mask, keep everything else.",
  },
  {
    value: DreamBaseImageMaskType.KeepMasked,
    title: "Keep Masked Sections",
    description: "Keep the parts of the image covered by the mask, replace everything else.",
  },
];

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

type PenType = "brush" | "eraser";

interface ImageEditorProps {
  dimensions: Dimensions | null,
  imageCanvas: HTMLCanvasElement | null,
  imageMaskCanvas: HTMLCanvasElement | null,
  currentImageMaskType: DreamBaseImageMaskType,
  setCurrentImageMaskType: (_maskType: DreamBaseImageMaskType) => void,
}

const ImageMaskEditor: React.FC<ImageEditorProps> = (props) => {
  const {
    dimensions, imageCanvas, imageMaskCanvas, currentImageMaskType, setCurrentImageMaskType,
  } = props;

  const [editorCanvas, setEditorCanvas] = useState<HTMLCanvasElement | null>(null);

  const [penSize, setPenSize] = useState(20);
  const [penType, setPenType] = useState<PenType>("brush");
  const [cursorPos, setCursorPos] = useState<Position | null>(null);
  const [mousePos, setMousePos] = useState<Position | null>(null);
  const [isPainting, setIsPainting] = useState(false);

  const lastPaintPoint = useRef<Position | null>();
  const {
    pushHistory, undoHistory, redoHistory, canUndo, canRedo,
  } = useMaskImageHistory({
    initialImage: imageMaskCanvas?.toDataURL() ?? null,
    maxImages: 12,
  });

  const drawEditorCanvas = useCallback(() => {
    const ctx = editorCanvas?.getContext("2d");

    if (ctx == null) {
      return;
    }

    if (imageCanvas != null) {
      ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);

      ctx.drawImage(imageCanvas, 0, 0, imageCanvas.width, imageCanvas.height);
    }

    if (imageMaskCanvas != null) {
      ctx.save();

      ctx.globalAlpha = 0.7;
      ctx.drawImage(imageMaskCanvas, 0, 0);

      ctx.restore();
    }

    if (cursorPos != null) {
      ctx.save();

      ctx.strokeStyle = "black";
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(cursorPos.x, cursorPos.y, penSize / 2, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fill();

      ctx.restore();
    }
  }, [editorCanvas, cursorPos, penSize, imageCanvas, imageMaskCanvas]);

  // Paint on the mask canvas while the user is holding down the mouse button
  useEffect(() => {
    const maskCtx = imageMaskCanvas?.getContext("2d");
    if (maskCtx == null || imageMaskCanvas == null || mousePos == null) {
      return;
    }

    if (isPainting) {
      maskCtx.save();

      maskCtx.fillStyle = "black";
      maskCtx.strokeStyle = "black";
      maskCtx.lineWidth = penSize;
      maskCtx.lineCap = "round";

      switch (penType) {
        case "brush":
          break;
        case "eraser":
          maskCtx.globalCompositeOperation = "destination-out";
          break;
        default:
          unreachable(penType);
      }

      if (lastPaintPoint.current != null) {
        maskCtx.beginPath();
        maskCtx.moveTo(lastPaintPoint.current.x, lastPaintPoint.current.y);
        maskCtx.lineTo(mousePos.x, mousePos.y);
        maskCtx.stroke();
      } else {
        maskCtx.beginPath();
        maskCtx.arc(mousePos.x, mousePos.y, penSize / 2, 0, 2 * Math.PI);
        maskCtx.fill();
      }

      maskCtx.restore();

      drawEditorCanvas();
      lastPaintPoint.current = mousePos;
    } else {
      // If we just stopped drawing, then save the mask in the history
      // for undo/redo
      if (lastPaintPoint.current != null) {
        pushHistory(imageMaskCanvas.toDataURL());
      }

      lastPaintPoint.current = null;
    }
  }, [imageMaskCanvas, mousePos, isPainting, penSize, penType, drawEditorCanvas, pushHistory]);

  // Redraw the editor canvas whenever the `drawEditorCanvas` function
  // changes (meaning that some dependency of the function has changed).
  useEffect(() => {
    drawEditorCanvas();
  }, [drawEditorCanvas]);

  const redrawMaskCanvasWithSource = useCallback(
    (source: string | null) => {
      const maskCtx = imageMaskCanvas?.getContext("2d");
      if (imageMaskCanvas == null || maskCtx == null) {
        return;
      }

      if (source == null) {
        maskCtx.clearRect(0, 0, imageMaskCanvas.width, imageMaskCanvas.height);
        drawEditorCanvas();
      } else {
        const image = new Image();
        image.onload = () => {
          maskCtx.clearRect(0, 0, imageMaskCanvas.width, imageMaskCanvas.height);
          maskCtx.drawImage(image, 0, 0);
          drawEditorCanvas();
        };
        image.src = source;
      }
    },
    [imageMaskCanvas, drawEditorCanvas],
  );

  const clearMaskCanvas = useCallback(() => {
    const maskCtx = imageMaskCanvas?.getContext("2d");
    if (imageMaskCanvas == null || maskCtx == null) {
      return;
    }

    pushHistory(null);
    redrawMaskCanvasWithSource(null);
  }, [imageMaskCanvas, pushHistory, redrawMaskCanvasWithSource]);

  const undoMaskCanvas = useCallback(() => {
    const maskCtx = imageMaskCanvas?.getContext("2d");
    if (imageMaskCanvas == null || maskCtx == null) {
      return;
    }

    if (!canUndo) {
      console.warn("Undo callback called unexpectedly");
      return;
    }

    const imageData = undoHistory();
    redrawMaskCanvasWithSource(imageData);
  }, [imageMaskCanvas, canUndo, undoHistory, redrawMaskCanvasWithSource]);

  const redoMaskCanvas = useCallback(() => {
    const maskCtx = imageMaskCanvas?.getContext("2d");
    if (imageMaskCanvas == null || maskCtx == null) {
      return;
    }

    if (!canRedo) {
      console.warn("Redo callback called unexpectedly");
      return;
    }

    const imageData = redoHistory();
    redrawMaskCanvasWithSource(imageData);
  }, [imageMaskCanvas, canRedo, redoHistory, redrawMaskCanvasWithSource]);

  const onDocumentMouseEnter = useCallback((e: MouseEvent) => {
    if (editorCanvas == null) {
      return;
    }

    const pos = getEventCanvasPosition(editorCanvas, e);
    setCursorPos(pos);
    setMousePos(pos);
  }, [editorCanvas]);

  const onDocumentMouseMove = useCallback((e: MouseEvent) => {
    if (editorCanvas == null) {
      return;
    }

    // eslint-disable-next-line no-bitwise
    if ((e.buttons & 1) !== 1) {
      setIsPainting(false);
    }

    const pos = getEventCanvasPosition(editorCanvas, e);
    setCursorPos(pos);
    setMousePos(pos);
  }, [editorCanvas]);

  const onDocumentMouseOut = useCallback(() => {
    if (editorCanvas == null) {
      return;
    }

    setCursorPos(null);
    setMousePos(null);
  }, [editorCanvas]);

  const onEditorMouseDown: React.MouseEventHandler = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();

    setIsPainting(true);
  }, []);

  useEffect(() => {
    document.body.addEventListener("mouseover", onDocumentMouseEnter);
    document.body.addEventListener("mousemove", onDocumentMouseMove);
    document.body.addEventListener("mouseout", onDocumentMouseOut);

    return () => {
      document.body.removeEventListener("mouseover", onDocumentMouseEnter);
      document.body.removeEventListener("mousemove", onDocumentMouseMove);
      document.body.removeEventListener("mouseout", onDocumentMouseMove);
    };
  });

  return (
    <div>
      <div className="my-3">
        <p className="text-gray-500 text-sm">Draw an image mask to only replace specific parts of the base image (also called &quot;inpainting&quot;).</p>
      </div>
      <div className="py-2 lg:pt-0 flex space-x-2 justify-between">
        <div className="flex space-x-2">
          <ImageEditorActionButton
            label="Undo"
            disabled={!canUndo}
            onClick={undoMaskCanvas}
          >
            <ArrowCounterclockwise className="h-full w-full" aria-hidden="true" />
          </ImageEditorActionButton>
          <ImageEditorActionButton
            label="Redo"
            disabled={!canRedo}
            onClick={redoMaskCanvas}
          >
            <ArrowClockwise className="h-full w-full" aria-hidden="true" />
          </ImageEditorActionButton>
        </div>
        <div className="flex items-center space-x-2">
          <ImageEditorActionButton
            label="Clear"
            showLabel
            onClick={() => { clearMaskCanvas(); }}
          >
            <TrashFill className="h-full w-full" aria-hidden="true" />
          </ImageEditorActionButton>
        </div>
      </div>
      <BigImageContainer
        widthRatio={dimensions?.width ?? 1}
        heightRatio={dimensions?.height ?? 1}
      >
        <canvas
          className="w-full"
          ref={setEditorCanvas}
          width={dimensions?.width ?? 1}
          height={dimensions?.height ?? 1}
          onMouseDown={onEditorMouseDown}
        >
        </canvas>
      </BigImageContainer>
      <div className="py-2 lg:pb-0 flex space-x-2 justify-between">
        <div className="flex space-x-2">
          <ImageEditorActionButton
            label="Brush"
            selected={penType === "brush"}
            onClick={() => setPenType("brush")}
          >
            <BrushFill className="h-full w-full" aria-hidden="true" />
          </ImageEditorActionButton>
          <ImageEditorActionButton
            label="Eraser"
            selected={penType === "eraser"}
            onClick={() => setPenType("eraser")}
          >
            <EraserFill className="h-full w-full" aria-hidden="true" />
          </ImageEditorActionButton>
        </div>
        <div className="flex items-center space-x-2">
          <div className="border-2 rounded-full p-0.5"></div>
          <input
            type="range"
            className="appearance-none w-full h-2 bg-gray-200 shadow-sm rounded-full"
            min={1}
            max={100}
            value={penSize}
            onChange={(e) => { setPenSize(e.target.valueAsNumber); }}
          />
          <div className="border-2 rounded-full p-1.5"></div>
        </div>
      </div>
      <div className="mt-4">
        <RadioGroup value={currentImageMaskType} onChange={setCurrentImageMaskType}>
          <RadioGroup.Label className="text-base font-medium text-gray-900">Mask type</RadioGroup.Label>

          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            {IMAGE_MASK_TYPES.map((maskType) => (
              <RadioGroup.Option
                key={maskType.value}
                value={maskType.value}
                className={({ checked, active }) => clsx(
                  "relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none flex-1",
                  checked ? "border-transparent" : "border-gray-300",
                  active ? "border-indigo-500 ring-2 ring-indigo-500" : "",
                )}
              >
                {({ checked, active }) => (
                  <>
                    <span className="flex flex-1">
                      <span className="flex flex-col">
                        <RadioGroup.Label as="span" className="block text-sm font-medium text-gray-900">
                          {maskType.title}
                        </RadioGroup.Label>
                        <RadioGroup.Description as="span" className="mt-1 flex items-center text-sm text-gray-500">
                          {maskType.description}
                        </RadioGroup.Description>
                      </span>
                    </span>
                    <CheckCircleIcon
                      className={clsx("h-5 w-5 text-indigo-600", checked ? "" : "invisible")}
                      aria-hidden="true"
                    />
                    <span
                      className={clsx(
                        active ? "border" : "border-2",
                        checked ? "border-indigo-500" : "border-transparent",
                        "pointer-events-none absolute -inset-px rounded-lg",
                      )}
                      aria-hidden="true"
                    />
                  </>
                )}
              </RadioGroup.Option>
            ))}
          </div>
        </RadioGroup>
      </div>
    </div>
  );
};

type ImageEditorActionButtonProps = React.PropsWithChildren<{
  label?: string,
  disabled?: boolean,
  showLabel?: boolean,
  selected?: boolean,
  onClick?: () => void,
}>;

const ImageEditorActionButton: React.FC<ImageEditorActionButtonProps> = (props) => {
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

interface Position {
  x: number,
  y: number,
}

interface Dimensions {
  width: number,
  height: number,
}

function getEventCanvasPosition(
  canvas: HTMLCanvasElement,
  event: React.MouseEvent | MouseEvent,
): Position {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function getDimensions(image: HTMLImageElement | null): Dimensions | null {
  if (image == null) {
    return null;
  }

  return {
    width: image.width,
    height: image.height,
  };
}

interface UseCreateCanvasOptions {
  image?: File | Blob | null,
  dimensions?: Dimensions,
}

interface UseCreateCanvas {
  canvas: HTMLCanvasElement | null,
  dimensions: Dimensions,
}

function useCreateCanvas(options: UseCreateCanvasOptions): UseCreateCanvas {
  const { image, dimensions } = options;

  const canvas = useRef(document.createElement("canvas"));

  const { imageEl, loading } = useLoadImage(image ?? null);

  const [loadedCanvas, setLoadedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [currentDimensions, setCurrentDimensions] = useState<Dimensions>({
    width: 1,
    height: 1,
  });

  useEffect(() => {
    const newDimensions = dimensions ?? getDimensions(imageEl) ?? { width: 1, height: 1 };
    canvas.current.width = newDimensions.width;
    canvas.current.height = newDimensions.height;

    setCurrentDimensions(newDimensions);

    const ctx = canvas.current.getContext("2d");
    if (ctx == null) {
      console.warn("Failed to get canvas context");
      return;
    }

    if (imageEl != null) {
      ctx.drawImage(imageEl, 0, 0, newDimensions.width, newDimensions.height);
    }

    if (loading) {
      setLoadedCanvas(null);
    } else {
      setLoadedCanvas(canvas.current);
    }
  }, [imageEl, loading, dimensions]);

  return {
    canvas: loadedCanvas,
    dimensions: currentDimensions,
  };
}

interface UseLoadImage {
  imageEl: HTMLImageElement | null,
  loading: boolean,
}

function useLoadImage(image: File | Blob | null): UseLoadImage {
  const [state, setState] = useState<UseLoadImage>({
    imageEl: null,
    loading: true,
  });

  useEffect(() => {
    if (image == null) {
      setState({
        imageEl: null,
        loading: false,
      });
      return undefined;
    }

    const objectUrl = URL.createObjectURL(image);
    const newImageEl = new Image();
    newImageEl.src = objectUrl;
    newImageEl.onload = () => {
      setState({
        imageEl: newImageEl,
        loading: false,
      });
    };

    return () => { URL.revokeObjectURL(objectUrl); };
  }, [image]);

  return state;
}

interface MaskHistory {
  images: (string | null)[],
  index: number,
}

interface UseMaskImageHistory {
  pushHistory: (_newImage: string | null) => void,
  undoHistory: () => string | null,
  redoHistory: () => string | null,
  canUndo: boolean,
  canRedo: boolean,
}

interface UseMaskImageHistoryOptions {
  initialImage: string | null,
  maxImages: number,
}

function useMaskImageHistory(opts: UseMaskImageHistoryOptions): UseMaskImageHistory {
  const [maskHistory, setMaskHistory] = useState<MaskHistory>({
    images: [opts.initialImage],
    index: 0,
  });

  const pushHistory = useCallback((newImage: string | null) => {
    setMaskHistory((currentHistory) => {
      const currentImages = currentHistory.images.slice(0, currentHistory.index + 1);
      const updatedImages = [...currentImages, newImage];
      const images = updatedImages.slice(-opts.maxImages);
      return {
        images,
        index: updatedImages.length - 1,
      };
    });
  }, [opts.maxImages]);

  const canUndo = maskHistory.index > 0;
  const canRedo = maskHistory.index < maskHistory.images.length - 1;

  const undoHistory = useCallback(() => {
    if (!canUndo) {
      throw new Error("Called `undoHistory` but `canUndo` is false");
    }

    const prevState = maskHistory.images[maskHistory.index - 1];

    setMaskHistory(({ images, index }) => ({
      images,
      index: index - 1,
    }));

    return prevState;
  }, [maskHistory, canUndo]);

  const redoHistory = useCallback(() => {
    if (!canRedo) {
      throw new Error("Called `undoHistory` but `canUndo` is false");
    }

    const nextState = maskHistory.images[maskHistory.index + 1];

    setMaskHistory(({ images, index }) => ({
      images,
      index: index + 1,
    }));

    return nextState;
  }, [maskHistory, canRedo]);

  return {
    pushHistory,
    undoHistory,
    redoHistory,
    canUndo,
    canRedo,
  };
}
