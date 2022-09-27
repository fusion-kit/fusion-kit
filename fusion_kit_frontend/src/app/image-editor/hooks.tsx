import React, {
  useCallback, useEffect, useRef, useState,
} from "react";

export interface Position {
  x: number,
  y: number,
}

export interface Dimensions {
  width: number,
  height: number,
}

export function getEventCanvasPosition(
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

export function getEventCanvasTouchPosition(
  canvas: HTMLCanvasElement,
  event: React.TouchEvent | TouchEvent,
): Position | null {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const touch = event.touches.item(0);

  if (touch == null) {
    return null;
  }

  return {
    x: (touch.clientX - rect.left) * scaleX,
    y: (touch.clientY - rect.top) * scaleY,
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

export function useCreateCanvas(options: UseCreateCanvasOptions): UseCreateCanvas {
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

export function useMaskImageHistory(opts: UseMaskImageHistoryOptions): UseMaskImageHistory {
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
