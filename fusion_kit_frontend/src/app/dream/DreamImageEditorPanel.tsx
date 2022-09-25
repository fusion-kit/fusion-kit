import { Dialog, Transition } from "@headlessui/react";
import clsx from "clsx";
import React, {
  Fragment, useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import { BrushFill, EraserFill } from "react-bootstrap-icons";
import { unreachable } from "../../utils";
import { BigImageContainer } from "./components";

interface DreamImageEditorPanelProps {
  open: boolean,
  image: File | Blob | null,
  imageMask: File | Blob | null,
  onClose: () => void,
  onSaveImage: () => void,
  onSaveMask: (_newMask: Blob) => void,
}

export const DreamImageEditorPanel: React.FC<DreamImageEditorPanelProps> = (props) => {
  const {
    open, onClose, image, imageMask, onSaveImage, onSaveMask,
  } = props;

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
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
                <Dialog.Title className="text-lg font-medium leading-6 text-gray-900">
                  Edit base image
                </Dialog.Title>
                <DreamImageEditor
                  image={image}
                  imageMask={imageMask}
                  onSaveImage={onSaveImage}
                  onSaveMask={onSaveMask}
                  onClose={onClose}
                />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

type PenType = "brush" | "eraser";

interface DreamImageEditorProps {
  image: File | Blob | null,
  imageMask: File | Blob | null,
  onSaveImage: () => void,
  onSaveMask: (_newMask: Blob) => void,
  onClose: () => void,
}

const DreamImageEditor: React.FC<DreamImageEditorProps> = (props) => {
  const {
    image, imageMask, onSaveImage: _, onSaveMask, onClose,
  } = props;

  const imageEl = useLoadImage(image);
  const imageMaskEl = useLoadImage(imageMask);
  const [editorCanvas, setEditorCanvas] = useState<HTMLCanvasElement | null>(null);
  const [maskCanvas, setMaskCanvas] = useState<HTMLCanvasElement | null>(null);
  const dimensions = useMemo(() => (
    getDimensions(imageEl) ?? { width: 1, height: 1 }
  ), [imageEl]);

  const [penSize, setPenSize] = useState(20);
  const [penType, setPenType] = useState<PenType>("brush");
  const [cursorPos, setCursorPos] = useState<Position | null>(null);
  const [mousePos, setMousePos] = useState<Position | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const [watermark, setWatermark] = useState(0);

  const lastPaintPoint = useRef<Position | null>();

  // Initialize mask canvas by drawing mask image
  useEffect(() => {
    if (imageMaskEl == null || maskCanvas == null) {
      return;
    }

    const maskCtx = maskCanvas.getContext("2d");
    maskCtx?.drawImage(imageMaskEl, 0, 0);
  }, [imageMaskEl, maskCanvas]);

  // Paint on the mask canvas while the user is holding down the mouse button
  useEffect(() => {
    const maskCtx = maskCanvas?.getContext("2d");
    if (maskCtx == null || mousePos == null) {
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

      setWatermark((watermark) => watermark + 1);
      lastPaintPoint.current = mousePos;
    } else {
      lastPaintPoint.current = null;
    }
  }, [maskCanvas, mousePos, isPainting, penSize, penType]);

  useEffect(() => {
    const ctx = editorCanvas?.getContext("2d");

    if (ctx == null || imageEl == null) {
      return;
    }

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    ctx.drawImage(imageEl, 0, 0, dimensions.width, dimensions.height);

    if (maskCanvas != null) {
      ctx.save();

      ctx.globalAlpha = 0.7;
      ctx.drawImage(maskCanvas, 0, 0);

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
  }, [editorCanvas, imageEl, dimensions, cursorPos, mousePos, penSize, maskCanvas, watermark]);

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

  const onSaveClick = useCallback(() => {
    maskCanvas?.toBlob((blob) => {
      if (blob == null) {
        console.warn("Failed to create blob");
        return;
      }

      onSaveMask(blob);
      onClose();
    });
  }, [onSaveMask, onClose, maskCanvas]);

  return (
    <div>
      <BigImageContainer widthRatio={dimensions.width} heightRatio={dimensions.height}>
        <canvas
          className="w-full"
          ref={setEditorCanvas}
          width={dimensions.width}
          height={dimensions.height}
          onMouseDown={onEditorMouseDown}
        >
        </canvas>
        <canvas
          className="hidden"
          ref={setMaskCanvas}
          width={dimensions.width}
          height={dimensions.height}
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
    </div>
  );
};

type ImageEditorActionButtonProps = React.PropsWithChildren<{
  label: string,
  selected?: boolean,
  onClick?: () => void,
}>;

const ImageEditorActionButton: React.FC<ImageEditorActionButtonProps> = (props) => {
  const { selected = false, onClick } = props;
  return (
    <button
      type="button"
      title={props.label}
      onClick={onClick}
      className={clsx(
        "flex h-8 w-8 p-1.5 items-center justify-center rounded-full",
        selected
          ? "bg-gray-400 text-white border-2 border-gray-400 hover:border-gray-600 hover:bg-gray-600 focus:outline-none focus:border-blue-600"
          : "text-gray-400 border-2 border-gray-400 hover:text-gray-600 hover:border-gray-600 focus:outline-none focus:border-blue-600 focus:text-blue-600",
      )}
    >
      {props.children}
      <span className="sr-only">{props.label}</span>
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

function useLoadImage(image: File | Blob | null): HTMLImageElement | null {
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (image == null) {
      return undefined;
    }

    const objectUrl = URL.createObjectURL(image);
    const newImageEl = new Image();
    newImageEl.src = objectUrl;
    newImageEl.onload = () => {
      setImageEl(newImageEl);
    };

    return () => { URL.revokeObjectURL(objectUrl); };
  }, [image]);

  return imageEl;
}
