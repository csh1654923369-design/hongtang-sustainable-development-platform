"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface MapView {
  scale: number;
  x: number;
  y: number;
}

const INITIAL_VIEW: MapView = { scale: 1, x: 0, y: 0 };
const MIN_SCALE = 1;
const MAX_SCALE = 5;
const MAX_EDGE_SLACK = 96;
const MIN_VISIBLE_EDGE = 120;

function clampView(
  view: MapView,
  frameWidth: number,
  frameHeight: number,
  containerWidth: number,
  containerHeight: number,
  frameLeft: number,
  frameTop: number,
): MapView {
  const clampAxis = (value: number, frameSize: number, containerSize: number, offset: number) => {
    const scaledSize = frameSize * view.scale;
    const edgeSlack = Math.min(MAX_EDGE_SLACK, containerSize * 0.12);
    if (scaledSize < containerSize) {
      const minimumVisible = Math.min(MIN_VISIBLE_EDGE, scaledSize * 0.35, containerSize * 0.25);
      const minimum = minimumVisible - offset - scaledSize;
      const maximum = containerSize - minimumVisible - offset;
      return Math.min(maximum, Math.max(minimum, value));
    }
    const minimum = containerSize - offset - scaledSize - edgeSlack;
    const maximum = -offset + edgeSlack;
    return Math.min(maximum, Math.max(minimum, value));
  };
  return {
    scale: view.scale,
    x: clampAxis(view.x, frameWidth, containerWidth, frameLeft),
    y: clampAxis(view.y, frameHeight, containerHeight, frameTop),
  };
}

/**
 * Wheel-zoom + drag-pan for the flat 2D village maps.
 * Attach `containerRef` to the overflow-hidden stage and `frameRef` +
 * `frameStyle` to the inner frame that holds the basemap image and overlays.
 * All math is done in frame coordinates, so letterboxed frames work too.
 */
export function useMapZoom() {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<MapView>(INITIAL_VIEW);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const viewRef = useRef<MapView>(INITIAL_VIEW);
  const transitionTimerRef = useRef<number | undefined>(undefined);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; baseX: number; baseY: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  const applyView = useCallback((next: MapView | ((previous: MapView) => MapView)) => {
    setView((previous) => {
      const resolved = typeof next === "function" ? next(previous) : next;
      viewRef.current = resolved;
      return resolved;
    });
  }, []);

  const stopTransition = useCallback(() => {
    if (transitionTimerRef.current !== undefined) window.clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = undefined;
    setIsTransitioning(false);
  }, []);

  const startTransition = useCallback(() => {
    if (transitionTimerRef.current !== undefined) window.clearTimeout(transitionTimerRef.current);
    setIsTransitioning(true);
    transitionTimerRef.current = window.setTimeout(() => {
      transitionTimerRef.current = undefined;
      setIsTransitioning(false);
    }, 460);
  }, []);

  useEffect(() => () => {
    if (transitionTimerRef.current !== undefined) window.clearTimeout(transitionTimerRef.current);
  }, []);

  const reset = useCallback(() => {
    startTransition();
    applyView(INITIAL_VIEW);
  }, [applyView, startTransition]);

  const focusAt = useCallback((xPercent: number, yPercent: number, preferredScale = 2.35) => {
    const container = containerRef.current;
    const frame = frameRef.current;
    if (!container || !frame) return;
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, preferredScale));
    const targetX = frame.offsetWidth * xPercent / 100;
    const targetY = frame.offsetHeight * yPercent / 100;
    const desiredX = container.clientWidth / 2 - frame.offsetLeft - targetX * scale;
    const desiredY = container.clientHeight / 2 - frame.offsetTop - targetY * scale;
    startTransition();
    applyView(clampView(
      { scale, x: desiredX, y: desiredY },
      frame.offsetWidth,
      frame.offsetHeight,
      container.clientWidth,
      container.clientHeight,
      frame.offsetLeft,
      frame.offsetTop,
    ));
  }, [applyView, startTransition]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      stopTransition();
      const frame = frameRef.current;
      if (!frame) return;
      const rect = el.getBoundingClientRect();
      // cursor position relative to the frame's untransformed layout position
      const cx = event.clientX - rect.left - frame.offsetLeft;
      const cy = event.clientY - rect.top - frame.offsetTop;
      const fw = frame.offsetWidth;
      const fh = frame.offsetHeight;
      applyView((previous) => {
        const factor = Math.exp(-event.deltaY * 0.0016);
        const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, previous.scale * factor));
        if (scale === previous.scale) return previous;
        const ratio = scale / previous.scale;
        return clampView(
          { scale, x: cx - (cx - previous.x) * ratio, y: cy - (cy - previous.y) * ratio },
          fw,
          fh,
          el.clientWidth,
          el.clientHeight,
          frame.offsetLeft,
          frame.offsetTop,
        );
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyView, stopTransition]);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !event.isPrimary) return;
    const el = containerRef.current;
    const current = viewRef.current;
    if (!el) return;
    stopTransition();
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, baseX: current.x, baseY: current.y, moved: false };
    el.setPointerCapture(event.pointerId);
  }, [stopTransition]);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const frame = frameRef.current;
    if (!drag || !frame || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    applyView((previous) =>
      clampView(
        { scale: previous.scale, x: drag.baseX + dx, y: drag.baseY + dy },
        frame.offsetWidth,
        frame.offsetHeight,
        containerRef.current?.clientWidth ?? frame.offsetWidth,
        containerRef.current?.clientHeight ?? frame.offsetHeight,
        frame.offsetLeft,
        frame.offsetTop,
      ),
    );
  }, [applyView]);

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.moved) suppressClickRef.current = true;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  const onClickCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.stopPropagation();
      event.preventDefault();
    }
  }, []);

  const onDoubleClick = useCallback(() => reset(), [reset]);

  const zoomed = view.scale > 1.01;
  const viewChanged = zoomed || Math.abs(view.x) > 0.5 || Math.abs(view.y) > 0.5;
  const frameStyle: React.CSSProperties = {
    transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
    transformOrigin: "0 0",
    transition: isTransitioning ? "transform 420ms cubic-bezier(.2,.75,.25,1)" : undefined,
  };

  return {
    containerRef,
    frameRef,
    frameStyle,
    zoomed,
    viewChanged,
    scale: view.scale,
    isTransitioning,
    reset,
    focusAt,
    panHandlers: { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag, onClickCapture, onDoubleClick },
  };
}
