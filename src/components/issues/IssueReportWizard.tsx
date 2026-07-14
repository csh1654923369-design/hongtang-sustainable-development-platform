"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, LocateFixed, MapPin, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { VillageMap } from "@/components/map/VillageMap";
import { UploadArea } from "@/components/common/UploadArea";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";
import { useDemo } from "@/components/providers/DemoProvider";
import { can } from "@/lib/permissions";
import { UserRole } from "@/types";

const issueTypes = ["环境卫生", "道路通行", "公共照明", "绿化问题", "水体环境", "公共设施", "安全隐患", "其他建议"];

const schema = z.object({
  title: z.string().min(4, "问题标题至少需要 4 个字").max(50, "问题标题不能超过 50 个字"),
  description: z.string().min(10, "请至少用 10 个字说明现场情况").max(500, "问题描述不能超过 500 个字"),
  affectsDailyLife: z.boolean(),
  urgent: z.boolean(),
  publicName: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const steps = ["选择位置", "问题类型", "填写问题", "上传照片", "确认提交"];

export function IssueReportWizard() {
  const { role, setRole, submitIssue } = useDemo();
  const [step, setStep] = useState(0);
  const [position, setPosition] = useState({ x: 50, y: 52, longitude: 113.6218, latitude: 22.9127, selected: false });
  const [type, setType] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submittedCode, setSubmittedCode] = useState("");
  const { register, getValues, trigger, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { title: "", description: "", affectsDailyLife: true, urgent: false, publicName: false } });

  if (!can(role, "reportIssue")) {
    return (
      <section className="access-gate"><ShieldCheck size={42} /><DemoDataBadge /><h2>请切换为村民角色后上报</h2><p>游客可以浏览公开问题，但正式上报需要村民身份。Demo 不要求真实登录。</p><button className="button button-primary" onClick={() => setRole(UserRole.Resident)}>切换为村民并继续</button><Link href="/map" className="button button-text">返回行动地图</Link></section>
    );
  }

  const chooseLocation = (x: number, y: number) => setPosition({ x, y, selected: true, longitude: 113.618 + x * 0.00008, latitude: 22.909 + (100 - y) * 0.000075 });

  const next = async () => {
    if (step === 0 && !position.selected) return;
    if (step === 1 && !type) return;
    if (step === 2) {
      const valid = await trigger(["title", "description", "affectsDailyLife", "urgent", "publicName"]);
      if (!valid) return;
    }
    setStep((current) => Math.min(4, current + 1));
  };

  const submit = () => {
    const values = getValues();
    const issue = submitIssue({ ...values, type, location: "地图自选位置（演示）", longitude: position.longitude, latitude: position.latitude, imageLabel: files.length ? `${files.length} 张本地预览照片` : "未上传照片" });
    setSubmittedId(issue.id);
    setSubmittedCode(issue.code);
  };

  if (submittedId) {
    return (
      <section className="report-success"><span className="success-icon"><CheckCircle2 size={44} /></span><DemoDataBadge /><h2>上报成功</h2><p>模拟编号</p><strong>{submittedCode}</strong><div className="success-status"><span>当前状态</span><b>待审核</b></div><p>这条问题已加入当前演示会话，你可以在个人中心查看，也可以打开详情页继续演示办理流程。</p><div><Link className="button button-primary" href={`/issues/${submittedId}`}>查看办理进度</Link><Link className="button button-secondary" href="/profile">前往个人中心</Link><Link className="button button-text" href="/map">返回地图</Link></div></section>
    );
  }

  return (
    <div className="report-wizard">
      <ol className="wizard-steps">{steps.map((item, index) => <li key={item} className={index === step ? "active" : index < step ? "done" : ""}><span>{index < step ? <Check size={16} /> : index + 1}</span><b>{item}</b></li>)}</ol>
      <section className="wizard-card">
        {step === 0 ? <div className="wizard-section"><div className="wizard-title"><span>步骤 1 / 5</span><h2>选择问题所在位置</h2><p>点击简化地图中的大致位置，或使用当前地图中心。Demo 不调用真实定位。</p></div><div className="report-location-map"><VillageMap features={[]} selectedId="" onSelect={() => undefined} interactiveLocation onMapClick={chooseLocation} />{position.selected ? <span className="chosen-location" style={{ left: `${position.x}%`, top: `${position.y}%` }}><MapPin size={24} /></span> : null}</div><div className="location-summary"><button className="button button-secondary" onClick={() => chooseLocation(50, 52)}><LocateFixed size={17} />使用当前地图中心</button><div><span>选中坐标（演示）</span><strong>{position.selected ? `${position.longitude.toFixed(5)}, ${position.latitude.toFixed(5)}` : "尚未选择位置"}</strong></div></div>{!position.selected ? <p className="field-error">请先在地图中选择一个位置。</p> : null}</div> : null}

        {step === 1 ? <div className="wizard-section"><div className="wizard-title"><span>步骤 2 / 5</span><h2>选择问题类型</h2><p>请选择最接近现场情况的一类，管理员审核时仍可调整。</p></div><div className="issue-type-grid">{issueTypes.map((item) => <button key={item} className={type === item ? "active" : ""} onClick={() => setType(item)}><span>{type === item ? <Check size={18} /> : item.slice(0, 1)}</span><strong>{item}</strong></button>)}</div>{!type ? <p className="field-error">请选择一个问题类型。</p> : null}</div> : null}

        {step === 2 ? <div className="wizard-section"><div className="wizard-title"><span>步骤 3 / 5</span><h2>说明你观察到的问题</h2><p>请尽量描述“在哪里、什么情况、什么时候容易发生”，不用写专业判断。</p></div><div className="form-stack"><label className="field-label">问题标题<span>必填</span><input className="text-input" {...register("title")} placeholder="例如：村巷一处路灯夜间不亮" />{errors.title ? <small className="field-error">{errors.title.message}</small> : null}</label><label className="field-label">问题描述<span>必填</span><textarea className="text-area" {...register("description")} placeholder="请具体说明现场情况，以及对日常生活的影响……" />{errors.description ? <small className="field-error">{errors.description.message}</small> : null}</label><fieldset className="check-fieldset"><legend>补充信息</legend><label className="check-row"><input type="checkbox" {...register("affectsDailyLife")} />这个问题会影响日常生活</label><label className="check-row"><input type="checkbox" {...register("urgent")} />希望尽快安排现场确认</label><label className="check-row"><input type="checkbox" {...register("publicName")} />允许在公开页面显示我的姓名</label></fieldset></div></div> : null}

        {step === 3 ? <div className="wizard-section"><div className="wizard-title"><span>步骤 4 / 5</span><h2>上传现场照片</h2><p>照片可以帮助管理员了解现场。上传并非必填，本阶段仅在浏览器中预览。</p></div><UploadArea onChange={setFiles} /><div className="privacy-note"><ShieldCheck size={18} /><p><strong>上传提示</strong>请避免包含清晰人脸、车牌和私人信息。正式平台将增加隐私处理和存储规则。</p></div></div> : null}

        {step === 4 ? <div className="wizard-section"><div className="wizard-title"><span>步骤 5 / 5</span><h2>确认上报内容</h2><p>提交后状态为“待审核”。管理员可以核实信息、调整分类和分派处理。</p></div><dl className="report-summary"><div><dt>问题位置</dt><dd>地图自选位置（演示）<small>{position.longitude.toFixed(5)}, {position.latitude.toFixed(5)}</small></dd></div><div><dt>问题类型</dt><dd>{type}</dd></div><div><dt>问题标题</dt><dd>{getValues("title")}</dd></div><div><dt>问题描述</dt><dd>{getValues("description")}</dd></div><div><dt>影响日常生活</dt><dd>{getValues("affectsDailyLife") ? "是" : "否"}</dd></div><div><dt>希望尽快处理</dt><dd>{getValues("urgent") ? "是" : "否"}</dd></div><div><dt>现场照片</dt><dd>{files.length ? `${files.length} 张本地预览照片` : "未上传"}</dd></div></dl><label className="check-row confirmation-check"><input type="checkbox" defaultChecked />我确认以上内容为演示提交，不代表红塘村真实问题。</label></div> : null}

        <div className="wizard-actions">{step > 0 ? <button className="button button-secondary" onClick={() => setStep((current) => current - 1)}><ArrowLeft size={17} />上一步</button> : <Link className="button button-text" href="/map">取消并返回地图</Link>}<span>已自动保存当前表单内容</span>{step < 4 ? <button className="button button-primary" onClick={next}>下一步 <ArrowRight size={17} /></button> : <button className="button button-primary" onClick={submit}><Check size={17} />确认提交</button>}</div>
      </section>
    </div>
  );
}
