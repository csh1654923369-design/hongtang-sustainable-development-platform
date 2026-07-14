"use client";

import { useState } from "react";
import { SpatialFeature } from "@/types";
import { VillageMap } from "@/components/map/VillageMap";
import { MapDetailDrawer } from "@/components/map/MapDetailDrawer";

export function GoalMapPreview({ features }: { features: SpatialFeature[] }) {
  const [selected, setSelected] = useState<SpatialFeature | undefined>(features[0]);
  return <div className="goal-map-preview"><VillageMap features={features} selectedId={selected?.id} onSelect={setSelected} /><MapDetailDrawer feature={selected} onClose={() => setSelected(undefined)} /></div>;
}
