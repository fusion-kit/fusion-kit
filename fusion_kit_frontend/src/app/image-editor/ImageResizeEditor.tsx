import { RadioGroup } from "@headlessui/react";
import { CheckCircleIcon } from "@heroicons/react/20/solid";
import { clsx } from "clsx";
import React, {
  useCallback,
  useEffect, useMemo, useState,
} from "react";
import { unreachable } from "../../utils";
import { NumberInput } from "../inputs";
import { ImageEditorProps } from "./DreamImageEditorPanel";
import {
  Dimensions, getEventCanvasPosition, Position,
} from "./hooks";

type ResizeType = "crop" | "resize";

const RESIZE_TYPES = [
  {
    value: "crop",
    title: "Crop",
  },
  {
    value: "resize",
    title: "Squash/stretch",
  },
] as const;

export const ImageResizeEditor: React.FC<ImageEditorProps> = (props) => {
  const {
    dimensions, imageCanvas,
  } = props;

  const [previewCanvas, setPreviewCanvas] = useState<HTMLCanvasElement | null>(null);
  const [resizeDimensions, setResizeDimensions] = useState(dimensions ?? { width: 1, height: 1 });
  const [resizeType, setResizeType] = useState<ResizeType>("crop");
  const [cropOffset, setCropOffset] = useState<Position>({ x: 0, y: 0 });

  const [mousePos, setMousePos] = useState<Position | null>(null);
  const [moveStart, setMoveStart] = useState<Position | null>(null);

  const onDocumentMouseEnter = useCallback((e: MouseEvent) => {
    if (previewCanvas == null) {
      return;
    }

    const pos = getEventCanvasPosition(previewCanvas, e);
    setMousePos(pos);
  }, [previewCanvas]);

  const onDocumentMouseMove = useCallback((e: MouseEvent) => {
    if (previewCanvas == null) {
      return;
    }

    // eslint-disable-next-line no-bitwise
    if ((e.buttons & 1) !== 1 && moveStart != null) {
      setCropOffset(getNewCropOffset({
        imageDimensions: dimensions ?? { width: 1, height: 1 },
        currentOffset: cropOffset,
        resizeDimensions,
        moveStart,
        moveEnd: mousePos,
      }));
      setMoveStart(null);
    }

    const pos = getEventCanvasPosition(previewCanvas, e);
    setMousePos(pos);
  }, [cropOffset, dimensions, mousePos, moveStart, previewCanvas, resizeDimensions]);

  const onDocumentMouseOut = useCallback(() => {
    if (previewCanvas == null) {
      return;
    }

    setMousePos(null);
  }, [previewCanvas]);

  const onCropMouseDown: React.MouseEventHandler = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();

    if (previewCanvas == null || resizeType !== "crop") {
      return;
    }

    const pos = getEventCanvasPosition(previewCanvas, e);
    setMoveStart(pos);
  }, [previewCanvas, resizeType]);

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

  const previewDimensions = useMemo(() => {
    switch (resizeType) {
      case "crop":
        return dimensions ?? { width: 1, height: 1 };
      case "resize":
        return resizeDimensions;
      default:
        return unreachable(resizeType);
    }
  }, [resizeType, dimensions, resizeDimensions]);

  useEffect(() => {
    if (dimensions != null) {
      setResizeDimensions(dimensions);
    }
  }, [dimensions]);

  useEffect(() => {
    const ctx = previewCanvas?.getContext("2d");

    if (previewCanvas == null || ctx == null) {
      return;
    }

    if (imageCanvas == null) {
      return;
    }

    ctx.clearRect(0, 0, previewDimensions.width, previewDimensions.height);
    ctx.drawImage(imageCanvas, 0, 0, previewDimensions.width, previewDimensions.height);

    if (resizeType === "crop") {
      ctx.save();

      const newCropOffset = getNewCropOffset({
        imageDimensions: dimensions ?? { width: 1, height: 1 },
        currentOffset: cropOffset,
        resizeDimensions,
        moveStart,
        moveEnd: mousePos,
      });

      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.strokeStyle = "rgba(55, 55, 256, 0.7)";
      ctx.lineWidth = 20;
      ctx.fillRect(0, 0, previewDimensions.width, previewDimensions.height);
      ctx.strokeRect(
        newCropOffset.x,
        newCropOffset.y,
        resizeDimensions.width,
        resizeDimensions.height,
      );
      ctx.clearRect(
        newCropOffset.x,
        newCropOffset.y,
        resizeDimensions.width,
        resizeDimensions.height,
      );

      ctx.globalCompositeOperation = "destination-atop";
      ctx.drawImage(imageCanvas, 0, 0, previewDimensions.width, previewDimensions.height);

      ctx.globalCompositeOperation = "source-over";

      ctx.restore();
    }
  }, [
    previewCanvas, imageCanvas, previewDimensions, resizeType,
    resizeDimensions, cropOffset, dimensions, moveStart, mousePos,
  ]);

  const setWidth = useCallback((newWidth: number) => {
    setResizeDimensions(({ height }) => ({ width: newWidth, height }));
  }, []);

  const setHeight = useCallback((newHeight: number) => {
    setResizeDimensions(({ width }) => ({ width, height: newHeight }));
  }, []);

  return (
    <div>
      <div className="my-3">
        <p className="text-gray-500 text-sm">Strech, squish, or crop an image before dreaming. Stable Diffusion works best with square 512&times;512 images.</p>
      </div>
      <div className="flex space-x-0 sm:space-x-4 flex-col-reverse sm:flex-row">
        <canvas
          className="min-w-0 min-h-0 w-full max-h-36 object-contain flex-1"
          ref={setPreviewCanvas}
          width={previewDimensions.width}
          height={previewDimensions.height}
          onMouseDown={onCropMouseDown}
        >
        </canvas>
        <div className="space-y-2 flex-none">
          <div>
            <NumberInput
              label="Width"
              value={resizeDimensions.width}
              onChange={setWidth}
            />
          </div>
          <div>
            <NumberInput
              label="Height"
              value={resizeDimensions.height}
              onChange={setHeight}
            />
          </div>
          <RadioGroup value={resizeType} onChange={setResizeType}>
            <RadioGroup.Label className="text-base font-medium text-gray-900">Resize method</RadioGroup.Label>

            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              {RESIZE_TYPES.map((resizeType) => (
                <RadioGroup.Option
                  key={resizeType.value}
                  value={resizeType.value}
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
                            {resizeType.title}
                          </RadioGroup.Label>
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
    </div>
  );
};

interface CropOffsetOptions {
  imageDimensions: Dimensions,
  currentOffset: Position,
  resizeDimensions: Dimensions,
  moveStart: Position | null,
  moveEnd: Position | null,
}

function getNewCropOffset(options: CropOffsetOptions) {
  const {
    currentOffset, moveStart, moveEnd, imageDimensions, resizeDimensions,
  } = options;

  if (moveStart == null || moveEnd == null) {
    return currentOffset;
  }

  const delta = {
    x: moveEnd.x - moveStart.x,
    y: moveEnd.y - moveStart.y,
  };

  const targetOffset = {
    x: currentOffset.x + delta.x,
    y: currentOffset.y + delta.y,
  };

  if (targetOffset.x + resizeDimensions.width > imageDimensions.width) {
    targetOffset.x = imageDimensions.width - resizeDimensions.width;
  }
  if (targetOffset.y + resizeDimensions.height > imageDimensions.height) {
    targetOffset.y = imageDimensions.height - resizeDimensions.height;
  }
  if (targetOffset.x < 0) {
    targetOffset.x = 0;
  }
  if (targetOffset.y < 0) {
    targetOffset.y = 0;
  }

  return targetOffset;
}
