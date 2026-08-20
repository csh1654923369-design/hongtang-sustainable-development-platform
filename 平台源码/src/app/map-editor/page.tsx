import { MapDataEditor } from "@/components/map-editor/MapDataEditor";

export const metadata = {
  title: "红塘地图数据编辑｜红塘村可持续发展平台",
  description: "在不写入数据库的情况下临时编辑红塘村点、线、面空间数据。",
};

export default function MapEditorPage() {
  return <MapDataEditor />;
}
