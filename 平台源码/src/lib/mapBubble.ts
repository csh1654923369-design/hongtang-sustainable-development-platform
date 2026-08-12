export type MapScreenAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
};

export type MapBubbleLayout = {
  side: "left" | "right";
  left: number;
  top: number;
  width: number;
  height: number;
  arrowY: number;
};

export function isMapScreenAnchor(value: unknown): value is MapScreenAnchor {
  if (!value || typeof value !== "object") return false;
  const anchor = value as Partial<MapScreenAnchor>;
  return anchor.visible === true
    && Number.isFinite(anchor.x)
    && Number.isFinite(anchor.y)
    && Number.isFinite(anchor.width)
    && Number.isFinite(anchor.height);
}

export function computeMapBubbleLayout(anchor?: MapScreenAnchor): MapBubbleLayout | undefined {
  if (!anchor?.visible) return undefined;
  const margin = 12;
  const gap = 22;
  const width = Math.min(380, anchor.width - margin * 2);
  const height = Math.min(560, Math.max(180, anchor.height - margin * 2));
  if (width < 180 || height < 120) return undefined;

  const side = anchor.x + gap + width <= anchor.width - margin ? "right" : "left";
  const desiredLeft = side === "right"
    ? anchor.x + gap
    : anchor.x - gap - width;
  const left = Math.max(margin, Math.min(desiredLeft, anchor.width - width - margin));
  const desiredTop = anchor.y - 72;
  const top = Math.max(margin, Math.min(desiredTop, anchor.height - height - margin));
  const arrowY = Math.max(22, Math.min(anchor.y - top, height - 22));

  return { side, left, top, width, height, arrowY };
}
