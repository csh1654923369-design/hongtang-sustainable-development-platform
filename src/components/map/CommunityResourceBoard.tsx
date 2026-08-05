"use client";

import { Filter, HandHeart, Info, LocateFixed, MapPin, PackageSearch, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";
import { VillageMap } from "@/components/map/VillageMap";
import { useDemo } from "@/components/providers/DemoProvider";
import { can } from "@/lib/permissions";
import { communityResourceCategoryLabels } from "@/lib/utils";
import { CommunityResourceCategory, CommunityResourceMode } from "@/types";

const categories = Object.entries(communityResourceCategoryLabels) as Array<[CommunityResourceCategory, string]>;

export function CommunityResourceBoard() {
  const { role, notify, communityResources, submitCommunityResource, resourceInterestIds, signalResourceInterest } = useDemo();
  const [modeFilter, setModeFilter] = useState<"all" | CommunityResourceMode>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | CommunityResourceCategory>("all");
  const [dialogMode, setDialogMode] = useState<CommunityResourceMode | null>(null);
  const [error, setError] = useState("");
  const [position, setPosition] = useState({ x: 50, y: 52, longitude: 113.622, latitude: 22.9126, selected: false });
  const [values, setValues] = useState({ category: "tool" as CommunityResourceCategory, title: "", description: "", location: "", availability: "", privacy: "group-only" as "public-area" | "group-only", goalId: "goal-livable" });
  const visible = useMemo(() => communityResources.filter((resource) => (modeFilter === "all" || resource.mode === modeFilter) && (categoryFilter === "all" || resource.category === categoryFilter)), [communityResources, modeFilter, categoryFilter]);
  const chooseLocation = (x: number, y: number) => setPosition({ x, y, selected: true, longitude: 113.618 + x * 0.00008, latitude: 22.909 + (100 - y) * 0.000075 });
  const open = (mode: CommunityResourceMode) => {
    if (!can(role, "shareResource")) { notify("请切换为村民或协作者", "游客可以浏览互助资源，但不能登记供给或需求。" ); return; }
    setError(""); setDialogMode(mode);
  };
  const close = () => { setDialogMode(null); setError(""); };
  const submit = () => {
    if (!dialogMode) return;
    if (values.title.trim().length < 4 || values.description.trim().length < 8 || values.location.trim().length < 2 || values.availability.trim().length < 2 || !position.selected) { setError("请补充标题、说明、可用时间，并在地图选择大致位置。"); return; }
    submitCommunityResource({ mode: dialogMode, category: values.category, title: values.title.trim(), description: values.description.trim(), location: `${values.location.trim()}（模糊位置）`, longitude: position.longitude, latitude: position.latitude, mapX: position.x, mapY: position.y, availability: values.availability.trim(), privacy: values.privacy, goalId: values.goalId });
    setValues({ category: "tool", title: "", description: "", location: "", availability: "", privacy: "group-only", goalId: "goal-livable" });
    setPosition({ x: 50, y: 52, longitude: 113.622, latitude: 22.9126, selected: false });
    close();
  };
  return (
    <section className="community-resource-section" id="community-resources">
      <div className="page-container">
        <div className="resource-board-heading"><div><div className="eyebrow-line"><span>本地能力与互助需求</span><DemoDataBadge /></div><h2>社区资源地图与互助板</h2><p>把空间、工具、材料、技能、地方知识和志愿时间与具体行动连接起来。公开页面只显示授权字段和模糊位置。</p></div><div className="resource-board-actions"><button className="button button-secondary" onClick={() => open("offer")}><HandHeart size={17} />登记可提供资源</button><button className="button button-primary" onClick={() => open("need")}><PackageSearch size={17} />发布资源需求</button></div></div>
        <div className="resource-board-note"><ShieldCheck size={19} /><div><strong>隐私与联系规则</strong><p>不公开家庭住址、电话和个人身份；回应后由平台或行动小组代为转达，涉及公共空间和安全的使用仍需确认。</p></div></div>
        <div className="resource-filter-bar"><strong><Filter size={17} />筛选互助信息</strong><div className="resource-mode-switch"><button className={modeFilter === "all" ? "active" : ""} onClick={() => setModeFilter("all")}>全部</button><button className={modeFilter === "offer" ? "active" : ""} onClick={() => setModeFilter("offer")}>可提供</button><button className={modeFilter === "need" ? "active" : ""} onClick={() => setModeFilter("need")}>正在寻找</button></div><label>资源类型<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as typeof categoryFilter)}><option value="all">全部类型</option>{categories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><span>{visible.length} 条演示信息</span></div>
        <div className="resource-card-grid">{visible.map((resource) => { const responded = resourceInterestIds.includes(resource.id); return <article className={`resource-card mode-${resource.mode}`} data-resource-id={resource.id} data-resource-mode={resource.mode} key={resource.id}><div className="resource-card-top"><span className={`resource-mode-badge ${resource.mode}`}>{resource.mode === "offer" ? <><HandHeart size={15} />可提供</> : <><PackageSearch size={15} />正在寻找</>}</span><span>{communityResourceCategoryLabels[resource.category]}</span>{resource.submittedByMe ? <i>我发布的</i> : null}</div><h3>{resource.title}</h3><p>{resource.description}</p><dl className="resource-meta-list"><div><dt>大致位置</dt><dd>{resource.location}</dd></div><div><dt>时间</dt><dd>{resource.availability}</dd></div><div><dt>联系</dt><dd>{resource.contactLabel}</dd></div></dl><div className="resource-privacy-note"><Info size={15} />{resource.privacy === "group-only" ? "具体位置仅在匹配后确认" : "公开点位仍采用模糊展示"}</div><button className="button button-secondary resource-response-button" data-action="signal-resource-interest" disabled={responded || resource.submittedByMe || resource.status === "matched"} onClick={() => { if (!can(role, "shareResource")) { notify("请切换身份后回应"); return; } signalResourceInterest(resource.id); }}>{resource.submittedByMe ? "等待他人回应" : responded ? "已回应" : resource.mode === "offer" ? "我需要这项资源" : "我可以帮忙"}</button></article>; })}</div>
      </div>
      <ConfirmationDialog open={Boolean(dialogMode)} title={dialogMode === "offer" ? "登记可提供资源" : "发布资源需求"} description="只填写可以公开的概括信息；个人联系方式不会显示在资源卡或地图上。" confirmLabel={dialogMode === "offer" ? "确认登记" : "确认发布"} onClose={close} onConfirm={submit}>
        <div className="form-stack resource-form"><div className="resource-form-row"><label className="field-label">资源类型<select className="select-input" value={values.category} onChange={(event) => setValues((current) => ({ ...current, category: event.target.value as CommunityResourceCategory }))}>{categories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="field-label">公开范围<select className="select-input" value={values.privacy} onChange={(event) => setValues((current) => ({ ...current, privacy: event.target.value as "public-area" | "group-only" }))}><option value="group-only">匹配后确认具体位置</option><option value="public-area">可公开模糊点位</option></select></label></div><label className="field-label">标题<input className="text-input" value={values.title} onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))} placeholder={dialogMode === "offer" ? "例如：可借用的折叠座椅 6 把" : "例如：寻找两名雨后观察员"} /></label><label className="field-label">具体说明<textarea className="text-area" value={values.description} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} placeholder="说明用途、条件、数量或适合参与的方式。" /></label><div className="resource-location-map"><VillageMap features={[]} selectedId="" onSelect={() => undefined} interactiveLocation onMapClick={chooseLocation} />{position.selected ? <span className="chosen-location" style={{ left: `${position.x}%`, top: `${position.y}%` }}><MapPin size={22} /></span> : null}</div><div className="location-summary"><button className="button button-secondary" onClick={() => chooseLocation(50, 52)}><LocateFixed size={16} />使用地图中心</button><strong>{position.selected ? "已选择模糊点位" : "尚未选择位置"}</strong></div><div className="resource-form-row"><label className="field-label">地点概称<input className="text-input" value={values.location} onChange={(event) => setValues((current) => ({ ...current, location: event.target.value }))} placeholder="例如：村口附近" /></label><label className="field-label">可用或需要时间<input className="text-input" value={values.availability} onChange={(event) => setValues((current) => ({ ...current, availability: event.target.value }))} placeholder="例如：未来四周" /></label></div>{error ? <p className="field-error">{error}</p> : null}</div>
      </ConfirmationDialog>
    </section>
  );
}
