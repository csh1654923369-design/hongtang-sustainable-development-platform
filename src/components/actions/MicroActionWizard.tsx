"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, LocateFixed, MapPin, Sparkles, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";
import { VillageMap } from "@/components/map/VillageMap";
import { useDemo } from "@/components/providers/DemoProvider";
import { can } from "@/lib/permissions";
import { contentService } from "@/services/content";
import { MicroAction, UserRole } from "@/types";

const stepLabels = ["行动意图", "选择位置", "盘点资源", "行动约定", "确认提交"];

const splitItems = (value: string) => value
  .split(/[、，,\n]/)
  .map((item) => item.trim())
  .filter(Boolean);

export function MicroActionWizard() {
  const { role, setRole, submitMicroAction } = useDemo();
  const goals = useMemo(() => contentService.getGoals(), []);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<MicroAction | null>(null);
  const [position, setPosition] = useState({ x: 50, y: 52, longitude: 113.622, latitude: 22.9126, selected: false });
  const [values, setValues] = useState({
    title: "",
    summary: "",
    desiredChange: "",
    goalId: "goal-livable",
    location: "",
    durationDays: "30",
    existingAssets: "",
    neededResources: "",
    rolesNeeded: "",
    nextStep: "",
    maintenancePlan: "",
    decisionMethod: "试验记录、现场讨论和受影响使用者意见共同决定",
    agreed: false,
  });

  const update = (field: keyof typeof values, value: string | boolean) => setValues((current) => ({ ...current, [field]: value }));
  const chooseLocation = (x: number, y: number) => setPosition({ x, y, selected: true, longitude: 113.618 + x * 0.00008, latitude: 22.909 + (100 - y) * 0.000075 });

  const validate = () => {
    if (step === 0 && (!values.title.trim() || !values.summary.trim() || !values.desiredChange.trim())) return "请填写行动名称、简要说明和希望发生的变化。";
    if (step === 1 && (!position.selected || !values.location.trim())) return "请在地图选择大致位置，并填写地点名称。";
    if (step === 2 && (!splitItems(values.existingAssets).length || !splitItems(values.neededResources).length || !splitItems(values.rolesNeeded).length)) return "请至少填写一项已有资源、一项仍需资源和一种希望招募的角色。";
    if (step === 3 && (!values.nextStep.trim() || !values.maintenancePlan.trim() || !values.agreed)) return "请填写第一次行动和后续维护安排，并确认轻量核对规则。";
    return "";
  };

  const next = () => {
    const message = validate();
    if (message) { setError(message); return; }
    setError("");
    setStep((current) => Math.min(4, current + 1));
  };

  const submit = () => {
    const action = submitMicroAction({
      title: values.title.trim(),
      summary: values.summary.trim(),
      desiredChange: values.desiredChange.trim(),
      goalId: values.goalId,
      location: values.location.trim(),
      longitude: position.longitude,
      latitude: position.latitude,
      mapX: position.x,
      mapY: position.y,
      durationDays: Number(values.durationDays),
      existingAssets: splitItems(values.existingAssets),
      neededResources: splitItems(values.neededResources),
      rolesNeeded: splitItems(values.rolesNeeded),
      nextStep: values.nextStep.trim(),
      maintenancePlan: values.maintenancePlan.trim(),
      decisionMethod: values.decisionMethod.trim(),
    });
    setResult(action);
  };

  if (!can(role, "startAction")) return (
    <section className="access-gate">
      <Sparkles size={42} />
      <DemoDataBadge />
      <h2>发起行动需要一个共建身份</h2>
      <p>游客可以浏览行动。切换为村民或协作者后，可以发起 30 至 90 天的小规模试验。</p>
      <div><button className="button button-primary" onClick={() => setRole(UserRole.Resident)}>以村民身份发起</button><button className="button button-secondary" onClick={() => setRole(UserRole.Collaborator)}>以协作者身份发起</button></div>
    </section>
  );

  if (result) return (
    <section className="report-success action-success" data-testid="micro-action-success">
      <CheckCircle2 size={54} />
      <DemoDataBadge label="演示微行动" />
      <h2>微行动已提交</h2>
      <p>平台只进行安全、权限、隐私和资源冲突的轻量核对，不会代替发起人决定行动内容。</p>
      <strong>{result.code}</strong>
      <div className="success-actions"><Link href="/profile" className="button button-primary">前往“我的行动”</Link><Link href="/" className="button button-secondary">返回首页</Link></div>
    </section>
  );

  return (
    <div className="action-wizard" data-testid="micro-action-form">
      <ol className="wizard-steps">{stepLabels.map((label, index) => <li key={label} className={index === step ? "active" : index < step ? "done" : ""}><span>{index < step ? <Check size={17} /> : index + 1}</span>{label}</li>)}</ol>
      <section className="wizard-card">
        <div className="wizard-section">
          {step === 0 ? <div><div className="wizard-title"><span>步骤 1 / 5</span><h2>从一个可以共同尝试的小变化开始</h2><p>不要求一次解决全部问题，先说明谁会受益、准备试什么。</p></div><div className="form-stack action-form-grid"><label className="field-label">行动名称<input className="text-input" value={values.title} onChange={(event) => update("title", event.target.value)} placeholder="例如：村口午后遮阴 30 天试验" /></label><label className="field-label">关联本地目标<select className="select-input" value={values.goalId} onChange={(event) => update("goalId", event.target.value)}>{goals.map((goal) => <option value={goal.id} key={goal.id}>{goal.title}</option>)}</select></label><label className="field-label action-span-two">简要说明<textarea className="text-area" value={values.summary} onChange={(event) => update("summary", event.target.value)} placeholder="准备通过什么小试验改善哪个日常场景？" /></label><label className="field-label action-span-two">希望发生的变化<textarea className="text-area" value={values.desiredChange} onChange={(event) => update("desiredChange", event.target.value)} placeholder="请说明哪些使用者会受益，以及希望观察到什么改变。" /></label></div></div> : null}

          {step === 1 ? <div><div className="wizard-title"><span>步骤 2 / 5</span><h2>把行动放回具体位置</h2><p>仅公开大致点位。家庭住址和个人联系方式不会进入地图。</p></div><div className="report-location-map" data-testid="micro-action-map"><VillageMap features={[]} selectedId="" onSelect={() => undefined} interactiveLocation onMapClick={chooseLocation} />{position.selected ? <span className="chosen-location" style={{ left: `${position.x}%`, top: `${position.y}%` }}><MapPin size={24} /></span> : null}</div><div className="location-summary"><button className="button button-secondary" onClick={() => chooseLocation(50, 52)}><LocateFixed size={17} />使用地图中心</button><div><span>演示坐标</span><strong>{position.selected ? `${position.longitude.toFixed(5)}, ${position.latitude.toFixed(5)}` : "尚未选择位置"}</strong></div></div><label className="field-label">地点名称<input className="text-input" value={values.location} onChange={(event) => update("location", event.target.value)} placeholder="例如：村口公共空间（大致位置）" /></label></div> : null}

          {step === 2 ? <div><div className="wizard-title"><span>步骤 3 / 5</span><h2>先看见已有能力，再提出资源需求</h2><p>可用逗号、顿号或换行分隔多项内容。</p></div><div className="form-stack"><label className="field-label">已经具备什么？<textarea className="text-area" value={values.existingAssets} onChange={(event) => update("existingAssets", event.target.value)} placeholder="例如：3 名发起人、可移动座椅、已有观察记录" /></label><label className="field-label">还需要什么？<textarea className="text-area" value={values.neededResources} onChange={(event) => update("neededResources", event.target.value)} placeholder="例如：遮阴材料、工具、活动空间、地方经验" /></label><label className="field-label">希望哪些伙伴加入？<textarea className="text-area" value={values.rolesNeeded} onChange={(event) => update("rolesNeeded", event.target.value)} placeholder="例如：长者体验者、现场记录员、简易搭建协助" /></label></div></div> : null}

          {step === 3 ? <div><div className="wizard-title"><span>步骤 4 / 5</span><h2>约定第一次行动和结束后的责任</h2><p>小行动也需要说清楚时间边界、决策方式和维护责任。</p></div><div className="form-stack action-form-grid"><label className="field-label">试验周期<select className="select-input" value={values.durationDays} onChange={(event) => update("durationDays", event.target.value)}><option value="30">30 天</option><option value="60">60 天</option><option value="90">90 天</option></select></label><label className="field-label">共同决定方式<input className="text-input" value={values.decisionMethod} onChange={(event) => update("decisionMethod", event.target.value)} /></label><label className="field-label action-span-two">第一次具体行动<textarea className="text-area" value={values.nextStep} onChange={(event) => update("nextStep", event.target.value)} placeholder="说明时间、地点和准备完成的小任务。" /></label><label className="field-label action-span-two">维护或退出安排<textarea className="text-area" value={values.maintenancePlan} onChange={(event) => update("maintenancePlan", event.target.value)} placeholder="试验结束后由谁收纳、复盘；若继续实施，由谁确认维护责任？" /></label><label className="check-row action-span-two"><input type="checkbox" checked={values.agreed} onChange={(event) => update("agreed", event.target.checked)} />我理解平台会核对安全、权限、隐私和资源冲突；涉及施工、资金或公共安全时，需要另行确认。</label></div></div> : null}

          {step === 4 ? <div><div className="wizard-title"><span>步骤 5 / 5</span><h2>确认这是一项可开始、可学习的行动</h2><p>提交后先进入轻量核对；通过后可在地图公开招募伙伴和资源。</p></div><div className="action-review"><article><span>行动</span><h3>{values.title}</h3><p>{values.summary}</p><small>{values.durationDays} 天 · {values.location}</small></article><article><span>希望改变</span><p>{values.desiredChange}</p></article><article><span>已有资源</span><div className="chip-list">{splitItems(values.existingAssets).map((item) => <i key={item}>{item}</i>)}</div></article><article><span>仍需资源与伙伴</span><div className="chip-list">{[...splitItems(values.neededResources), ...splitItems(values.rolesNeeded)].map((item) => <i key={item}>{item}</i>)}</div></article><article><span>第一次行动</span><p>{values.nextStep}</p><small>决策：{values.decisionMethod}</small></article><article><span>维护安排</span><p>{values.maintenancePlan}</p></article></div></div> : null}

          {error ? <p className="field-error action-error">{error}</p> : null}
        </div>
        <div className="wizard-actions"><div>{step > 0 ? <button className="button button-secondary" onClick={() => { setError(""); setStep((current) => current - 1); }}><ArrowLeft size={17} />上一步</button> : null}</div><span><UsersRound size={15} />行动通过后可公开招募伙伴</span>{step < 4 ? <button className="button button-primary" onClick={next}>下一步 <ArrowRight size={17} /></button> : <button className="button button-primary" onClick={submit}>确认提交 <Check size={17} /></button>}</div>
      </section>
    </div>
  );
}
