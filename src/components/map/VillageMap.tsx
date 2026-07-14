"use client";

import { SpatialFeature } from "@/types";
import { MapMarker } from "@/components/map/MapMarker";

export function VillageMap({ features, selectedId, onSelect, onMapClick, interactiveLocation = false }: { features: SpatialFeature[]; selectedId?: string; onSelect: (feature: SpatialFeature) => void; onMapClick?: (x: number, y: number) => void; interactiveLocation?: boolean }) {
  const clickMap = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!interactiveLocation || !onMapClick) return;
    const rect = event.currentTarget.getBoundingClientRect();
    onMapClick(((event.clientX - rect.left) / rect.width) * 100, ((event.clientY - rect.top) / rect.height) * 100);
  };
  return (
    <div className={`village-map ${interactiveLocation ? "location-mode" : ""}`} onClick={clickMap}>
      <svg viewBox="0 0 900 620" role="img" aria-label="红塘村演示简化地图">
        <defs><pattern id="field-lines" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M0 24L24 0" stroke="#d4dfce" strokeWidth="1" /></pattern></defs>
        <rect width="900" height="620" fill="#eef2e8" />
        <path d="M0 95 C180 130 230 35 430 85 C610 130 720 45 900 75 L900 0 L0 0 Z" fill="#dce9d8" />
        <path d="M0 470 C140 420 270 510 410 455 C570 390 720 520 900 440 L900 620 L0 620 Z" fill="url(#field-lines)" />
        <path d="M60 510 C250 380 380 500 540 300 C660 150 760 200 880 95" fill="none" stroke="#8fc3cc" strokeWidth="25" opacity=".8" />
        <path d="M60 510 C250 380 380 500 540 300 C660 150 760 200 880 95" fill="none" stroke="#d9f0ef" strokeWidth="8" />
        <g fill="#e7d4c8" stroke="#b98c78" strokeWidth="3">
          <path d="M145 275h96v72h-96z M260 244h82v62h-82z M365 280h115v80H365z M520 205h95v72h-95z M640 300h112v78H640z M560 405h104v66H560z M290 405h106v72H290z" />
        </g>
        <g stroke="#d4c7ad" strokeWidth="15" fill="none" strokeLinecap="round"><path d="M40 375L250 355L430 395L630 340L850 360" /><path d="M215 135L270 250L250 355L290 495" /><path d="M605 100L580 220L630 340L720 520" /></g>
        <g stroke="#fffaf0" strokeWidth="7" fill="none" strokeLinecap="round"><path d="M40 375L250 355L430 395L630 340L850 360" /><path d="M215 135L270 250L250 355L290 495" /><path d="M605 100L580 220L630 340L720 520" /></g>
        <g fill="#9ab88a"><circle cx="110" cy="175" r="34" /><circle cx="168" cy="160" r="26" /><circle cx="780" cy="180" r="42" /><circle cx="820" cy="215" r="29" /><circle cx="440" cy="120" r="32" /></g>
        <g fill="#607d68" fontFamily="sans-serif" fontSize="16"><text x="62" y="407">村口方向</text><text x="350" y="260">公共空间</text><text x="688" y="414">水体观察段</text><text x="556" y="502">田园观察区</text></g>
      </svg>
      <div className="map-demo-label">简化村庄底图 · 演示数据</div>
      {features.map((feature) => <MapMarker key={feature.id} feature={feature} active={feature.id === selectedId} onClick={() => onSelect(feature)} />)}
      {interactiveLocation ? <div className="map-location-help">点击地图选择上报位置</div> : null}
    </div>
  );
}
