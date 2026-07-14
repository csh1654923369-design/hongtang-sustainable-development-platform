"use client";

import { CheckCircle2, FileCheck2, MapPin, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { UploadArea } from "@/components/common/UploadArea";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";
import { useDemo } from "@/components/providers/DemoProvider";
import { can } from "@/lib/permissions";
import { UserRole } from "@/types";

const types = ["调研照片", "建筑数据", "道路数据", "水体数据", "公共服务设施", "文化资源", "访谈记录", "改造建议"];

export function ResearchSubmissionForm() {
  const { role, setRole, notify } = useDemo();
  const [submitted, setSubmitted] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({ title: "", type: "调研照片", date: "2026-07-13", researchers: "", location: "", description: "", source: "", publicAllowed: true, note: "" });

  if (!can(role, "submitResearch")) return <section className="access-gate"><ShieldCheck size={42} /><DemoDataBadge /><h2>调研成果需要协作者身份</h2><p>所有提交内容都会进入“待专业审核”，不能直接修改正式地图或数据库。</p><button className="button button-primary" onClick={() => setRole(UserRole.Collaborator)}>切换为学生 / 规划协作者</button></section>;
  const update = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (form.title.trim().length < 4 || form.description.trim().length < 10 || !form.researchers || !form.location || !form.source) { notify("请完成必填信息", "标题、调研人员、位置、说明和数据来源都需要填写。" ); return; }
    setSubmitted(true); notify("调研成果已提交", "当前状态为“待专业审核”。", "success");
  };
  if (submitted) return <section className="report-success"><span className="success-icon"><CheckCircle2 size={44} /></span><DemoDataBadge /><h2>提交成功</h2><p>审核编号</p><strong>HT-RS-2026-0006</strong><div className="success-status"><span>当前状态</span><b>待专业审核</b></div><p>审核人员可以通过、退回修改、标记重复、合并到已有数据或拒绝并说明理由。</p><div><button className="button button-primary" onClick={() => { setSubmitted(false); setForm((current) => ({ ...current, title: "", description: "", note: "" })); }}>继续提交</button><a className="button button-secondary" href="/profile">查看我的调研</a></div></section>;
  return (
    <form className="research-form" onSubmit={submit}>
      <section className="content-card"><div className="card-heading"><h2><FileCheck2 size={20} />基础信息</h2><DemoDataBadge /></div><div className="form-grid"><label className="field-label">成果标题<span>必填</span><input className="text-input" value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="清晰概括本次提交内容" /></label><label className="field-label">提交类型<span>必填</span><select className="select-input" value={form.type} onChange={(event) => update("type", event.target.value)}>{types.map((type) => <option key={type}>{type}</option>)}</select></label><label className="field-label">调研日期<span>必填</span><input className="text-input" type="date" value={form.date} onChange={(event) => update("date", event.target.value)} /></label><label className="field-label">调研人员<span>必填</span><input className="text-input" value={form.researchers} onChange={(event) => update("researchers", event.target.value)} placeholder="姓名或小组名称" /></label></div></section>
      <section className="content-card"><div className="card-heading"><h2><MapPin size={20} />位置与说明</h2><span>未来可接入 PostGIS</span></div><label className="field-label">地图位置<span>必填</span><input className="text-input" value={form.location} onChange={(event) => update("location", event.target.value)} placeholder="选择或描述调研位置（演示）" /></label><div className="research-map-placeholder"><MapPin size={28} /><strong>空间位置选择组件占位</strong><p>未来接入地图后保存 geometry、longitude、latitude 与 geojson。</p></div><label className="field-label">文字说明<span>必填</span><textarea className="text-area" value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="说明观察方法、主要内容和适用范围，不要填写未经授权的个人信息。" /></label></section>
      <section className="content-card"><div className="card-heading"><h2>文件与来源</h2><span>{files.length} 个待提交文件</span></div><UploadArea label="上传调研照片或图件预览" onChange={setFiles} /><div className="form-grid"><label className="field-label">数据来源<span>必填</span><input className="text-input" value={form.source} onChange={(event) => update("source", event.target.value)} placeholder="例如：现场观察、访谈授权、公开资料" /></label><label className="field-label">备注<input className="text-input" value={form.note} onChange={(event) => update("note", event.target.value)} placeholder="补充审核人员需要了解的情况" /></label></div><label className="check-row"><input type="checkbox" checked={form.publicAllowed} onChange={(event) => update("publicAllowed", event.target.checked)} />审核通过后允许在公开平台展示</label></section>
      <div className="privacy-note"><ShieldCheck size={19} /><p><strong>提交与审核说明</strong>调研成果不会直接进入正式数据库。审核人员将检查来源、授权、重复情况与空间位置。</p></div><div className="form-submit-bar"><span>提交即表示以上内容为 Demo 演示数据</span><button className="button button-primary button-large" type="submit">提交调研成果</button></div>
    </form>
  );
}
