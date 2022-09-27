import { RadioGroup } from "@headlessui/react";
import { CheckCircleIcon } from "@heroicons/react/20/solid";
import { clsx } from "clsx";
import React, {
  useCallback, useEffect, useRef, useState,
} from "react";
import {
  ArrowCounterclockwise, ArrowClockwise, TrashFill, BrushFill, EraserFill,
} from "react-bootstrap-icons";
import { DreamBaseImageMaskType } from "../../generated/graphql";
import { unreachable } from "../../utils";
import { BigImageContainer } from "../dream/components";
import { ImageEditorActionButton, ImageEditorProps } from "./DreamImageEditorPanel";
import {
  Position, getEventCanvasPosition, useMaskImageHistory,
} from "./hooks";

type PenType = "brush" | "eraser";

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

export const ImageMaskEditor: React.FC<ImageEditorProps> = (props) => {
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
