import { Dialog, Transition } from "@headlessui/react";
import React, {
  Fragment, useCallback, useEffect, useState,
} from "react";
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

  const [dimensions, setDimensions] = useState({ width: 1, height: 1 });
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null);
  const [imageMaskEl, setImageMaskEl] = useState<HTMLImageElement | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [maskCanvas] = useState<HTMLCanvasElement>(() => document.createElement("canvas"));

  const [penSize] = useState(10);
  const [cursorPos, setCursorPos] = useState<Position | null>(null);
  const [mousePos, setMousePos] = useState<Position | null>(null);
  const [isPainting, setIsPainting] = useState(false);

  useEffect(() => {
    maskCanvas.width = dimensions.width;
    maskCanvas.height = dimensions.height;

    if (imageMaskEl == null) {
      return;
    }

    setTimeout(() => {
      const maskCtx = maskCanvas.getContext("2d");
      maskCtx?.drawImage(imageMaskEl, 0, 0, maskCanvas.width, maskCanvas.height);
    }, 0);
  }, [imageMaskEl, maskCanvas, dimensions]);

  useEffect(() => {
    const maskCtx = maskCanvas.getContext("2d");
    if (maskCtx == null) {
      return;
    }

    if (mousePos == null) {
      return;
    }

    if (isPainting) {
      maskCtx.save();

      maskCtx.fillStyle = "black";

      maskCtx.beginPath();
      maskCtx.arc(mousePos.x, mousePos.y, penSize, 0, 2 * Math.PI);
      maskCtx.fill();

      maskCtx.restore();
    }
  }, [maskCanvas, mousePos, isPainting, penSize]);

  useEffect(() => {
    if (image == null) {
      return undefined;
    }

    const objectUrl = URL.createObjectURL(image);
    const newImageEl = new Image();
    newImageEl.src = objectUrl;
    newImageEl.onload = () => {
      setImageEl(newImageEl);
      setDimensions({ width: newImageEl.width, height: newImageEl.height });
    };

    return () => { URL.revokeObjectURL(objectUrl); };
  }, [image, maskCanvas]);

  useEffect(() => {
    if (imageMask == null) {
      return undefined;
    }

    const objectUrl = URL.createObjectURL(imageMask);
    const newImageMaskEl = new Image();
    newImageMaskEl.src = objectUrl;
    newImageMaskEl.onload = () => {
      setImageMaskEl(newImageMaskEl);
    };

    return () => { URL.revokeObjectURL(objectUrl); };
  }, [imageMask, maskCanvas]);

  useEffect(() => {
    maskCanvas.width = dimensions.width;
    maskCanvas.height = dimensions.height;
  }, [maskCanvas, dimensions]);

  useEffect(() => {
    if (canvas == null || imageEl == null) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (ctx == null) {
      return;
    }

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);
    ctx.drawImage(imageEl, 0, 0, dimensions.width, dimensions.height);

    if (cursorPos != null) {
      ctx.save();

      ctx.strokeStyle = "black";
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(cursorPos.x, cursorPos.y, penSize, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fill();

      ctx.restore();
    }

    ctx.save();

    ctx.globalAlpha = 0.7;
    ctx.drawImage(maskCanvas, 0, 0);

    ctx.restore();
  }, [canvas, imageEl, dimensions, cursorPos, mousePos, penSize, maskCanvas]);

  const documentOnMouseEnter = useCallback((e: MouseEvent) => {
    if (canvas == null) {
      return;
    }

    const pos = getEventCanvasPosition(canvas, e);
    setCursorPos(pos);
    setMousePos(pos);
  }, [canvas]);

  const documentOnMouseMove = useCallback((e: MouseEvent) => {
    if (canvas == null) {
      return;
    }

    // eslint-disable-next-line no-bitwise
    if ((e.buttons & 1) !== 1) {
      setIsPainting(false);
    }

    const pos = getEventCanvasPosition(canvas, e);
    setCursorPos(pos);
    setMousePos(pos);
  }, [canvas]);

  const documentOnMouseOut = useCallback(() => {
    if (canvas == null) {
      return;
    }

    // setIsPainting(false);
    setCursorPos(null);
    setMousePos(null);
  }, [canvas]);

  useEffect(() => {
    document.body.addEventListener("mouseover", documentOnMouseEnter);
    document.body.addEventListener("mousemove", documentOnMouseMove);
    document.body.addEventListener("mouseout", documentOnMouseOut);

    return () => {
      document.body.removeEventListener("mouseover", documentOnMouseEnter);
      document.body.removeEventListener("mousemove", documentOnMouseMove);
      document.body.removeEventListener("mouseout", documentOnMouseMove);
    };
  });

  const onSaveClick = useCallback(() => {
    maskCanvas.toBlob((blob) => {
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
          ref={setCanvas}
          width={dimensions.width}
          height={dimensions.height}
          onMouseDown={() => setIsPainting(true)}
        >
        </canvas>
      </BigImageContainer>
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

interface Position {
  x: number,
  y: number,
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
