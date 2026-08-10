export type AmapCoordinate = [number, number];

export interface AmapPixel {
  getX(): number;
  getY(): number;
}

export interface AmapEvent {
  lnglat?: { getLng(): number; getLat(): number };
  originalEvent?: Event;
}

export interface AmapOverlay {
  on(event: string, handler: (event: AmapEvent) => void): void;
  off?(event: string, handler: (event: AmapEvent) => void): void;
  setOptions?(options: Record<string, unknown>): void;
}

export interface AmapMapInstance {
  add(overlays: AmapOverlay | AmapOverlay[]): void;
  remove(overlays: AmapOverlay | AmapOverlay[]): void;
  on(event: string, handler: (event: AmapEvent) => void): void;
  off(event: string, handler: (event: AmapEvent) => void): void;
  destroy(): void;
  resize(): void;
  lngLatToContainer(coordinate: AmapCoordinate): AmapPixel;
  setCenter(center: AmapCoordinate, immediately?: boolean, duration?: number): void;
  setZoomAndCenter(zoom: number, center: AmapCoordinate, immediately?: boolean, duration?: number): void;
  getZoom(): number;
}

type AmapMapOptions = {
  center: AmapCoordinate;
  zoom: number;
  zooms?: [number, number];
  viewMode?: "2D" | "3D";
  mapStyle?: string;
  resizeEnable?: boolean;
  rotateEnable?: boolean;
  pitchEnable?: boolean;
  showLabel?: boolean;
};

type AmapImageLayerOptions = {
  url: string;
  bounds: unknown;
  opacity?: number;
  zIndex?: number;
  zooms?: [number, number];
};

type AmapTileLayerOptions = {
  opacity?: number;
  zIndex?: number;
  zooms?: [number, number];
};

type AmapPolylineOptions = {
  path: AmapCoordinate[];
  zIndex?: number;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  strokeStyle?: "solid" | "dashed";
  strokeDasharray?: number[];
  lineJoin?: "miter" | "round" | "bevel";
  lineCap?: "butt" | "round" | "square";
  cursor?: string;
};

type AmapPolygonOptions = {
  path: AmapCoordinate[];
  zIndex?: number;
  fillColor?: string;
  fillOpacity?: number;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  strokeStyle?: "solid" | "dashed";
  strokeDasharray?: number[];
  cursor?: string;
};

export interface AmapNamespace {
  Map: new (container: HTMLElement | string, options: AmapMapOptions) => AmapMapInstance;
  TileLayer: {
    Satellite: new (options?: AmapTileLayerOptions) => AmapOverlay;
    RoadNet: new (options?: AmapTileLayerOptions) => AmapOverlay;
  };
  Bounds: new (southWest: AmapCoordinate, northEast: AmapCoordinate) => unknown;
  ImageLayer: new (options: AmapImageLayerOptions) => AmapOverlay;
  Polyline: new (options: AmapPolylineOptions) => AmapOverlay;
  Polygon: new (options: AmapPolygonOptions) => AmapOverlay;
}

declare global {
  interface Window {
    AMap?: AmapNamespace;
    _AMapSecurityConfig?: { serviceHost?: string; securityJsCode?: string };
  }
}

type AmapClientConfig = {
  key?: string;
  proxyEnabled?: boolean;
};

let amapLoadPromise: Promise<AmapNamespace> | undefined;

export function loadAmap() {
  if (typeof window === "undefined") return Promise.reject(new Error("AMap can only load in a browser"));
  if (window.AMap) return Promise.resolve(window.AMap);
  if (amapLoadPromise) return amapLoadPromise;

  amapLoadPromise = fetch("/api/amap-config", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error(`AMap config request failed: ${response.status}`);
      return response.json() as Promise<AmapClientConfig>;
    })
    .then((config) => {
      const key = config.key?.trim();
      if (!key) throw new Error("AMAP_WEB_KEY is not configured");
      if (config.proxyEnabled) {
        window._AMapSecurityConfig = { serviceHost: `${window.location.origin}/_AMapService` };
      }

      return new Promise<AmapNamespace>((resolve, reject) => {
        const callbackName = `__hongtangAmapReady${Date.now()}`;
        const callbackHost = window as unknown as Record<string, unknown>;
        const script = document.createElement("script");
        const timeout = window.setTimeout(() => {
          delete callbackHost[callbackName];
          reject(new Error("AMap load timed out"));
        }, 15000);

        callbackHost[callbackName] = () => {
          window.clearTimeout(timeout);
          delete callbackHost[callbackName];
          if (window.AMap) resolve(window.AMap);
          else reject(new Error("AMap global object is unavailable"));
        };

        script.async = true;
        script.charset = "utf-8";
        script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}&callback=${callbackName}`;
        script.dataset.hongtangAmap = "true";
        script.onerror = () => {
          window.clearTimeout(timeout);
          delete callbackHost[callbackName];
          reject(new Error("AMap script failed to load"));
        };
        document.head.appendChild(script);
      });
    })
    .catch((error) => {
      amapLoadPromise = undefined;
      throw error;
    });

  return amapLoadPromise;
}

const PI = Math.PI;
const SEMI_MAJOR_AXIS = 6378245;
const ECCENTRICITY_SQUARED = 0.006693421622965943;

function outsideChina(longitude: number, latitude: number) {
  return longitude < 72.004 || longitude > 137.8347 || latitude < 0.8293 || latitude > 55.8271;
}

function transformLatitude(longitude: number, latitude: number) {
  let result = -100 + 2 * longitude + 3 * latitude + 0.2 * latitude * latitude
    + 0.1 * longitude * latitude + 0.2 * Math.sqrt(Math.abs(longitude));
  result += (20 * Math.sin(6 * longitude * PI) + 20 * Math.sin(2 * longitude * PI)) * 2 / 3;
  result += (20 * Math.sin(latitude * PI) + 40 * Math.sin(latitude / 3 * PI)) * 2 / 3;
  result += (160 * Math.sin(latitude / 12 * PI) + 320 * Math.sin(latitude * PI / 30)) * 2 / 3;
  return result;
}

function transformLongitude(longitude: number, latitude: number) {
  let result = 300 + longitude + 2 * latitude + 0.1 * longitude * longitude
    + 0.1 * longitude * latitude + 0.1 * Math.sqrt(Math.abs(longitude));
  result += (20 * Math.sin(6 * longitude * PI) + 20 * Math.sin(2 * longitude * PI)) * 2 / 3;
  result += (20 * Math.sin(longitude * PI) + 40 * Math.sin(longitude / 3 * PI)) * 2 / 3;
  result += (150 * Math.sin(longitude / 12 * PI) + 300 * Math.sin(longitude / 30 * PI)) * 2 / 3;
  return result;
}

/** Convert source WGS84 coordinates to the GCJ-02 coordinates used by AMap. */
export function wgs84ToGcj02(longitude: number, latitude: number): AmapCoordinate {
  if (outsideChina(longitude, latitude)) return [longitude, latitude];

  let latitudeDelta = transformLatitude(longitude - 105, latitude - 35);
  let longitudeDelta = transformLongitude(longitude - 105, latitude - 35);
  const latitudeRadians = latitude / 180 * PI;
  let magic = Math.sin(latitudeRadians);
  magic = 1 - ECCENTRICITY_SQUARED * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  latitudeDelta = latitudeDelta * 180 / ((SEMI_MAJOR_AXIS * (1 - ECCENTRICITY_SQUARED)) / (magic * sqrtMagic) * PI);
  longitudeDelta = longitudeDelta * 180 / (SEMI_MAJOR_AXIS / sqrtMagic * Math.cos(latitudeRadians) * PI);
  return [longitude + longitudeDelta, latitude + latitudeDelta];
}
