import Link from "next/link";
import { ArrowRight, Droplets, History, Leaf, ShieldAlert, Sprout } from "lucide-react";
import { villageMatters } from "@/data/villageMatters";

const icons = {
  garden: Sprout,
  tea: Leaf,
  water: Droplets,
  safety: ShieldAlert,
  history: History,
};

export function VillageMatterOverview() {
  return (
    <div className="village-matter-grid">
      {villageMatters.map((matter) => {
        const Icon = icons[matter.icon];
        return (
          <Link className={`village-matter-card matter-${matter.icon}`} href={matter.relatedHref} key={matter.id}>
            <span className="village-matter-icon"><Icon size={28} /></span>
            <span className="village-matter-copy"><strong>{matter.title}</strong><small>{matter.subtitle}</small></span>
            <ArrowRight size={20} aria-hidden="true" />
          </Link>
        );
      })}
    </div>
  );
}
