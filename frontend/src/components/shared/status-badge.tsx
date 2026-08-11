import { cn } from "@/lib/utils";
import { formatEnumLabel } from "@/lib/format";
import { statusBucket } from "@/lib/status";

const STYLES: Record<string, string> = {
  danger: "bg-status-danger-bg text-status-danger border-status-danger/25",
  warning: "bg-status-warning-bg text-status-warning border-status-warning/25",
  success: "bg-status-success-bg text-status-success border-status-success/25",
  info: "bg-status-info-bg text-status-info border-status-info/25",
  neutral: "bg-status-neutral-bg text-status-neutral border-status-neutral/20",
};

/**
 * Visual bucket for a workflow/review/hold status string, purely for
 * scanability (color-coding). The label rendered is always the backend's
 * own value (formatted for display) — this never overrides or infers state.
 */
export function StatusBadge({
  status,
  className,
  dot = true,
}: {
  status: string | null | undefined;
  className?: string;
  dot?: boolean;
}) {
  if (!status) {
    return <span className={cn("text-xs text-muted-foreground", className)}>—</span>;
  }
  const bucket = statusBucket(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STYLES[bucket],
        className
      )}
      title={status}
    >
      {dot && <span className={cn("size-1.5 shrink-0 rounded-full bg-current")} />}
      {formatEnumLabel(status)}
    </span>
  );
}
