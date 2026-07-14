import { ReactNode } from "react";
import { DemoDataBadge } from "@/components/common/DemoDataBadge";

export function PageHeader({ eyebrow, title, description, actions, demo = true }: { eyebrow?: string; title: string; description: string; actions?: ReactNode; demo?: boolean }) {
  return (
    <section className="page-heading page-container">
      <div><div className="eyebrow-line">{eyebrow ? <span>{eyebrow}</span> : null}{demo ? <DemoDataBadge /> : null}</div><h1>{title}</h1><p>{description}</p></div>
      {actions ? <div className="page-heading-actions">{actions}</div> : null}
    </section>
  );
}
