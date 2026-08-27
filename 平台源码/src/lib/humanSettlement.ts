import { MapFeatureType } from "@/types";
import type { VillageTopicId } from "@/lib/villageTopics";

export type HumanSettlementSystemId = "nature" | "life" | "community" | "dwelling" | "support";
export type SettlementScaleId = "village" | "zone" | "household" | "site";
export type EvidenceStatusId = "pending" | "resident" | "documented" | "verified";
export type ActionStageId = "observe" | "verify" | "discuss" | "planned" | "in-progress" | "complete" | "recheck";

export interface HumanSettlementProfile {
  scale?: SettlementScaleId;
  evidenceStatus?: EvidenceStatusId;
  evidenceNote?: string;
  observedAt?: string;
  actionStage?: ActionStageId;
  nextAction?: string;
  steward?: string;
  relatedLabels?: string[];
}

export interface TopicLensDefinition {
  id: string;
  label: string;
  question: string;
  summary: string;
  chain: string[];
  systems: HumanSettlementSystemId[];
  scales: SettlementScaleId[];
}

export interface TopicFrameworkDefinition {
  topicId: VillageTopicId;
  guidingQuestion: string;
  lenses: TopicLensDefinition[];
  defaultRelations: string[];
  defaultNextAction: string;
}

export const humanSettlementSystems: Record<HumanSettlementSystemId, { label: string; shortLabel: string }> = {
  nature: { label: "山水与生态环境", shortLabel: "山水环境" },
  life: { label: "村民生活与地方知识", shortLabel: "生活知识" },
  community: { label: "邻里协作与共同维护", shortLabel: "共同维护" },
  dwelling: { label: "住房、院落与生产空间", shortLabel: "居住生产" },
  support: { label: "水、道路等支撑网络", shortLabel: "支撑网络" },
};

export const settlementScales: Record<SettlementScaleId, { label: string; prompt: string }> = {
  village: { label: "全村", prompt: "看它怎样影响整个红塘村，以及与其他专题如何连接。" },
  zone: { label: "片区", prompt: "看不同片区之间的差异、上下游关系和服务边界。" },
  household: { label: "家庭／地块", prompt: "看它与家庭日常、生产地块和使用者之间的关系。" },
  site: { label: "具体地点", prompt: "查看一个地点的现状、证据、变化和下一步行动。" },
};

export const evidenceStatuses: Record<EvidenceStatusId, { label: string; description: string }> = {
  pending: { label: "待核实", description: "目前是线索或初步判断，还需要访谈、踏勘或资料比对。" },
  resident: { label: "村民提供", description: "信息来自村民口述或共同绘图，仍可继续补充交叉印证。" },
  documented: { label: "已有记录", description: "已有照片、文字或调查表记录，但不等同于最终核实。" },
  verified: { label: "已核实", description: "已经过现场或可靠资料核对，可作为后续行动依据。" },
};

export const actionStages: Record<ActionStageId, { label: string; nextLabel: string }> = {
  observe: { label: "持续观察", nextLabel: "继续记录变化" },
  verify: { label: "等待核实", nextLabel: "安排访谈或现场核查" },
  discuss: { label: "共同讨论", nextLabel: "明确不同使用者的意见" },
  planned: { label: "已有计划", nextLabel: "落实负责人和时间" },
  "in-progress": { label: "正在行动", nextLabel: "记录过程并跟踪结果" },
  complete: { label: "已经完成", nextLabel: "补充成果记录" },
  recheck: { label: "等待复查", nextLabel: "复查效果和新的问题" },
};

export const topicFrameworks: Record<VillageTopicId, TopicFrameworkDefinition> = {
  garden: {
    topicId: "garden",
    guidingQuestion: "小花园在哪里，又是怎样从一家一户慢慢传播开的？",
    defaultRelations: ["家庭院落", "植物来源", "邻里学习", "村内传播"],
    defaultNextAction: "补充花园主人、植物来源和变化时间。",
    lenses: [
      { id: "where", label: "花园在哪", question: "现有小花园分布在哪里，分别属于怎样的院落？", summary: "先从地点出发，再理解花园与家庭生活的关系。", chain: ["家庭院落", "小花园", "日常照料"], systems: ["nature", "life", "dwelling"], scales: ["village", "household", "site"] },
      { id: "spread", label: "怎样传开", question: "种苗、做法和经验从谁家传到谁家？", summary: "花园不仅是绿色空间，也是一条地方知识和邻里互助的传播链。", chain: ["最初实践", "邻里学习", "更多家庭", "村内扩散"], systems: ["life", "community", "dwelling"], scales: ["village", "zone", "household"] },
      { id: "change", label: "怎样变化", question: "花园从什么时候开始，后来增加、减少或改变了什么？", summary: "用照片、访谈和时间记录理解花园怎样持续演变。", chain: ["过去", "建园", "日常维护", "现在"], systems: ["nature", "life", "community"], scales: ["household", "site"] },
    ],
  },
  tea: {
    topicId: "tea",
    guidingQuestion: "茶叶从哪片茶园出发，经过哪些人，最后进入哪里？",
    defaultRelations: ["茶园地块", "采茶农户", "收购线路", "茶厂加工"],
    defaultNextAction: "核实经营主体、采收联系和茶叶去向。",
    lenses: [
      { id: "origin", label: "茶从哪来", question: "茶园在哪里，土壤、坡度和日常管理有什么差异？", summary: "把茶叶放回山地环境和具体地块中理解。", chain: ["山地环境", "茶园地块", "日常管理"], systems: ["nature", "life", "dwelling"], scales: ["village", "zone", "household", "site"] },
      { id: "flow", label: "如何流动", question: "茶叶由谁采收，沿什么联系进入哪座茶厂？", summary: "重点不是孤立的茶园和茶厂，而是它们之间的人、路线和协作关系。", chain: ["茶园", "采茶农户", "收购联系", "茶厂"], systems: ["life", "community", "support", "dwelling"], scales: ["village", "zone", "household"] },
      { id: "monitor", label: "怎样监测", question: "哪些地块需要持续记录土壤、产量和茶树状态？", summary: "把一次调查变成可比较的长期记录。", chain: ["基线记录", "定期观察", "发现变化", "共同应对"], systems: ["nature", "life", "community"], scales: ["zone", "household", "site"] },
    ],
  },
  water: {
    topicId: "water",
    guidingQuestion: "房前屋后的水从哪里汇集，沿什么方向流动，最后排到哪里？",
    defaultRelations: ["水源", "供排水线路", "服务片区", "使用家庭", "维护责任"],
    defaultNextAction: "沿线路核实水源、使用对象、季节变化和维护人。",
    lenses: [
      { id: "overview", label: "水系统全貌", question: "供水和排水共同构成了怎样的村庄水系统？", summary: "先看全村关系，再进入水源、线路、片区和家庭。", chain: ["山地来水", "水源与设施", "村庄片区", "下游出流"], systems: ["nature", "life", "community", "dwelling", "support"], scales: ["village", "zone", "household", "site"] },
      { id: "supply", label: "饮水从哪来", question: "不同片区的水从哪里来，经过什么线路，被哪些家庭使用？", summary: "沿水源、线路和服务片区理解日常供水。", chain: ["水源", "调蓄", "供水线路", "使用片区"], systems: ["nature", "life", "community", "support"], scales: ["village", "zone", "household", "site"] },
      { id: "drainage", label: "排水到哪里", question: "雨水和生活排水在哪里汇集，沿什么方向流动，最后排到哪里？", summary: "结合手绘水系和现场调查继续校正排水网络。", chain: ["坡地来水", "自然支流", "主水系", "中心水塘", "下游核查点"], systems: ["nature", "dwelling", "support", "community"], scales: ["village", "zone", "household", "site"] },
    ],
  },
  safety: {
    topicId: "safety",
    guidingQuestion: "隐患在哪里，会影响谁，发现以后怎样处置和复查？",
    defaultRelations: ["隐患地点", "受影响道路", "附近家庭", "处置责任", "复查记录"],
    defaultNextAction: "核实风险等级、受影响对象和处置责任。",
    lenses: [
      { id: "risk", label: "隐患在哪", question: "塌方、滑坡和其他隐患分别在哪里？", summary: "先准确记录地点、类型和现场证据。", chain: ["现场线索", "隐患地点", "证据记录"], systems: ["nature", "dwelling", "support"], scales: ["village", "zone", "site"] },
      { id: "impact", label: "影响什么", question: "隐患影响哪些道路、住房、农田和日常出行？", summary: "从风险点继续追踪真正受到影响的人和空间。", chain: ["隐患", "道路／住房", "家庭生产生活"], systems: ["life", "dwelling", "support"], scales: ["zone", "household", "site"] },
      { id: "action", label: "怎样处理", question: "谁发现、谁处理、何时完成、之后怎样复查？", summary: "把隐患记录接到具体行动和持续复查。", chain: ["发现", "核实", "处置", "复查"], systems: ["life", "community", "support"], scales: ["village", "zone", "site"] },
    ],
  },
  history: {
    topicId: "history",
    guidingQuestion: "古道、老树、老地名和村民记忆怎样共同讲述红塘？",
    defaultRelations: ["历史地点", "古道线路", "口述讲述者", "旧照片", "当代生活"],
    defaultNextAction: "补充讲述者、时间线索和现场证据。",
    lenses: [
      { id: "places", label: "遗存在哪", question: "古道、老树、老屋和旧地名分别在哪里？", summary: "把记忆放回具体地点和环境中。", chain: ["历史地点", "现场遗存", "今天的村庄"], systems: ["nature", "life", "dwelling"], scales: ["village", "zone", "site"] },
      { id: "stories", label: "故事从哪来", question: "谁讲述了这段记忆，还有哪些照片和说法可以相互印证？", summary: "同时记录故事、讲述者和证据，不把口述变成无来源的说明文字。", chain: ["讲述者", "口述记忆", "照片／文献", "相互核实"], systems: ["life", "community"], scales: ["village", "household", "site"] },
      { id: "continuity", label: "如何延续", question: "这些历史地点今天仍怎样被使用，又怎样传给下一代？", summary: "关注历史与当代生活的连续关系。", chain: ["过去用途", "今天使用", "共同维护", "代际传承"], systems: ["life", "community", "dwelling", "support"], scales: ["village", "zone", "household", "site"] },
    ],
  },
};

export function topicForFeatureType(featureType?: MapFeatureType): VillageTopicId | undefined {
  if (featureType === MapFeatureType.Garden) return "garden";
  if (featureType === MapFeatureType.TeaGarden || featureType === MapFeatureType.TeaFactory) return "tea";
  if (featureType === MapFeatureType.WaterFacility) return "water";
  if (featureType === MapFeatureType.SafetyRisk) return "safety";
  if (featureType === MapFeatureType.VillageMemory || featureType === MapFeatureType.Culture) return "history";
  return undefined;
}

export function inferEvidenceStatus(status = ""): EvidenceStatusId {
  if (/已核实|已确认|实地核实/.test(status)) return "verified";
  if (/村民|口述|共同绘图/.test(status)) return "resident";
  if (/已记录|照片|资料/.test(status)) return "documented";
  return "pending";
}

export function inferActionStage(status = "", evidenceStatus?: EvidenceStatusId): ActionStageId {
  if (/复查/.test(status)) return "recheck";
  if (/完成|已处理/.test(status)) return "complete";
  if (/进行|施工|处理中/.test(status)) return "in-progress";
  if (/计划|待实施/.test(status)) return "planned";
  if (/讨论|协商/.test(status)) return "discuss";
  if ((evidenceStatus ?? inferEvidenceStatus(status)) === "pending") return "verify";
  return "observe";
}

export function resolveHumanSettlementProfile({ topicId, featureType, status = "", updatedAt, existing }: { topicId?: VillageTopicId; featureType?: MapFeatureType; status?: string; updatedAt?: string; existing?: HumanSettlementProfile }) {
  const resolvedTopic = topicId ?? topicForFeatureType(featureType);
  const evidenceStatus = existing?.evidenceStatus ?? inferEvidenceStatus(status);
  return {
    scale: existing?.scale ?? "site" as SettlementScaleId,
    evidenceStatus,
    evidenceNote: existing?.evidenceNote ?? evidenceStatuses[evidenceStatus].description,
    observedAt: existing?.observedAt ?? updatedAt,
    actionStage: existing?.actionStage ?? inferActionStage(status, evidenceStatus),
    nextAction: existing?.nextAction ?? (resolvedTopic ? topicFrameworks[resolvedTopic].defaultNextAction : "补充资料并确认下一步。"),
    steward: existing?.steward ?? "待共同确认",
    relatedLabels: existing?.relatedLabels?.length ? existing.relatedLabels : (resolvedTopic ? topicFrameworks[resolvedTopic].defaultRelations : []),
  };
}

export function defaultTopicLensId(topicId: VillageTopicId) {
  return topicFrameworks[topicId].lenses[0].id;
}

export function findTopicLens(topicId: VillageTopicId, lensId?: string) {
  const framework = topicFrameworks[topicId];
  return framework.lenses.find((lens) => lens.id === lensId) ?? framework.lenses[0];
}
