"use client";

import type { WaterSystemData } from "@/lib/spatialData";
import { normalizeTopicSpatialData, type TopicSpatialData } from "@/lib/topicSpatialData";
import type { SpatialFeature } from "@/types";

export type TemporaryMapData = {
  features: SpatialFeature[];
  waterSystem: WaterSystemData;
  topicSpatial: TopicSpatialData;
};

export const TEMPORARY_MAP_DATA_MESSAGE = "hongtang-temporary-map-data";
const TEMPORARY_MAP_DATA_REQUEST = "hongtang-temporary-map-data-request";
const TEMPORARY_MAP_DATA_CHANNEL = "hongtang-temporary-map-editor";

type TemporaryMapDataEnvelope = {
  type: typeof TEMPORARY_MAP_DATA_MESSAGE;
  payload: TemporaryMapData;
  sourceId: string;
};

let currentTemporaryMapData: TemporaryMapData | undefined;
const listeners = new Set<(data: TemporaryMapData | undefined) => void>();

function isTemporaryMapData(value: unknown): value is TemporaryMapData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<TemporaryMapData>;
  return Array.isArray(candidate.features)
    && Boolean(candidate.waterSystem)
    && Array.isArray(candidate.waterSystem?.nodes)
    && Array.isArray(candidate.waterSystem?.lines)
    && Array.isArray(candidate.waterSystem?.zones)
    && Boolean(candidate.topicSpatial)
    && Array.isArray(candidate.topicSpatial?.layers)
    && Array.isArray(candidate.topicSpatial?.features);
}

function normalizeTemporaryMapData(data: TemporaryMapData): TemporaryMapData {
  return { ...data, topicSpatial: normalizeTopicSpatialData(data.topicSpatial) };
}

function notify(data: TemporaryMapData | undefined) {
  currentTemporaryMapData = data ? normalizeTemporaryMapData(data) : undefined;
  listeners.forEach((listener) => listener(currentTemporaryMapData));
}

export function getTemporaryMapData() {
  return currentTemporaryMapData;
}

export function subscribeTemporaryMapData(listener: (data: TemporaryMapData | undefined) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function installTemporaryMapDataReceiver() {
  if (typeof window === "undefined") return () => undefined;
  const receiveWindowMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type === TEMPORARY_MAP_DATA_REQUEST && currentTemporaryMapData && event.source) {
      (event.source as Window).postMessage({
        type: TEMPORARY_MAP_DATA_MESSAGE,
        payload: structuredClone(currentTemporaryMapData),
        sourceId: "temporary-data-owner",
      } satisfies TemporaryMapDataEnvelope, window.location.origin);
      return;
    }
    const envelope = event.data as Partial<TemporaryMapDataEnvelope>;
    if (envelope.type === TEMPORARY_MAP_DATA_MESSAGE && isTemporaryMapData(envelope.payload)) {
      notify(structuredClone(envelope.payload));
    }
  };
  const channel = "BroadcastChannel" in window ? new BroadcastChannel(TEMPORARY_MAP_DATA_CHANNEL) : undefined;
  const receiveBroadcast = (event: MessageEvent) => {
    const envelope = event.data as Partial<TemporaryMapDataEnvelope>;
    if (envelope.type === TEMPORARY_MAP_DATA_MESSAGE && isTemporaryMapData(envelope.payload)) {
      notify(structuredClone(envelope.payload));
    }
  };
  window.addEventListener("message", receiveWindowMessage);
  channel?.addEventListener("message", receiveBroadcast);
  return () => {
    window.removeEventListener("message", receiveWindowMessage);
    channel?.removeEventListener("message", receiveBroadcast);
    channel?.close();
  };
}

export function publishTemporaryMapData(data: TemporaryMapData, sourceId: string) {
  if (typeof window === "undefined") return;
  const envelope: TemporaryMapDataEnvelope = {
    type: TEMPORARY_MAP_DATA_MESSAGE,
    payload: structuredClone(data),
    sourceId,
  };
  notify(envelope.payload);
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage(envelope, window.location.origin);
  }
  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(TEMPORARY_MAP_DATA_CHANNEL);
    channel.postMessage(envelope);
    channel.close();
  }
}

export function requestTemporaryMapDataFromOpener() {
  if (typeof window === "undefined" || !window.opener || window.opener.closed) return;
  window.opener.postMessage({ type: TEMPORARY_MAP_DATA_REQUEST }, window.location.origin);
}

export function clearTemporaryMapData() {
  notify(undefined);
}
