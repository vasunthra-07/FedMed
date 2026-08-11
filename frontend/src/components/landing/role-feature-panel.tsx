import Link from "next/link";
import { ArrowRight, CheckCircle2, type LucideIcon } from "lucide-react";
import { InterfacePreviewMockup } from "@/components/shared/interface-preview-mockup";

export interface RoleFeaturePanelProps {
  icon: LucideIcon;
  title: string;
  description: string;
  bullets: string[];
  href: string;
  previewUrl: string;
  previewActiveLabel: string;
}

export function RoleFeaturePanel({
  icon: Icon,
  title,
  description,
  bullets,
  href,
  previewUrl,
  previewActiveLabel,
}: RoleFeaturePanelProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card">
      <div className="p-5 pb-0">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Icon className="size-4.5" />
        </span>
        <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <ul className="mt-3 flex flex-col gap-1.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-primary/60" />
              {b}
            </li>
          ))}
        </ul>
      </div>

      <div className="p-5">
        <InterfacePreviewMockup url={previewUrl} activeLabel={previewActiveLabel} hideSidebar className="pointer-events-none" />
      </div>

      <Link
        href={href}
        className="group mt-auto flex items-center justify-between gap-2 border-t bg-surface-alt px-5 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary-soft"
      >
        View role
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
