import { cn } from "@/lib/utils";
import { formatEnumLabel } from "@/lib/format";

/**
 * Visual bucket for a workflow/review/hold status string, purely for
 * scanability (color-coding). The label rendered is always the backend's
 * own value (formatted for display) — this never overrides or infers state.
 */
const DANGER = new Set(["on_hold", "rejected", "cancelled", "modification_requested", "critical", "degraded", "offline", "rejected_by_prescriber"]);
const WARNING = new Set([
  "pending_doctor_review",
  "pending_pharmacist_review",
  "pharmacist_review_requested",
  "doctor_review_in_progress",
  "pharmacist_review_in_progress",
  "safety_analysis_in_progress",
  "queued",
  "in_review",
  "pending",
  "syncing",
]);
const SUCCESS = new Set([
  "dispensed",
  "approved",
  "approved_for_dispensing",
  "doctor_approved",
  "resolved",
  "action_taken",
  "accepted",
  "accepted_by_prescriber",
  "online",
  "completed",
  "hold_released",
  "clear",
]);
const INFO = new Set(["submitted_for_analysis", "safety_analysis_complete", "training", "aggregating", "submitted", "acknowledged"]);

function bucketFor(value: string): "danger" | "warning" | "success" | "info" | "neutral" {
  const v = value.toLowerCase();
  if (DANGER.has(v)) return "danger";
  if (WARNING.has(v)) return "warning";
  if (SUCCESS.has(v)) return "success";
  if (INFO.has(v)) return "info";
  return "neutral";
}

const STYLES: Record<string, string> = {
  danger: "bg-status-danger-bg text-status-danger border-status-danger/25",
  warning: "bg-status-warning-bg text-status-warning border-status-warning/25",
  success: "bg-status-success-bg text-status-success border-status-success/25",
  info: "bg-status-info-bg text-status-info border-status-info/25",
  neutral: "bg-status-neutral-bg text-status-neutral border-status-neutral/20",
};

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
  const bucket = bucketFor(status);
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
