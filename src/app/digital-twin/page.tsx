import { PageHeader } from "@/components/common/PageHeader";
import { DigitalTwinViewer } from "@/components/digital-twin/DigitalTwinViewer";

export default function DigitalTwinPage() {
  return <main><PageHeader eyebrow="DIGITAL SANDBOX" title="数字沙盘" description="用于查看红塘村重点区域、比较改造方案和展示未来建设效果。本阶段为独立交互占位组件。" /><section className="page-container page-section"><DigitalTwinViewer /></section></main>;
}
