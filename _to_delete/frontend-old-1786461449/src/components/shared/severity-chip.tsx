import { AlertOctagon, AlertTriangle, Info, MinusCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEnumLabel } from "@/lib/format";

/**
 * Renders whatever severity string the backend returns. The color/icon
 * mapping below is a *visual* affordance for scanning only — for a
 * recognized value (critical/high/moderate/low) we use the matching scale;
 * for anything else we fall back to a neutral "unknown" style but still
 * print the backend's exact label. No severity is ever computed here.
 */
const KNOWN: Record<string, { bg: string; fg: string; border: string; icon: LucideIcon }> = {
  critical: {
    bg: "bg-severity-critical-bg",
    fg: "text-severity-critical",
    border: "border-severity-critical-border",
    icon: AlertOctagon,
  },
  high: {
    bg: "bg-severity-high-bg",
    fg: "text-severity-high",
    border: "border-severity-high-border",
    icon: AlertTriangle,
  },
  moderate: {
    bg: "bg-severity-moderate-bg",
    fg: "text-severity-moderate",
    border: "border-severity-moderate-border",
    icon: Info,
  },
  low: {
    bg: "bg-severity-low-bg",
    fg: "text-severity-low",
    border: "border-severity-low-border",
    icon: MinusCircle,
  },
};

export function SeverityChip({
  severity,
  className,
  size = "default",
}: {
  severity: string | null | undefined;
  className?: string;
  size?: "sm" | "default";
}) {
  if (!severity) {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground", className)}>
        No issues
      </span>
    );
  }
  const key = severity.toLowerCase();
  const style = KNOWN[key] ?? {
    bg: "bg-severity-unknown-bg",
    fg: "text-severity-unknown",
    border: "border-severity-unknown-border",
    icon: Info,
  };
  const Icon = style.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-medium",
        style.bg,
        style.fg,
        style.border,
        size === "sm" ? "text-[11px]" : "text-xs",
        className
      )}
      title={severity}
    >
      <Icon className={size === "sm" ? "size-3" : "size-3.5"} />
      {formatEnumLabel(severity)}
    </span>
  );
}
