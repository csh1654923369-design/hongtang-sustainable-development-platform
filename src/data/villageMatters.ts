export type VillageMatterIcon = "garden" | "tea" | "water" | "solar" | "safety" | "history";

export interface VillageMatter {
  id: string;
  title: string;
  subtitle: string;
  icon: VillageMatterIcon;
  description: string;
  latestUpdate: string;
  recordItems: string[];
  relatedHref: string;
  relatedLabel: string;
}

export const villageMatters: VillageMatter[] = [
  {
    id: "garden",
    title: "我家小花园",
    subtitle: "种了什么、长得怎样",
    icon: "garden",
    description: "按季节记录房前屋后的小菜园、小花园和村民自己打理的地块，慢慢积累红塘村的种植变化。",
    latestUpdate: "本季度示范记录：菜地换季、庭院花木和闲置角落整理。",
    recordItems: ["种了哪些菜、花或果树", "播种、开花、采收的大致时间", "一张现场照片和几句说明"],
    relatedHref: "/garden",
    relatedLabel: "进入小花园",
  },
  {
    id: "tea",
    title: "茶园与茶厂",
    subtitle: "从茶园管理到收茶加工",
    icon: "tea",
    description: "记录茶园日常管理、茶青采摘收购和茶厂加工，让村里的主导产业有一份连续、看得见的档案。",
    latestUpdate: "本月示范记录：茶园管护、采摘批次和加工环节说明。",
    recordItems: ["茶园管理和病虫害情况", "采茶、收茶与价格信息", "茶厂加工、用工和设备情况"],
    relatedHref: "/tea-factory",
    relatedLabel: "进入茶厂",
  },
  {
    id: "water",
    title: "村里用水",
    subtitle: "水池、水管和日常维护",
    icon: "water",
    description: "把蓄水池、供水管线、用水问题和维修过程放在一起记录，方便村民了解问题有没有人跟进。",
    latestUpdate: "本月示范记录：供水设施巡查和一处水环境改善行动。",
    recordItems: ["供水设施的位置和状态", "停水、漏水或水质问题", "维修时间、负责人和处理结果"],
    relatedHref: "/water",
    relatedLabel: "进入村里用水",
  },
  {
    id: "solar",
    title: "光伏设施",
    subtitle: "在哪里、运行得怎么样",
    icon: "solar",
    description: "记录村里的光伏设施分布、日常运行和维护情况，帮助大家理解设施带来的收益与变化。",
    latestUpdate: "本月示范记录：光伏点位核对和设施外观巡查。",
    recordItems: ["设施安装位置和数量", "是否正常运行、是否需要维护", "收益用途和公开说明"],
    relatedHref: "/solar",
    relatedLabel: "进入光伏设施",
  },
  {
    id: "safety",
    title: "塌方与安全",
    subtitle: "风险点、巡查和处理情况",
    icon: "safety",
    description: "持续记录塌方、边坡、道路等安全风险，保留发现、上报、处理和复查的完整过程。",
    latestUpdate: "本月示范记录：雨后道路与边坡巡查，暂无真实风险结论。",
    recordItems: ["风险点的具体位置", "现场照片和发现时间", "是否处理、何时复查"],
    relatedHref: "/safety",
    relatedLabel: "进入安全隐患",
  },
  {
    id: "history",
    title: "红塘村历史",
    subtitle: "古道、老屋和村里故事",
    icon: "history",
    description: "收集茶马古道、老建筑、老照片和村民口述故事，为红塘村留下可以不断补充的共同记忆。",
    latestUpdate: "本月示范记录：待补充古道、老屋和村民口述资料。",
    recordItems: ["老建筑、古道和重要地点", "老照片及其年代、人物", "村民讲述的往事和习俗"],
    relatedHref: "/village-history",
    relatedLabel: "进入村庄记忆",
  },
];
