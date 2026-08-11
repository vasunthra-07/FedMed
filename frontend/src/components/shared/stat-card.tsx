import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONE_STYLES: Record<string, { text: string; bar: string; chipBg: string; chipFg: string }> = {
  neutral: { text: "text-foreground", bar: "bg-border", chipBg: "bg-muted", chipFg: "text-muted-foreground" },
  danger: { text: "text-status-danger", bar: "bg-status-danger", chipBg: "bg-status-danger-bg", chipFg: "text-status-danger" },
  warning: { text: "text-status-warning", bar: "bg-status-warning", chipBg: "bg-status-warning-bg", chipFg: "text-status-warning" },
  success: { text: "text-status-success", bar: "bg-status-success", chipBg: "bg-status-success-bg", chipFg: "text-status-success" },
  info: { text: "text-status-info", bar: "bg-status-info", chipBg: "bg-status-info-bg", chipFg: "text-status-info" },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  tone?: "neutral" | "danger" | "warning" | "success" | "info";
  hint?: string;
  className?: string;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <Card className={cn("gap-0 overflow-hidden py-0", className)}>
      <div className={cn("h-1 w-full", styles.bar)} aria-hidden />
      <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className={cn("mt-1.5 text-[1.75rem] leading-none font-semibold tracking-tight", styles.text)}>{value}</p>
          {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", styles.chipBg, styles.chipFg)}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
    </Card>
  );
}
