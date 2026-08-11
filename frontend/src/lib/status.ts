export type StatusBucket = "danger" | "warning" | "success" | "info" | "neutral";

/**
 * Classifies a backend workflow/review/hold status string into a semantic
 * bucket for consistent coloring across badges, charts, and cards. This is
 * a purely visual grouping — the label rendered anywhere is always the
 * backend's own value, never this bucket name.
 */
const DANGER = new Set(["on_hold", "rejected", "cancelled", "modification_requested", "critical", "degraded", "offline", "rejected_by_prescriber", "blocked"]);
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
  "escalated",
  "flagged_for_review",
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
  "auto_cleared",
]);
const INFO = new Set(["submitted_for_analysis", "safety_analysis_complete", "training", "aggregating", "submitted", "acknowledged"]);

export function statusBucket(value: string): StatusBucket {
  const v = value.toLowerCase();
  if (DANGER.has(v)) return "danger";
  if (WARNING.has(v)) return "warning";
  if (SUCCESS.has(v)) return "success";
  if (INFO.has(v)) return "info";
  return "neutral";
}
