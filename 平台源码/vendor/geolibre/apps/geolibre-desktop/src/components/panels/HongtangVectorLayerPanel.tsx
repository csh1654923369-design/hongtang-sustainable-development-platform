import {
  excludeHiddenFieldsFromGeojson,
  redo,
  undo,
  useAppStore,
  type GeoLibreLayer,
} from "@geolibre/core";
import type { MapController } from "@geolibre/map";
import { canEditLayerGeometry } from "@geolibre/plugins";
import { Button, ScrollArea } from "@geolibre/ui";
import {
  Download,
  Eye,
  EyeOff,
  LocateFixed,
  PencilRuler,
  Redo2,
  TableProperties,
  Undo2,
} from "lucide-react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { LayerSwatchIcon } from "./LayerSwatchIcon";

interface HongtangVectorLayerPanelProps {
  mapControllerRef: RefObject<MapController | null>;
  onResizeStart: (event: ReactPointerEvent<HTMLDivElement>) => void;
  geometryEditLayerId: string | null;
  onToggleGeometryEdit: (layerId: string) => void;
  onCancelGeometryEdit: () => void;
}

function layerFeatureCount(layer: GeoLibreLayer): number | null {
  if (Array.isArray(layer.geojson?.features)) return layer.geojson.features.length;
  const value = layer.metadata.featureCount;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeFileName(name: string): string {
  const normalized = name.trim().replace(/[\\/:*?"<>|]+/g, "-");
  return normalized || "红塘矢量图层";
}

function exportLayer(layer: GeoLibreLayer): void {
  if (!layer.geojson) return;
  const geojson = excludeHiddenFieldsFromGeojson(layer.geojson, layer.fieldVisibility);
  const blob = new Blob([JSON.stringify(geojson, null, 2)], {
    type: "application/geo+json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFileName(layer.name)}.geojson`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Focused layer list used only by the Hongtang vector workbench.
 *
 * GeoLibre's full desktop panel is intentionally broad. This variant keeps the
 * few operations needed for the platform's spatial-data workflow visible and
 * leaves point/line/polygon drawing to the GeoEditor control on the map.
 */
export function HongtangVectorLayerPanel({
  mapControllerRef,
  onResizeStart,
  geometryEditLayerId,
  onToggleGeometryEdit,
  onCancelGeometryEdit,
}: HongtangVectorLayerPanelProps) {
  const layers = useAppStore((state) => state.layers);
  const selectedLayerId = useAppStore((state) => state.selectedLayerId);
  const selectLayer = useAppStore((state) => state.selectLayer);
  const setLayerVisibility = useAppStore((state) => state.setLayerVisibility);
  const setAttributeTableOpen = useAppStore((state) => state.setAttributeTableOpen);

  return (
    <aside
      aria-label="红塘矢量图层"
      className="relative flex max-h-[min(30rem,48vh)] w-full shrink-0 flex-col border-b bg-card max-md:absolute max-md:inset-x-0 max-md:top-0 max-md:z-30 max-md:shadow-xl md:max-h-none md:w-[var(--layer-panel-width)] md:border-b-0 md:border-e"
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="调整图层面板宽度"
        className="absolute -end-1 top-0 z-20 hidden h-full w-2 cursor-col-resize touch-none select-none border-e border-transparent hover:border-primary md:block"
        onPointerDown={onResizeStart}
      />

      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">编辑图层</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">共 {layers.length} 个图层</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" title="撤销" aria-label="撤销" onClick={undo}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="重做" aria-label="重做" onClick={redo}>
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border-b bg-muted/35 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
        选择图层后可定位、修改形状或编辑属性；新增地点、线路和分区请使用地图上的点、线、面按钮。
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-2" data-testid="hongtang-layer-list">
          {layers.map((layer) => {
            const featureCount = layerFeatureCount(layer);
            const selected = selectedLayerId === layer.id;
            const geometryEditActive = geometryEditLayerId === layer.id;
            const geometryEditElsewhere = geometryEditLayerId !== null && !geometryEditActive;
            const canEditGeometry = canEditLayerGeometry(layer);
            const canEditAttributes = layer.type === "geojson";
            const canExport = Boolean(layer.geojson);

            return (
              <div
                key={layer.id}
                data-testid="hongtang-layer-row"
                data-layer-name={layer.name}
                className={`rounded-lg border p-2 transition-colors ${
                  selected ? "border-primary bg-primary/5" : "border-border bg-background"
                }`}
              >
                <div className="flex w-full min-w-0 items-center gap-2 rounded px-1 py-1 hover:bg-muted/60">
                  <button
                    type="button"
                    className="rounded p-0.5 hover:bg-muted"
                    title={layer.visible ? "隐藏图层" : "显示图层"}
                    aria-label={layer.visible ? `隐藏${layer.name}` : `显示${layer.name}`}
                    onClick={() => setLayerVisibility(layer.id, !layer.visible)}
                  >
                    {layer.visible ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  <LayerSwatchIcon layer={layer} />
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-start text-sm font-medium"
                    title={layer.name}
                    onClick={() => selectLayer(layer.id)}
                  >
                    {layer.name}
                  </button>
                  {featureCount !== null ? (
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{featureCount}</span>
                  ) : null}
                </div>

                {geometryEditActive ? (
                  <div className="mt-2 flex items-center gap-1 rounded-md bg-primary/10 p-1.5">
                    <PencilRuler className="h-3.5 w-3.5 text-primary" />
                    <span className="min-w-0 flex-1 text-[11px] font-medium text-primary">正在修改形状</span>
                    <Button
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => onToggleGeometryEdit(layer.id)}
                    >
                      保存
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onCancelGeometryEdit}>
                      取消
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2 grid grid-cols-4 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 px-1 text-xs"
                      title="定位到图层"
                      onClick={() => {
                        selectLayer(layer.id);
                        mapControllerRef.current?.fitLayer(layer);
                      }}
                    >
                      <LocateFixed className="h-3.5 w-3.5" />
                      定位
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 px-1 text-xs"
                      title={canEditGeometry ? "修改要素形状" : "该图层暂不支持修改形状"}
                      disabled={!canEditGeometry || geometryEditElsewhere}
                      onClick={() => {
                        selectLayer(layer.id);
                        onToggleGeometryEdit(layer.id);
                      }}
                    >
                      <PencilRuler className="h-3.5 w-3.5" />
                      改形
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 px-1 text-xs"
                      title={canEditAttributes ? "打开属性表" : "该图层暂不支持属性编辑"}
                      disabled={!canEditAttributes}
                      onClick={() => {
                        selectLayer(layer.id);
                        setAttributeTableOpen(true);
                      }}
                    >
                      <TableProperties className="h-3.5 w-3.5" />
                      属性
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 px-1 text-xs"
                      title={canExport ? "导出 GeoJSON" : "该图层暂无可导出的要素"}
                      disabled={!canExport}
                      onClick={() => exportLayer(layer)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      导出
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
