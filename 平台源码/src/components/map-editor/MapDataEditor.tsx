"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Crosshair,
  Database,
  Droplets,
  Eye,
  EyeOff,
  Factory,
  Flower2,
  History,
  Layers3,
  MapPin,
  MousePointer2,
  PanelRight,
  Pentagon,
  Plus,
  Redo2,
  Route,
  Save,
  Search,
  Trash2,
  TriangleAlert,
  Undo2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { gcj02ToWgs84, loadAmap, wgs84ToGcj02, type AmapMapInstance, type AmapNamespace } from "@/lib/amap";
import { buildEditorTopicGroups, type EditorDataKind, type EditorLayerGroup } from "@/lib/editorLayerCatalog";
import { fetchPlatformDataset } from "@/lib/platformData";
import type { WaterSystemData } from "@/lib/spatialData";
import {
  getTemporaryMapData,
  installTemporaryMapDataReceiver,
  publishTemporaryMapData,
  requestTemporaryMapDataFromOpener,
  subscribeTemporaryMapData,
  type TemporaryMapData,
} from "@/lib/temporaryMapEdits";
import {
  findTopicLayer,
  topicFeatureCenter,
  topicFeatureGeometryType,
  topicGeometryLabel,
  type TopicCoordinate,
  type TopicGeometryType,
  type TopicSpatialData,
  type TopicSpatialFeature,
} from "@/lib/topicSpatialData";
import { mapFeatureLabels } from "@/lib/utils";
import { villageTopicById, type VillageTopicId } from "@/lib/villageTopics";
import { MapFeatureType, type SpatialFeature } from "@/types";
import {
  actionStages,
  evidenceStatuses,
  resolveHumanSettlementProfile,
  settlementScales,
  topicForFeatureType,
  type ActionStageId,
  type EvidenceStatusId,
  type HumanSettlementProfile,
  type SettlementScaleId,
} from "@/lib/humanSettlement";

type EditorSelection = { kind: EditorDataKind; id: string };
type EditorTool = "select" | "add-point" | "draw-line" | "draw-polygon";
type EditorPoint = { x: number; y: number; longitude: number; latitude: number };
type EditorRuntime = { AMap: AmapNamespace; map: AmapMapInstance };
type DrawTarget = { kind: EditorDataKind; layerId: string; topicId: VillageTopicId; geometryType: TopicGeometryType };

const HONGTANG_CENTER: TopicCoordinate = [99.907084, 24.636574];
const HISTORY_LIMIT = 5;
const topicIcons = { garden: Flower2, tea: Factory, water: Droplets, safety: TriangleAlert, history: History } as const;
const featureIcons: Partial<Record<MapFeatureType, typeof Flower2>> = {
  [MapFeatureType.Garden]: Flower2,
  [MapFeatureType.TeaGarden]: Factory,
  [MapFeatureType.TeaFactory]: Factory,
  [MapFeatureType.WaterFacility]: Droplets,
  [MapFeatureType.SafetyRisk]: TriangleAlert,
  [MapFeatureType.VillageMemory]: History,
  [MapFeatureType.Culture]: History,
};

function today() { return new Date().toISOString().slice(0, 10); }
function makeId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function cloneData(data: TemporaryMapData): TemporaryMapData { return structuredClone(data); }
function selectionKey(selection?: EditorSelection) { return selection ? `${selection.kind}:${selection.id}` : ""; }
function averageCoordinate(coordinates: TopicCoordinate[]) {
  if (!coordinates.length) return HONGTANG_CENTER;
  const total = coordinates.reduce<TopicCoordinate>((sum, coordinate) => [sum[0] + coordinate[0], sum[1] + coordinate[1]], [0, 0]);
  return [total[0] / coordinates.length, total[1] / coordinates.length] as TopicCoordinate;
}

function editorKindLabel(kind: EditorDataKind) {
  if (kind === "water-line") return "水系统线要素";
  if (kind === "water-zone") return "水系统面要素";
  if (kind === "water-node") return "水系统点要素";
  if (kind === "topic-spatial") return "专题空间要素";
  return "已有地点要素";
}

function featureTopicId(type: MapFeatureType): VillageTopicId | undefined {
  if (type === MapFeatureType.Garden) return "garden";
  if (type === MapFeatureType.TeaGarden || type === MapFeatureType.TeaFactory) return "tea";
  if (type === MapFeatureType.WaterFacility) return "water";
  if (type === MapFeatureType.SafetyRisk) return "safety";
  if (type === MapFeatureType.VillageMemory || type === MapFeatureType.Culture) return "history";
  return undefined;
}

function geometryIcon(type: TopicGeometryType, size = 15) {
  if (type === "point") return <MapPin size={size} />;
  if (type === "line") return <Route size={size} />;
  return <Pentagon size={size} />;
}

function defaultPointFeature(layer: EditorLayerGroup, coordinate: TopicCoordinate): SpatialFeature {
  const featureType = layer.featureType ?? villageTopicById[layer.topicId].featureTypes[0] ?? MapFeatureType.Garden;
  return {
    id: makeId("temporary-point"), isDemo: true, title: `新${layer.title}`, featureType,
    status: "临时编辑", location: "红塘村", description: "请补充说明。",
    longitude: coordinate[0], latitude: coordinate[1], mapX: 0, mapY: 0,
    updatedAt: today(), goalId: `topic-${layer.topicId}`, publicParticipation: false,
    submittedByMe: false, geometry: { type: "Point", coordinates: coordinate }, imageLabel: layer.title,
    humanSettlement: { scale: "site", evidenceStatus: "pending", actionStage: "verify", steward: "待共同确认" },
  };
}

function defaultTopicFeature(layer: EditorLayerGroup, coordinates: TopicCoordinate[]): TopicSpatialFeature {
  const definition = layer.topicLayer;
  const geometry = layer.geometryType === "point"
    ? { type: "Point" as const, coordinates: coordinates[0] }
    : layer.geometryType === "line"
      ? { type: "LineString" as const, coordinates }
      : { type: "Polygon" as const, coordinates };
  return {
    id: makeId(`temporary-${layer.geometryType}`), layerId: layer.id, topicId: layer.topicId,
    title: `新${layer.title}`, status: "临时编辑", location: "红塘村", description: "请补充说明。",
    updatedAt: today(), isDemo: true, geometry,
    properties: Object.fromEntries((definition?.fields ?? []).map((field) => [field.key, field.editor === "number" ? 0 : ""])),
    humanSettlement: { scale: "site", evidenceStatus: "pending", actionStage: "verify", steward: "待共同确认" },
  };
}

export function MapDataEditor() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapShellRef = useRef<HTMLDivElement>(null);
  const [runtime, setRuntime] = useState<EditorRuntime>();
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [sourceData, setSourceData] = useState<TemporaryMapData>();
  const [dataStatus, setDataStatus] = useState<"loading" | "ready" | "error">("loading");
  const [draft, setDraft] = useState<TemporaryMapData>();
  const [selection, setSelection] = useState<EditorSelection>();
  const [activeTopicId, setActiveTopicId] = useState<VillageTopicId>("garden");
  const [expandedTopics, setExpandedTopics] = useState<Set<VillageTopicId>>(() => new Set(["garden"]));
  const [selectedLayerId, setSelectedLayerId] = useState("garden-sites");
  const [expandedLayerIds, setExpandedLayerIds] = useState<Set<string>>(() => new Set(["garden-sites"]));
  const [hiddenLayerIds, setHiddenLayerIds] = useState<Set<string>>(() => new Set());
  const [tool, setTool] = useState<EditorTool>("select");
  const [drawTarget, setDrawTarget] = useState<DrawTarget>();
  const [drawing, setDrawing] = useState<TopicCoordinate[]>([]);
  const [search, setSearch] = useState("");
  const [projectedPoints, setProjectedPoints] = useState<Record<string, EditorPoint>>({});
  const [projectedLines, setProjectedLines] = useState<Record<string, EditorPoint[]>>({});
  const [projectedPolygons, setProjectedPolygons] = useState<Record<string, EditorPoint[]>>({});
  const [notice, setNotice] = useState("本页修改只在当前浏览器会话中生效，不会写入 Supabase。刷新平台后恢复原始数据。");
  const [dirty, setDirty] = useState(false);
  const [undoStack, setUndoStack] = useState<TemporaryMapData[]>([]);
  const [redoStack, setRedoStack] = useState<TemporaryMapData[]>([]);
  const [mobilePanel, setMobilePanel] = useState<"none" | "layers" | "properties">("none");
  const sourceIdRef = useRef(makeId("editor"));
  const draftRef = useRef<TemporaryMapData | undefined>(undefined);
  const historyGroupRef = useRef<string | undefined>(undefined);
  const dragRef = useRef<{ selection: EditorSelection; pointIndex?: number } | undefined>(undefined);
  const deepLinkAppliedRef = useRef(false);

  const clearHistory = useCallback(() => {
    setUndoStack([]); setRedoStack([]); historyGroupRef.current = undefined;
  }, []);

  const installDraft = useCallback((next: TemporaryMapData) => {
    const source = cloneData(next);
    const current = cloneData(next);
    draftRef.current = current;
    setSourceData(source); setDraft(current); setDataStatus("ready"); setDirty(false); clearHistory();
  }, [clearHistory]);

  useEffect(() => {
    let active = true;
    const uninstallReceiver = installTemporaryMapDataReceiver();
    const unsubscribe = subscribeTemporaryMapData((temporary) => {
      if (!active || !temporary) return;
      const next = cloneData(temporary);
      installDraft(next);
      setNotice("已接入当前平台窗口中的临时草稿。");
    });
    const existing = getTemporaryMapData();
    Promise.all([
      fetchPlatformDataset<{ features: SpatialFeature[] }>("hongtang-real-map-features", "/data/hongtang-real-map-features.json"),
      fetchPlatformDataset<WaterSystemData>("hongtang-water-system", "/data/hongtang-water-system.json"),
      fetchPlatformDataset<TopicSpatialData>("hongtang-topic-spatial-demo", "/data/hongtang-topic-spatial-demo.json"),
    ]).then(([features, waterSystem, topicSpatial]) => {
      if (!active || getTemporaryMapData()) return;
      const next = { features: features.features, waterSystem, topicSpatial };
      installDraft(next);
    }).catch(() => { if (active) { setDataStatus("error"); setNotice("读取平台数据失败，请重试。"); } });
    if (existing) {
      queueMicrotask(() => {
        if (!active) return;
        const next = cloneData(existing);
        installDraft(next);
        setNotice("已接入当前平台窗口中的临时草稿。");
      });
    } else requestTemporaryMapDataFromOpener();
    return () => { active = false; unsubscribe(); uninstallReceiver(); };
  }, [installDraft]);

  useEffect(() => {
    let active = true;
    let map: AmapMapInstance | undefined;
    loadAmap().then((AMap) => {
      if (!active || !mapContainerRef.current) return;
      map = new AMap.Map(mapContainerRef.current, {
        center: wgs84ToGcj02(...HONGTANG_CENTER), zoom: 15.2, zooms: [10, 20], viewMode: "2D",
        mapStyle: "amap://styles/normal", resizeEnable: true, rotateEnable: false, pitchEnable: false, showLabel: true,
      });
      setRuntime({ AMap, map }); setMapStatus("ready");
    }).catch(() => setMapStatus("fallback"));
    return () => { active = false; map?.destroy(); };
  }, []);

  const topicGroups = useMemo(() => draft ? buildEditorTopicGroups(draft.features, draft.waterSystem, draft.topicSpatial) : [], [draft]);
  const selectedLayer = useMemo(() => topicGroups.flatMap((topic) => topic.layers).find((layer) => layer.id === selectedLayerId), [selectedLayerId, topicGroups]);
  const layerById = useMemo(() => new Map(topicGroups.flatMap((topic) => topic.layers).map((layer) => [layer.id, layer])), [topicGroups]);
  const selectionLayer = useMemo(() => {
    if (!selection || !draft) return undefined;
    if (selection.kind === "base-point") {
      const feature = draft.features.find((item) => item.id === selection.id);
      return topicGroups.flatMap((topic) => topic.layers).find((layer) => layer.dataKind === "base-point" && feature && layer.featureType === feature.featureType);
    }
    if (selection.kind === "water-node") return layerById.get("water-nodes");
    if (selection.kind === "water-line") return layerById.get("water-lines");
    if (selection.kind === "water-zone") return layerById.get("water-zones");
    const feature = draft.topicSpatial.features.find((item) => item.id === selection.id);
    return feature ? layerById.get(feature.layerId) : undefined;
  }, [draft, layerById, selection, topicGroups]);

  const activeSelectionKey = selectionKey(selection);
  const selectedFeature = selection?.kind === "base-point" ? draft?.features.find((item) => item.id === selection.id) : undefined;
  const selectedWaterNode = selection?.kind === "water-node" ? draft?.waterSystem.nodes.find((item) => item.id === selection.id) : undefined;
  const selectedWaterLine = selection?.kind === "water-line" ? draft?.waterSystem.lines.find((item) => item.id === selection.id) : undefined;
  const selectedWaterZone = selection?.kind === "water-zone" ? draft?.waterSystem.zones.find((item) => item.id === selection.id) : undefined;
  const selectedTopicFeature = selection?.kind === "topic-spatial" ? draft?.topicSpatial.features.find((item) => item.id === selection.id) : undefined;
  const selectedTitle = selectedFeature?.title ?? selectedWaterNode?.title ?? selectedWaterLine?.title ?? selectedWaterZone?.title ?? selectedTopicFeature?.title;
  const selectedGeometryType: TopicGeometryType | undefined = selectedFeature || selectedWaterNode ? "point" : selectedWaterLine ? "line" : selectedWaterZone ? "polygon" : selectedTopicFeature ? topicFeatureGeometryType(selectedTopicFeature) : undefined;
  const selectedStatus = selectedFeature?.status ?? selectedWaterNode?.status ?? selectedWaterLine?.status ?? selectedWaterZone?.status ?? selectedTopicFeature?.status ?? "";
  const selectedUpdatedAt = selectedFeature?.updatedAt ?? selectedTopicFeature?.updatedAt ?? draft?.waterSystem.updatedAt;
  const selectedTopicId = selectedFeature ? topicForFeatureType(selectedFeature.featureType) : selectedTopicFeature?.topicId ?? (selectedWaterNode || selectedWaterLine || selectedWaterZone ? "water" : undefined);
  const selectedHumanSettlement = selectedFeature?.humanSettlement ?? selectedWaterNode?.humanSettlement ?? selectedWaterLine?.humanSettlement ?? selectedWaterZone?.humanSettlement ?? selectedTopicFeature?.humanSettlement;
  const resolvedSelectedProfile = selection ? resolveHumanSettlementProfile({ topicId: selectedTopicId, featureType: selectedFeature?.featureType, status: selectedStatus, updatedAt: selectedUpdatedAt, existing: selectedHumanSettlement }) : undefined;

  useEffect(() => { draftRef.current = draft; }, [draft]);

  const updateDraft = useCallback((updater: (current: TemporaryMapData) => TemporaryMapData, historyGroup?: string) => {
    const current = draftRef.current;
    if (!current) return;
    if (!historyGroup || historyGroupRef.current !== historyGroup) {
      const snapshot = cloneData(current);
      setUndoStack((stack) => [...stack, snapshot].slice(-HISTORY_LIMIT));
      setRedoStack([]);
      historyGroupRef.current = historyGroup;
    }
    const next = updater(cloneData(current));
    draftRef.current = next;
    setDraft(next); setDirty(true);
  }, []);

  const finishHistoryGroup = () => { historyGroupRef.current = undefined; };

  const applyHistoricalDraft = (next: TemporaryMapData) => {
    const restored = cloneData(next);
    draftRef.current = restored; setDraft(restored);
    setDirty(sourceData ? JSON.stringify(restored) !== JSON.stringify(sourceData) : true);
    cancelDrawing(); historyGroupRef.current = undefined;
  };

  const undoDraft = () => {
    const current = draftRef.current;
    const previous = undoStack.at(-1);
    if (!current || !previous) return;
    setUndoStack((stack) => stack.slice(0, -1));
    setRedoStack((stack) => [...stack, cloneData(current)].slice(-HISTORY_LIMIT));
    applyHistoricalDraft(previous);
    setNotice(`已撤回一步，可继续撤回${Math.max(undoStack.length - 1, 0)}步。`);
  };

  const redoDraft = () => {
    const current = draftRef.current;
    const next = redoStack.at(-1);
    if (!current || !next) return;
    setRedoStack((stack) => stack.slice(0, -1));
    setUndoStack((stack) => [...stack, cloneData(current)].slice(-HISTORY_LIMIT));
    applyHistoricalDraft(next);
    setNotice(`已恢复一步，可继续恢复${Math.max(redoStack.length - 1, 0)}步。`);
  };

  const project = useCallback(() => {
    if (!runtime || !draft) return;
    const toPoint = ([longitude, latitude]: TopicCoordinate): EditorPoint => {
      const pixel = runtime.map.lngLatToContainer(wgs84ToGcj02(longitude, latitude));
      return { x: Math.round(pixel.getX()), y: Math.round(pixel.getY()), longitude, latitude };
    };
    const points: Record<string, EditorPoint> = {};
    draft.features.forEach((item) => { points[`base-point:${item.id}`] = toPoint([item.longitude, item.latitude]); });
    draft.waterSystem.nodes.forEach((item) => { points[`water-node:${item.id}`] = toPoint([item.longitude, item.latitude]); });
    draft.topicSpatial.features.forEach((item) => {
      if (item.geometry.type === "Point") points[`topic-spatial:${item.id}`] = toPoint(item.geometry.coordinates);
    });
    const lines: Record<string, EditorPoint[]> = {};
    draft.waterSystem.lines.forEach((item) => { lines[`water-line:${item.id}`] = item.path.map(toPoint); });
    draft.topicSpatial.features.forEach((item) => {
      if (item.geometry.type === "LineString") lines[`topic-spatial:${item.id}`] = item.geometry.coordinates.map(toPoint);
    });
    const polygons: Record<string, EditorPoint[]> = {};
    draft.waterSystem.zones.forEach((item) => { polygons[`water-zone:${item.id}`] = item.polygon.map(toPoint); });
    draft.topicSpatial.features.forEach((item) => {
      if (item.geometry.type === "Polygon") polygons[`topic-spatial:${item.id}`] = item.geometry.coordinates.map(toPoint);
    });
    setProjectedPoints(points); setProjectedLines(lines); setProjectedPolygons(polygons);
  }, [draft, runtime]);

  useEffect(() => {
    if (!runtime) return;
    let frame: number | undefined;
    const schedule = () => {
      if (frame !== undefined) return;
      frame = requestAnimationFrame(() => { frame = undefined; project(); });
    };
    schedule(); runtime.map.on("mapmove", schedule); runtime.map.on("zoomchange", schedule); window.addEventListener("resize", schedule);
    return () => { runtime.map.off("mapmove", schedule); runtime.map.off("zoomchange", schedule); window.removeEventListener("resize", schedule); if (frame !== undefined) cancelAnimationFrame(frame); };
  }, [project, runtime]);

  const itemMatchesSearch = (title: string, subtitle: string) => {
    const query = search.trim().toLowerCase();
    return !query || `${title} ${subtitle}`.toLowerCase().includes(query);
  };
  const layerVisible = (layerId?: string) => Boolean(layerId && !hiddenLayerIds.has(layerId));

  const selectLayer = (layer: EditorLayerGroup) => {
    setActiveTopicId(layer.topicId); setSelectedLayerId(layer.id);
    setExpandedTopics((current) => new Set(current).add(layer.topicId));
    setSelection(undefined); setTool("select"); setDrawing([]); setDrawTarget(undefined);
  };

  const selectAndFocus = (next: EditorSelection, layer?: EditorLayerGroup) => {
    setSelection(next); setTool("select"); setDrawing([]); setDrawTarget(undefined);
    setMobilePanel("properties");
    if (layer) {
      setActiveTopicId(layer.topicId); setSelectedLayerId(layer.id);
      setExpandedTopics((current) => new Set(current).add(layer.topicId));
      setExpandedLayerIds((current) => new Set(current).add(layer.id));
    }
    if (!runtime || !draft) return;
    let coordinate: TopicCoordinate | undefined;
    if (next.kind === "base-point") {
      const item = draft.features.find((feature) => feature.id === next.id);
      if (item) coordinate = [item.longitude, item.latitude];
    } else if (next.kind === "water-node") {
      const item = draft.waterSystem.nodes.find((node) => node.id === next.id);
      if (item) coordinate = [item.longitude, item.latitude];
    } else if (next.kind === "water-line") coordinate = averageCoordinate(draft.waterSystem.lines.find((item) => item.id === next.id)?.path ?? []);
    else if (next.kind === "water-zone") coordinate = averageCoordinate(draft.waterSystem.zones.find((item) => item.id === next.id)?.polygon ?? []);
    else {
      const item = draft.topicSpatial.features.find((feature) => feature.id === next.id);
      if (item) coordinate = topicFeatureCenter(item);
    }
    if (coordinate) runtime.map.setZoomAndCenter(Math.max(runtime.map.getZoom(), 17.1), wgs84ToGcj02(...coordinate), false, 220);
  };

  useEffect(() => {
    if (deepLinkAppliedRef.current || !draft || !topicGroups.length) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("feature");
      const kind = params.get("kind") as EditorDataKind | null;
      if (!id || !kind || !["base-point", "water-node", "water-line", "water-zone", "topic-spatial"].includes(kind)) {
        deepLinkAppliedRef.current = true;
        return;
      }
      let layer: EditorLayerGroup | undefined;
      if (kind === "base-point") {
        const feature = draft.features.find((item) => item.id === id);
        layer = topicGroups.flatMap((topic) => topic.layers).find((item) => item.dataKind === "base-point" && feature && item.featureType === feature.featureType);
      } else if (kind === "water-node") layer = layerById.get("water-nodes");
      else if (kind === "water-line") layer = layerById.get("water-lines");
      else if (kind === "water-zone") layer = layerById.get("water-zones");
      else {
        const feature = draft.topicSpatial.features.find((item) => item.id === id);
        if (feature) layer = layerById.get(feature.layerId);
      }
      deepLinkAppliedRef.current = true;
      if (layer) selectAndFocus({ kind, id }, layer);
    }, 0);
    return () => window.clearTimeout(timer);
    // selectAndFocus reads the current map and draft only when this one-time deep link is applied.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, layerById, runtime, topicGroups]);

  const coordinateFromPointer = (event: React.PointerEvent<HTMLElement>): TopicCoordinate | undefined => {
    if (!runtime || !mapShellRef.current) return undefined;
    const rect = mapShellRef.current.getBoundingClientRect();
    const gcj = runtime.map.containerToLngLat(new runtime.AMap.Pixel(event.clientX - rect.left, event.clientY - rect.top));
    return gcj02ToWgs84(gcj.getLng(), gcj.getLat());
  };

  const beginCreate = (layer: EditorLayerGroup) => {
    selectLayer(layer);
    setMobilePanel("none");
    const nextTool: EditorTool = layer.geometryType === "point" ? "add-point" : layer.geometryType === "line" ? "draw-line" : "draw-polygon";
    setDrawTarget({ kind: layer.dataKind, layerId: layer.id, topicId: layer.topicId, geometryType: layer.geometryType });
    setTool(nextTool); setDrawing([]);
  };

  const addPointToLayer = (layer: EditorLayerGroup, coordinate: TopicCoordinate) => {
    if (layer.dataKind === "base-point") {
      const feature = defaultPointFeature(layer, coordinate);
      updateDraft((next) => ({ ...next, features: [...next.features, feature] }));
      setSelection({ kind: "base-point", id: feature.id });
    } else if (layer.dataKind === "water-node") {
      const id = makeId("temporary-water-node");
      updateDraft((next) => ({ ...next, waterSystem: { ...next.waterSystem, nodes: [...next.waterSystem.nodes, {
        id, kind: "supply", system: "both", title: "新水系统节点", longitude: coordinate[0], latitude: coordinate[1], elevation: null,
        location: "红塘村", description: "请补充节点功能和上下游关系。", status: "临时编辑", functions: [], openQuestions: [],
      }] } }));
      setSelection({ kind: "water-node", id });
    } else if (layer.dataKind === "topic-spatial") {
      const feature = defaultTopicFeature(layer, [coordinate]);
      updateDraft((next) => ({ ...next, topicSpatial: { ...next.topicSpatial, features: [...next.topicSpatial.features, feature] } }));
      setSelection({ kind: "topic-spatial", id: feature.id });
    }
    setTool("select"); setDrawTarget(undefined); setDrawing([]);
  };

  const handleMapPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !draft || (event.target as HTMLElement).closest("button, input, select, textarea, a, .map-editor-tool-rail, .map-editor-tool-help")) return;
    const coordinate = coordinateFromPointer(event);
    if (!coordinate || tool === "select" || !drawTarget) return;
    const layer = layerById.get(drawTarget.layerId);
    if (!layer) return;
    if (tool === "add-point") addPointToLayer(layer, coordinate);
    else setDrawing((current) => [...current, coordinate]);
  };

  const finishDrawing = () => {
    if (!draft || !drawTarget) return;
    const layer = layerById.get(drawTarget.layerId);
    if (!layer) return;
    if (drawTarget.kind === "water-line" && drawing.length >= 2) {
      const id = makeId("temporary-water-line");
      updateDraft((next) => ({ ...next, waterSystem: { ...next.waterSystem, lines: [...next.waterSystem.lines, {
        id, kind: "supply-branch", system: "supply", title: "新供排水线路", path: drawing, dropMeters: 0,
        location: "红塘村", description: "请补充起点、终点、服务对象和维护关系。", status: "临时编辑",
      }] } }));
      setSelection({ kind: "water-line", id });
    } else if (drawTarget.kind === "water-zone" && drawing.length >= 3) {
      const id = makeId("temporary-water-zone");
      updateDraft((next) => ({ ...next, waterSystem: { ...next.waterSystem, zones: [...next.waterSystem.zones, {
        id, kind: "supply-zone", system: "supply", title: "新供水分区", polygon: drawing, supplyNodeId: "",
        location: "红塘村", description: "请补充水源、线路、使用对象和维护关系。", status: "临时编辑",
      }] } }));
      setSelection({ kind: "water-zone", id });
    } else if (drawTarget.kind === "topic-spatial" && ((drawTarget.geometryType === "line" && drawing.length >= 2) || (drawTarget.geometryType === "polygon" && drawing.length >= 3))) {
      const feature = defaultTopicFeature(layer, drawing);
      updateDraft((next) => ({ ...next, topicSpatial: { ...next.topicSpatial, features: [...next.topicSpatial.features, feature] } }));
      setSelection({ kind: "topic-spatial", id: feature.id });
    }
    setTool("select"); setDrawTarget(undefined); setDrawing([]);
  };

  const cancelDrawing = () => { setTool("select"); setDrawTarget(undefined); setDrawing([]); };

  const startDrag = (event: React.PointerEvent<HTMLElement>, next: EditorSelection, pointIndex?: number) => {
    if (tool !== "select") return;
    event.preventDefault(); event.stopPropagation();
    historyGroupRef.current = undefined;
    dragRef.current = { selection: next, pointIndex };
    event.currentTarget.setPointerCapture(event.pointerId); setSelection(next);
  };

  const moveDrag = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const coordinate = coordinateFromPointer(event);
    if (!coordinate) return;
    updateDraft((next) => {
      if (drag.selection.kind === "base-point") next.features = next.features.map((feature) => feature.id === drag.selection.id ? { ...feature, longitude: coordinate[0], latitude: coordinate[1], geometry: { type: "Point", coordinates: coordinate } } : feature);
      else if (drag.selection.kind === "water-node") next.waterSystem.nodes = next.waterSystem.nodes.map((node) => node.id === drag.selection.id ? { ...node, longitude: coordinate[0], latitude: coordinate[1] } : node);
      else if (drag.selection.kind === "water-line" && drag.pointIndex !== undefined) next.waterSystem.lines = next.waterSystem.lines.map((line) => line.id === drag.selection.id ? { ...line, path: line.path.map((point, index) => index === drag.pointIndex ? coordinate : point) } : line);
      else if (drag.selection.kind === "water-zone" && drag.pointIndex !== undefined) next.waterSystem.zones = next.waterSystem.zones.map((zone) => zone.id === drag.selection.id ? { ...zone, polygon: zone.polygon.map((point, index) => index === drag.pointIndex ? coordinate : point) } : zone);
      else if (drag.selection.kind === "topic-spatial") next.topicSpatial.features = next.topicSpatial.features.map((item) => {
        if (item.id !== drag.selection.id) return item;
        if (item.geometry.type === "Point") return { ...item, geometry: { ...item.geometry, coordinates: coordinate } };
        if (drag.pointIndex === undefined) return item;
        return { ...item, geometry: { ...item.geometry, coordinates: item.geometry.coordinates.map((point, index) => index === drag.pointIndex ? coordinate : point) } };
      });
      return next;
    }, `drag:${selectionKey(drag.selection)}`);
  };

  const endDrag = (event: React.PointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = undefined; finishHistoryGroup();
  };

  const updateCommonSelected = (patch: { title?: string; location?: string; status?: string; description?: string }) => {
    if (!selection) return;
    updateDraft((next) => {
      if (selection.kind === "base-point") next.features = next.features.map((item) => item.id === selection.id ? { ...item, ...patch } : item);
      if (selection.kind === "water-node") next.waterSystem.nodes = next.waterSystem.nodes.map((item) => item.id === selection.id ? { ...item, ...patch } : item);
      if (selection.kind === "water-line") next.waterSystem.lines = next.waterSystem.lines.map((item) => item.id === selection.id ? { ...item, ...patch } : item);
      if (selection.kind === "water-zone") next.waterSystem.zones = next.waterSystem.zones.map((item) => item.id === selection.id ? { ...item, ...patch } : item);
      if (selection.kind === "topic-spatial") next.topicSpatial.features = next.topicSpatial.features.map((item) => item.id === selection.id ? { ...item, ...patch } : item);
      return next;
    }, `field:${selectionKey(selection)}:${Object.keys(patch)[0]}`);
  };

  const updateSelectedHumanSettlement = (patch: Partial<HumanSettlementProfile>) => {
    if (!selection) return;
    updateDraft((next) => {
      const merge = (existing?: HumanSettlementProfile) => ({
        ...resolveHumanSettlementProfile({ topicId: selectedTopicId, featureType: selectedFeature?.featureType, status: selectedStatus, updatedAt: selectedUpdatedAt, existing }),
        ...patch,
      });
      if (selection.kind === "base-point") next.features = next.features.map((item) => item.id === selection.id ? { ...item, humanSettlement: merge(item.humanSettlement) } : item);
      if (selection.kind === "water-node") next.waterSystem.nodes = next.waterSystem.nodes.map((item) => item.id === selection.id ? { ...item, humanSettlement: merge(item.humanSettlement) } : item);
      if (selection.kind === "water-line") next.waterSystem.lines = next.waterSystem.lines.map((item) => item.id === selection.id ? { ...item, humanSettlement: merge(item.humanSettlement) } : item);
      if (selection.kind === "water-zone") next.waterSystem.zones = next.waterSystem.zones.map((item) => item.id === selection.id ? { ...item, humanSettlement: merge(item.humanSettlement) } : item);
      if (selection.kind === "topic-spatial") next.topicSpatial.features = next.topicSpatial.features.map((item) => item.id === selection.id ? { ...item, humanSettlement: merge(item.humanSettlement) } : item);
      return next;
    }, `field:${selectionKey(selection)}:human-settlement:${Object.keys(patch)[0]}`);
  };

  const changeSelectedTopicProperty = (key: string, value: string | number) => {
    if (!selectedTopicFeature) return;
    updateDraft((next) => {
      next.topicSpatial.features = next.topicSpatial.features.map((item) => item.id === selectedTopicFeature.id ? { ...item, properties: { ...item.properties, [key]: value } } : item);
      return next;
    }, `field:${selectionKey(selection)}:property:${key}`);
  };

  const deleteSelection = () => {
    if (!selection) return;
    updateDraft((next) => {
      if (selection.kind === "base-point") next.features = next.features.filter((item) => item.id !== selection.id);
      if (selection.kind === "water-node") next.waterSystem.nodes = next.waterSystem.nodes.filter((item) => item.id !== selection.id);
      if (selection.kind === "water-line") next.waterSystem.lines = next.waterSystem.lines.filter((item) => item.id !== selection.id);
      if (selection.kind === "water-zone") next.waterSystem.zones = next.waterSystem.zones.filter((item) => item.id !== selection.id);
      if (selection.kind === "topic-spatial") next.topicSpatial.features = next.topicSpatial.features.filter((item) => item.id !== selection.id);
      return next;
    });
    setSelection(undefined);
  };

  const applyToPlatform = () => {
    if (!draft) return;
    setDirty(false); setNotice("临时修改已发送到红塘平台；刷新页面后会恢复原始数据。");
    publishTemporaryMapData(draft, sourceIdRef.current);
  };

  useEffect(() => {
    if (!dirty) return;
    const protectUnsavedDraft = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protectUnsavedDraft);
    return () => window.removeEventListener("beforeunload", protectUnsavedDraft);
  }, [dirty]);


  const drawingPixels = drawing.map((coordinate) => {
    if (!runtime) return undefined;
    const pixel = runtime.map.lngLatToContainer(wgs84ToGcj02(...coordinate));
    return { x: pixel.getX(), y: pixel.getY() };
  }).filter(Boolean) as { x: number; y: number }[];

  const selectedVertexPoints = selectedGeometryType === "line" ? projectedLines[activeSelectionKey] : selectedGeometryType === "polygon" ? projectedPolygons[activeSelectionKey] : undefined;
  const selectedTopicLayer = selectedTopicFeature ? findTopicLayer(draft?.topicSpatial, selectedTopicFeature.layerId) : undefined;

  return (
    <main className="map-data-editor map-data-editor-v2" data-editor-dirty={dirty} data-map-status={mapStatus} data-data-status={dataStatus} data-active-topic={activeTopicId} data-mobile-panel={mobilePanel}>
      <header className="map-editor-header">
        <div className="map-editor-heading">
          <Link href="/" className="map-editor-back"><ArrowLeft size={18} />返回平台</Link>
          <div className="map-editor-title"><span><Layers3 size={21} /></span><div><h1>红塘地图数据编辑</h1><p>按专题与图层组织的临时空间数据工作台</p></div></div>
        </div>
        <div className="map-editor-header-actions">
          <div className="map-editor-history-actions" role="group" aria-label="编辑历史" data-history-limit={HISTORY_LIMIT} data-undo-depth={undoStack.length} data-redo-depth={redoStack.length}><button type="button" className="map-editor-history-button" onClick={undoDraft} disabled={!undoStack.length} aria-label="撤回" title={`撤回（最多${HISTORY_LIMIT}步）`}><Undo2 size={18} /></button><button type="button" className="map-editor-history-button" onClick={redoDraft} disabled={!redoStack.length} aria-label="恢复" title={`恢复（最多${HISTORY_LIMIT}步）`}><Redo2 size={18} /></button></div>
          <button type="button" className="primary" data-apply-temporary-edits onClick={applyToPlatform} disabled={!draft}><Save size={16} />应用到平台</button>
        </div>
      </header>
      <div className="map-editor-notice" role="status"><CircleDot size={15} /><span>{notice}</span></div>
      <section className="map-editor-workspace">
        {mobilePanel !== "none" ? <button type="button" className="map-editor-mobile-backdrop" aria-label="关闭面板" onClick={() => setMobilePanel("none")} /> : null}
        <nav className="map-editor-mobile-nav" aria-label="打开编辑面板">
          <button type="button" className={mobilePanel === "layers" ? "active" : ""} aria-expanded={mobilePanel === "layers"} onClick={() => setMobilePanel((current) => current === "layers" ? "none" : "layers")}><Layers3 size={18} />图层</button>
          <button type="button" className={mobilePanel === "properties" ? "active" : ""} aria-expanded={mobilePanel === "properties"} onClick={() => setMobilePanel((current) => current === "properties" ? "none" : "properties")}><PanelRight size={18} />属性</button>
        </nav>
        <aside className={`map-editor-sidebar${mobilePanel === "layers" ? " mobile-open" : ""}`} aria-label="专题图层目录">
          <div className="map-editor-pane-title"><div><Layers3 size={17} /><strong>图层</strong></div><div className="map-editor-pane-actions"><span>{dataStatus === "ready" ? `${topicGroups.reduce((sum, topic) => sum + topic.layers.length, 0)}层` : dataStatus === "error" ? "读取失败" : "载入中"}</span><button type="button" className="map-editor-mobile-panel-close" aria-label="关闭图层面板" onClick={() => setMobilePanel("none")}><X size={18} /></button></div></div>
          {dataStatus !== "ready" ? <div className="map-editor-data-status" role="status">
            <Layers3 size={26} aria-hidden="true" />
            <strong>{dataStatus === "error" ? "图层读取失败" : "正在读取图层"}</strong>
            <p>{dataStatus === "error" ? "请检查网络后重新读取。" : "正在整理专题、图层与要素，请稍候。"}</p>
            {dataStatus === "error" ? <button type="button" onClick={() => window.location.reload()}>重新读取</button> : null}
          </div> : null}
          <label className="map-editor-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索当前图层内的要素" /></label>
          <div className="map-editor-topic-tree">
            {topicGroups.map((topic) => {
              const TopicIcon = topicIcons[topic.id];
              const expanded = expandedTopics.has(topic.id);
              const itemCount = topic.layers.reduce((sum, layer) => sum + layer.items.length, 0);
              return <section key={topic.id} className={`map-editor-topic-group${activeTopicId === topic.id ? " active" : ""}`} data-topic-id={topic.id}>
                <button type="button" className="map-editor-topic-toggle" onClick={() => { setActiveTopicId(topic.id); setExpandedTopics((current) => { const next = new Set(current); if (next.has(topic.id)) next.delete(topic.id); else next.add(topic.id); return next; }); }}>
                  <span className="map-editor-topic-icon"><TopicIcon size={16} /></span><span><strong>{topic.title}</strong><small>{itemCount}个要素 · {topic.layers.length}个图层</small></span><ChevronDown size={15} className={expanded ? "open" : ""} />
                </button>
                {expanded ? <div className="map-editor-layer-tree">
                  <p className="map-editor-topic-question">{topic.question}</p>
                  {topic.layers.map((layer) => {
                    const layerOpen = expandedLayerIds.has(layer.id);
                    const visible = layerVisible(layer.id);
                    const filteredItems = layer.items.filter((item) => itemMatchesSearch(item.title, item.subtitle));
                    return <div className={`map-editor-layer-node${selectedLayerId === layer.id ? " selected" : ""}`} key={layer.id} data-layer-id={layer.id}>
                      <div className="map-editor-layer-row" style={{ "--layer-color": layer.color } as CSSProperties}>
                        <button type="button" className="map-editor-layer-visibility" onClick={() => setHiddenLayerIds((current) => { const next = new Set(current); if (next.has(layer.id)) next.delete(layer.id); else next.add(layer.id); return next; })} title={visible ? "隐藏图层" : "显示图层"}>{visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                        <button type="button" className="map-editor-layer-main" onClick={() => { selectLayer(layer); setExpandedLayerIds((current) => { const next = new Set(current); if (next.has(layer.id)) next.delete(layer.id); else next.add(layer.id); return next; }); }}>
                          <span>{geometryIcon(layer.geometryType)}</span><span><strong>{layer.title}</strong><small>{layer.shortDescription}</small></span><span className="map-editor-layer-count">{layer.items.length}</span><ChevronRight size={14} className={layerOpen ? "open" : ""} />
                        </button>
                        <button type="button" className="map-editor-layer-add" onClick={() => beginCreate(layer)} title={`在${layer.title}中新建${topicGeometryLabel(layer.geometryType)}`}><Plus size={15} /></button>
                      </div>
                      {layerOpen ? <div className="map-editor-layer-items">
                        {filteredItems.length ? filteredItems.map((item) => <button key={`${item.kind}:${item.id}`} type="button" className={activeSelectionKey === `${item.kind}:${item.id}` ? "active" : ""} onClick={() => selectAndFocus({ kind: item.kind, id: item.id }, layer)}><span>{geometryIcon(layer.geometryType, 13)}</span><span><strong>{item.title}</strong><small>{item.subtitle}</small></span></button>) : <p>该图层没有匹配的要素</p>}
                      </div> : null}
                    </div>;
                  })}
                </div> : null}
              </section>;
            })}
          </div>
          <div className="map-editor-catalog-note"><Database size={15} /><span><strong>数据说明</strong>已有资料与待调查线索分开标记；未经核实的内容不会自动当作村庄事实。</span></div>
        </aside>

        <nav className="map-editor-tool-rail" aria-label="地图编辑工具">
          <div className="map-editor-tool-rail-title">工具栏</div>
          <button type="button" className={tool === "select" ? "active" : ""} onClick={cancelDrawing} data-tooltip="选择与移动"><MousePointer2 size={19} /><span>选择</span></button>
          <div className="map-editor-tool-divider" />
          {selectedLayer ? <>
            <span className="map-editor-tool-context" style={{ "--layer-color": selectedLayer.color } as CSSProperties}>{geometryIcon(selectedLayer.geometryType, 17)}</span>
            <button type="button" className={tool !== "select" ? "active" : ""} onClick={() => beginCreate(selectedLayer)} data-tooltip={`新建${topicGeometryLabel(selectedLayer.geometryType)}`}><Plus size={19} /><span>新建</span></button>
          </> : null}
          {drawing.length ? <button type="button" className="confirm" onClick={finishDrawing} disabled={(tool === "draw-line" && drawing.length < 2) || (tool === "draw-polygon" && drawing.length < 3)} data-tooltip="完成绘制"><Check size={19} /><span>完成</span></button> : null}
          {tool !== "select" ? <button type="button" onClick={cancelDrawing} data-tooltip="取消绘制"><X size={19} /><span>取消</span></button> : null}
          <div className="map-editor-tool-spacer" />
          <button type="button" onClick={() => runtime?.map.setZoomAndCenter(15.2, wgs84ToGcj02(...HONGTANG_CENTER), false, 220)} data-tooltip="回到红塘"><Crosshair size={19} /><span>定位</span></button>
        </nav>

        <div className="map-editor-map-shell" ref={mapShellRef} onPointerDown={handleMapPointerDown}>
          <div ref={mapContainerRef} className="map-editor-map" aria-label="红塘村地图数据编辑区" />
          {tool !== "select" && selectedLayer ? <div className="map-editor-tool-help"><strong>{selectedLayer.title}</strong><span>{tool === "add-point" ? "在地图上单击放置新点" : `依次单击绘制${tool === "draw-line" ? "线路" : "范围"}，再点左侧工具栏的“完成”`}</span></div> : null}
          <svg className="map-editor-vector-layer" aria-label="专题线面要素">
            {Object.entries(projectedPolygons).map(([key, points]) => {
              const [kind, id] = key.split(":") as [EditorDataKind, string];
              const itemLayer = kind === "water-zone" ? layerById.get("water-zones") : draft?.topicSpatial.features.find((item) => item.id === id)?.layerId ? layerById.get(draft.topicSpatial.features.find((item) => item.id === id)!.layerId) : undefined;
              if (!itemLayer || !layerVisible(itemLayer.id)) return null;
              return <polygon key={key} points={points.map((point) => `${point.x},${point.y}`).join(" ")} className={activeSelectionKey === key ? "active" : ""} style={{ "--vector-color": itemLayer.color } as CSSProperties} onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); selectAndFocus({ kind, id }, itemLayer); }}><title>{itemLayer.title}</title></polygon>;
            })}
            {Object.entries(projectedLines).map(([key, points]) => {
              const [kind, id] = key.split(":") as [EditorDataKind, string];
              const topicItem = draft?.topicSpatial.features.find((item) => item.id === id);
              const itemLayer = kind === "water-line" ? layerById.get("water-lines") : topicItem ? layerById.get(topicItem.layerId) : undefined;
              if (!itemLayer || !layerVisible(itemLayer.id)) return null;
              return <polyline key={key} points={points.map((point) => `${point.x},${point.y}`).join(" ")} className={activeSelectionKey === key ? "active" : ""} style={{ "--vector-color": itemLayer.color } as CSSProperties} onPointerDown={(event) => { event.preventDefault(); event.stopPropagation(); selectAndFocus({ kind, id }, itemLayer); }}><title>{itemLayer.title}</title></polyline>;
            })}
            {drawingPixels.length ? (tool === "draw-polygon" ? <polygon className="drawing" points={drawingPixels.map((point) => `${point.x},${point.y}`).join(" ")} /> : <polyline className="drawing" points={drawingPixels.map((point) => `${point.x},${point.y}`).join(" ")} />) : null}
          </svg>
          <div className="map-editor-point-layer" aria-label="专题点要素">
            {Object.entries(projectedPoints).map(([key, point]) => {
              const [kind, id] = key.split(":") as [EditorDataKind, string];
              let itemLayer: EditorLayerGroup | undefined;
              let featureType: MapFeatureType | undefined;
              if (kind === "base-point") {
                const item = draft?.features.find((feature) => feature.id === id);
                featureType = item?.featureType;
                itemLayer = topicGroups.flatMap((topic) => topic.layers).find((layer) => layer.dataKind === "base-point" && layer.featureType === featureType);
              } else if (kind === "water-node") itemLayer = layerById.get("water-nodes");
              else {
                const item = draft?.topicSpatial.features.find((feature) => feature.id === id);
                itemLayer = item ? layerById.get(item.layerId) : undefined;
                featureType = itemLayer?.featureType;
              }
              if (!itemLayer || !layerVisible(itemLayer.id)) return null;
              const Icon = featureIcons[featureType ?? itemLayer.featureType ?? MapFeatureType.PublicService] ?? MapPin;
              return <button key={key} type="button" data-editor-feature-id={id} className={activeSelectionKey === key ? "active" : ""} style={{ left: point.x, top: point.y, "--editor-color": itemLayer.color } as CSSProperties} title={itemLayer.items.find((item) => item.id === id)?.title ?? itemLayer.title} onClick={(event) => { event.stopPropagation(); selectAndFocus({ kind, id }, itemLayer); }} onPointerDown={(event) => startDrag(event, { kind, id })} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}><Icon size={14} /></button>;
            })}
          </div>
          {selectedVertexPoints?.map((point, index) => <button key={`${activeSelectionKey}-${index}`} type="button" className="map-editor-vertex" style={{ left: point.x, top: point.y }} aria-label={`移动节点${index + 1}`} onPointerDown={(event) => selection && startDrag(event, selection, index)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} />)}
          {mapStatus === "loading" ? <div className="map-editor-map-status">正在载入底图…</div> : null}
          {mapStatus === "fallback" ? <div className="map-editor-map-status warning">底图暂不可用，请检查高德配置</div> : null}
        </div>

        <aside className={`map-editor-properties${mobilePanel === "properties" ? " mobile-open" : ""}`} aria-label="要素详情" onBlurCapture={finishHistoryGroup}>
          <button type="button" className="map-editor-mobile-panel-close map-editor-properties-close" aria-label="关闭属性面板" onClick={() => setMobilePanel("none")}><X size={18} /></button>
          {dataStatus !== "ready" ? <div className="map-editor-properties-empty"><Layers3 size={28} /><strong>{dataStatus === "error" ? "图层读取失败" : "正在读取图层"}</strong><p>{dataStatus === "error" ? "请在左侧点击“重新读取”。" : "数据就绪后即可查看和编辑要素属性。"}</p></div> : selection && draft && selectedTitle ? <>
            <div className="map-editor-properties-heading"><div><strong>{selectedTitle}</strong><span>{selectionLayer?.title ?? editorKindLabel(selection.kind)} · {selectedGeometryType ? topicGeometryLabel(selectedGeometryType) : ""}</span></div><button type="button" onClick={deleteSelection} title="删除要素"><Trash2 size={17} /></button></div>
            <div className="map-editor-properties-section"><h2>基本信息</h2>
              <label>名称<input value={selectedTitle} onChange={(event) => updateCommonSelected({ title: event.target.value })} /></label>
              <label>位置说明<input value={selectedFeature?.location ?? selectedWaterNode?.location ?? selectedWaterLine?.location ?? selectedWaterZone?.location ?? selectedTopicFeature?.location ?? ""} onChange={(event) => updateCommonSelected({ location: event.target.value })} /></label>
              <label>状态<input value={selectedFeature?.status ?? selectedWaterNode?.status ?? selectedWaterLine?.status ?? selectedWaterZone?.status ?? selectedTopicFeature?.status ?? ""} onChange={(event) => updateCommonSelected({ status: event.target.value })} /></label>
              <label>说明<textarea rows={4} value={selectedFeature?.description ?? selectedWaterNode?.description ?? selectedWaterLine?.description ?? selectedWaterZone?.description ?? selectedTopicFeature?.description ?? ""} onChange={(event) => updateCommonSelected({ description: event.target.value })} /></label>
            </div>
            {resolvedSelectedProfile ? <div className="map-editor-properties-section map-editor-human-settlement-section"><h2>核实、关系与行动</h2><p className="map-editor-field-hint">所有专题共用这些字段，2D、3D 和详情卡片会同步显示。</p>
              <div className="map-editor-coordinate-grid">
                <label>资料依据<select value={resolvedSelectedProfile.evidenceStatus} onChange={(event) => updateSelectedHumanSettlement({ evidenceStatus: event.target.value as EvidenceStatusId })}>{Object.entries(evidenceStatuses).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}</select></label>
                <label>观察尺度<select value={resolvedSelectedProfile.scale} onChange={(event) => updateSelectedHumanSettlement({ scale: event.target.value as SettlementScaleId })}>{Object.entries(settlementScales).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}</select></label>
              </div>
              <label>记录或核实日期<input type="date" value={resolvedSelectedProfile.observedAt ?? ""} onChange={(event) => updateSelectedHumanSettlement({ observedAt: event.target.value })} /></label>
              <label>依据说明<textarea rows={3} value={resolvedSelectedProfile.evidenceNote ?? ""} placeholder="例如：村民口述、现场照片、规划资料或踏勘记录" onChange={(event) => updateSelectedHumanSettlement({ evidenceNote: event.target.value })} /></label>
              <label>关联对象<textarea rows={2} value={resolvedSelectedProfile.relatedLabels?.join("、") ?? ""} placeholder="用顿号分隔，例如：水源、供水线路、使用家庭" onChange={(event) => updateSelectedHumanSettlement({ relatedLabels: event.target.value.split(/[、,，\n]/).map((item) => item.trim()).filter(Boolean) })} /></label>
              <div className="map-editor-coordinate-grid">
                <label>行动阶段<select value={resolvedSelectedProfile.actionStage} onChange={(event) => updateSelectedHumanSettlement({ actionStage: event.target.value as ActionStageId })}>{Object.entries(actionStages).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}</select></label>
                <label>维护或行动者<input value={resolvedSelectedProfile.steward ?? ""} placeholder="待共同确认" onChange={(event) => updateSelectedHumanSettlement({ steward: event.target.value })} /></label>
              </div>
              <label>下一步<textarea rows={3} value={resolvedSelectedProfile.nextAction ?? ""} placeholder="接下来需要核实、讨论、实施或复查什么？" onChange={(event) => updateSelectedHumanSettlement({ nextAction: event.target.value })} /></label>
            </div> : null}
            {selectedFeature ? <div className="map-editor-properties-section"><h2>地点字段</h2>
              <label>地点类型<select value={selectedFeature.featureType} onChange={(event) => updateDraft((next) => { next.features = next.features.map((item) => item.id === selectedFeature.id ? { ...item, featureType: event.target.value as MapFeatureType } : item); return next; })}>{villageTopicById[featureTopicId(selectedFeature.featureType) ?? activeTopicId].featureTypes.map((type) => <option key={type} value={type}>{mapFeatureLabels[type]}</option>)}</select></label>
              <div className="map-editor-coordinate-grid"><label>经度<input type="number" step="0.000001" value={selectedFeature.longitude} onChange={(event) => updateDraft((next) => { const longitude = Number(event.target.value); next.features = next.features.map((item) => item.id === selectedFeature.id ? { ...item, longitude, geometry: { type: "Point", coordinates: [longitude, item.latitude] } } : item); return next; }, `field:${selectionKey(selection)}:longitude`)} /></label><label>纬度<input type="number" step="0.000001" value={selectedFeature.latitude} onChange={(event) => updateDraft((next) => { const latitude = Number(event.target.value); next.features = next.features.map((item) => item.id === selectedFeature.id ? { ...item, latitude, geometry: { type: "Point", coordinates: [item.longitude, latitude] } } : item); return next; }, `field:${selectionKey(selection)}:latitude`)} /></label></div>
            </div> : null}
            {selectedTopicFeature && selectedTopicLayer ? <div className="map-editor-properties-section"><h2>{selectedTopicLayer.title}字段</h2><p className="map-editor-field-hint">这些字段只属于当前图层，不会出现在无关专题中。</p>
              {selectedTopicLayer.fields.map((field) => {
                const value = selectedTopicFeature.properties[field.key] ?? "";
                if (field.editor === "textarea") return <label key={field.key}>{field.label}<textarea rows={3} value={String(value)} placeholder={field.placeholder} onChange={(event) => changeSelectedTopicProperty(field.key, event.target.value)} /></label>;
                if (field.editor === "select") return <label key={field.key}>{field.label}<select value={String(value)} onChange={(event) => changeSelectedTopicProperty(field.key, event.target.value)}><option value="">请选择</option>{field.options?.map((option) => <option key={option}>{option}</option>)}</select></label>;
                return <label key={field.key}>{field.label}{field.unit ? <small>{field.unit}</small> : null}<input type={field.editor === "number" ? "number" : field.editor === "date" ? "date" : "text"} value={value === null ? "" : value} placeholder={field.placeholder} onChange={(event) => changeSelectedTopicProperty(field.key, field.editor === "number" ? Number(event.target.value) : event.target.value)} /></label>;
              })}
            </div> : null}
            {selectedWaterNode ? <div className="map-editor-properties-section"><h2>水节点关系</h2>
              <label>节点类型<select value={selectedWaterNode.kind} onChange={(event) => updateDraft((next) => { next.waterSystem.nodes = next.waterSystem.nodes.map((item) => item.id === selectedWaterNode.id ? { ...item, kind: event.target.value as typeof item.kind } : item); return next; })}><option value="source">水源</option><option value="storage">调蓄</option><option value="supply">供水</option><option value="treatment">处理</option></select></label>
              <label>系统<select value={selectedWaterNode.system} onChange={(event) => updateDraft((next) => { next.waterSystem.nodes = next.waterSystem.nodes.map((item) => item.id === selectedWaterNode.id ? { ...item, system: event.target.value as typeof item.system } : item); return next; })}><option value="supply">供水</option><option value="drainage">排水</option><option value="both">供排水</option></select></label>
            </div> : null}
            {selectedWaterLine ? <div className="map-editor-properties-section"><h2>线路关系</h2><label>线路类型<select value={selectedWaterLine.kind} onChange={(event) => updateDraft((next) => { next.waterSystem.lines = next.waterSystem.lines.map((item) => item.id === selectedWaterLine.id ? { ...item, kind: event.target.value as typeof item.kind } : item); return next; })}><option value="supply-main">供水主管</option><option value="supply-branch">供水支管</option><option value="main-drain">主排水沟</option><option value="branch-drain">支沟</option><option value="outlet">出流沟</option></select></label><p className="map-editor-field-hint">拖动地图上的节点可修改线路走向。</p></div> : null}
            {selectedWaterZone ? <div className="map-editor-properties-section"><h2>分区关系</h2><label>供水节点编号<input value={selectedWaterZone.supplyNodeId} onChange={(event) => updateDraft((next) => { next.waterSystem.zones = next.waterSystem.zones.map((item) => item.id === selectedWaterZone.id ? { ...item, supplyNodeId: event.target.value } : item); return next; }, `field:${selectionKey(selection)}:supplyNodeId`)} /></label><p className="map-editor-field-hint">拖动地图上的节点可修改片区边界。</p></div> : null}
          </> : selectedLayer ? <div className="map-editor-properties-empty layer-selected"><span style={{ "--layer-color": selectedLayer.color } as CSSProperties}>{geometryIcon(selectedLayer.geometryType, 26)}</span><strong>{selectedLayer.title}</strong><p>{selectedLayer.shortDescription}</p><dl><div><dt>专题</dt><dd>{villageTopicById[selectedLayer.topicId].title}</dd></div><div><dt>几何</dt><dd>{topicGeometryLabel(selectedLayer.geometryType)}</dd></div><div><dt>要素数</dt><dd>{selectedLayer.items.length}</dd></div></dl><button type="button" onClick={() => beginCreate(selectedLayer)}><Plus size={16} />新建{topicGeometryLabel(selectedLayer.geometryType)}</button></div> : <div className="map-editor-properties-empty"><MousePointer2 size={28} /><strong>先选择一个图层</strong><p>在左侧按“专题 → 图层 → 要素”查找内容；选择图层后，右侧会显示该图层的专属字段。</p></div>}
        </aside>
      </section>
    </main>
  );
}
