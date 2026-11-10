/**
 * Copyright (c) 2023-present Strata Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import useLocalStorage from "@/hooks/use-local-storage";

export const PEEK_MIN_WIDTH = 480;
export const PEEK_MAX_WIDTH = 1200;
export const PEEK_LIST_MIN_WIDTH = 320;
export const PEEK_DEFAULT_WIDTH = 720;
const PEEK_WIDTH_STORAGE_KEY = "work_item_peek_width";

export const clampPeekWidth = (width: number, viewportWidth: number) => {
  const availableWidth = Math.max(PEEK_MIN_WIDTH, viewportWidth - PEEK_LIST_MIN_WIDTH);
  return Math.min(Math.max(width, PEEK_MIN_WIDTH), Math.min(PEEK_MAX_WIDTH, availableWidth));
};

export const useResizablePeek = () => {
  const { storedValue, setValue } = useLocalStorage<number>(PEEK_WIDTH_STORAGE_KEY, PEEK_DEFAULT_WIDTH);
  const [width, setWidth] = useState(storedValue ?? PEEK_DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const initialMouseX = useRef(0);
  const initialWidth = useRef(width);
  const widthRef = useRef(width);

  const updateWidth = useCallback((nextWidth: number) => {
    const clampedWidth = clampPeekWidth(nextWidth, window.innerWidth);
    widthRef.current = clampedWidth;
    setWidth(clampedWidth);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    setValue(widthRef.current);
  }, [setValue]);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isResizing) return;
      updateWidth(initialWidth.current + initialMouseX.current - event.clientX);
    },
    [isResizing, updateWidth]
  );

  useEffect(() => {
    if (!isResizing) return;

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopResizing);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", stopResizing);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [handleMouseMove, isResizing, stopResizing]);

  useEffect(() => {
    const handleViewportResize = () => updateWidth(widthRef.current);
    window.addEventListener("resize", handleViewportResize);
    handleViewportResize();
    return () => window.removeEventListener("resize", handleViewportResize);
  }, [updateWidth]);

  const startResizing = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      initialMouseX.current = event.clientX;
      initialWidth.current = width;
      setIsResizing(true);
      event.preventDefault();
    },
    [width]
  );

  const handleResizeKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      const step = event.shiftKey ? 50 : 10;
      if (event.key === "ArrowLeft") updateWidth(widthRef.current + step);
      else if (event.key === "ArrowRight") updateWidth(widthRef.current - step);
      else if (event.key === "Home") updateWidth(PEEK_MIN_WIDTH);
      else if (event.key === "End") updateWidth(PEEK_MAX_WIDTH);
      else return;

      setValue(widthRef.current);
      event.preventDefault();
    },
    [setValue, updateWidth]
  );

  const resetWidth = useCallback(() => {
    updateWidth(window.innerWidth / 2);
    setValue(widthRef.current);
  }, [setValue, updateWidth]);

  return { width, isResizing, startResizing, handleResizeKeyDown, resetWidth };
};
