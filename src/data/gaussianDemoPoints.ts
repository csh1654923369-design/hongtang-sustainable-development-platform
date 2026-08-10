export const gaussianDemoPointIds = ["map-13", "map-14", "map-15", "map-16", "map-18"] as const;
export type GaussianDemoPointId = (typeof gaussianDemoPointIds)[number];

export type GaussianPointPayload = {
  id: GaussianDemoPointId;
  categoryLabel: string;
  shortLabel: string;
  color: string;
  eastRatio: number;
  northRatio: number;
};

export const gaussianDemoPoints: GaussianPointPayload[] = [
  { id: "map-13", categoryLabel: "小花园", shortLabel: "花", color: "#4f8d55", eastRatio: -0.32, northRatio: 0.18 },
  { id: "map-14", categoryLabel: "茶场", shortLabel: "茶", color: "#71803a", eastRatio: -0.08, northRatio: 0.32 },
  { id: "map-15", categoryLabel: "茶厂", shortLabel: "厂", color: "#8b6b32", eastRatio: 0.22, northRatio: 0.18 },
  { id: "map-16", categoryLabel: "村里用水", shortLabel: "水", color: "#3387a0", eastRatio: 0.33, northRatio: -0.14 },
  { id: "map-18", categoryLabel: "安全巡查", shortLabel: "安", color: "#c34e36", eastRatio: -0.18, northRatio: -0.28 },
];

export function isGaussianDemoPointId(value: unknown): value is GaussianDemoPointId {
  return typeof value === "string" && gaussianDemoPointIds.includes(value as GaussianDemoPointId);
}
