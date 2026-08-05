import { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <section className="page-heading page-container">
      <div>
        <div className="eyebrow-line">{eyebrow ? <span>{eyebrow}</span> : null}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="page-heading-actions">{actions}</div> : null}
    </section>
  );
}
