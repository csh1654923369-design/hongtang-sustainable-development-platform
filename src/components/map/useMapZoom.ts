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

function clampView(view: MapView, frameWidth: number, frameHeight: number): MapView {
  return {
    scale: view.scale,
    x: Math.min(0, Math.max(frameWidth * (1 - view.scale), view.x)),
    y: Math.min(0, Math.max(frameHeight * (1 - view.scale), view.y)),
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
  const viewRef = useRef<MapView>(INITIAL_VIEW);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; baseX: number; baseY: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  const applyView = useCallback((next: MapView | ((previous: MapView) => MapView)) => {
    setView((previous) => {
      const resolved = typeof next === "function" ? next(previous) : next;
      viewRef.current = resolved;
      return resolved;
    });
  }, []);

  const reset = useCallback(() => applyView(INITIAL_VIEW), [applyView]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
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
        );
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyView]);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const el = containerRef.current;
    const current = viewRef.current;
    if (!el || current.scale <= 1) return;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, baseX: current.x, baseY: current.y, moved: false };
    el.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const frame = frameRef.current;
    if (!drag || !frame || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    drag.moved = true;
    applyView((previous) =>
      clampView({ scale: previous.scale, x: drag.baseX + dx, y: drag.baseY + dy }, frame.offsetWidth, frame.offsetHeight),
    );
  }, [applyView]);

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.moved) suppressClickRef.current = true;
    dragRef.current = null;
  }, []);

  const onClickCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.stopPropagation();
      event.preventDefault();
    }
  }, []);

  const onDoubleClick = useCallback(() => applyView(INITIAL_VIEW), [applyView]);

  const zoomed = view.scale > 1.01;
  const frameStyle: React.CSSProperties = {
    transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
    transformOrigin: "0 0",
  };

  return {
    containerRef,
    frameRef,
    frameStyle,
    zoomed,
    scale: view.scale,
    reset,
    panHandlers: { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag, onClickCapture, onDoubleClick },
  };
}
