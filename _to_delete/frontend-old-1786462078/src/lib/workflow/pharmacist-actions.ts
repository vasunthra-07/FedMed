import { CheckCircle2, PackageCheck, PauseCircle, RotateCcw, Undo2 } from "lucide-react";
import type { WorkflowAction } from "@/components/shared/workflow-action-panel";
import type { PrescriptionWorkflowStatus } from "@/lib/types";

/** Backend-owned: which pharmacist actions are legal from the current
 * workflow status. Mirrors the doctor-side gating in doctor-actions.ts. */
export function getPharmacistActions(status: PrescriptionWorkflowStatus): WorkflowAction[] {
  switch (status) {
    case "pending_pharmacist_review":
    case "pharmacist_review_in_progress":
      return [
        {
          key: "approve_dispensing",
          label: "Approve for dispensing",
          description: "Clears this prescription to move to dispensing.",
          icon: CheckCircle2,
          variant: "default",
        },
        {
          key: "place_on_hold",
          label: "Place on hold",
          description: "Blocks dispensing until the hold reason is resolved.",
          icon: PauseCircle,
          variant: "outline",
          requiresNote: true,
          noteRequired: true,
          noteLabel: "Hold reason",
          notePlaceholder: "e.g. Awaiting prescriber clarification on renal dosing",
        },
        {
          key: "request_modification",
          label: "Request modification",
          description: "Sends this back to the prescribing doctor with your notes.",
          icon: RotateCcw,
          variant: "outline",
          requiresNote: true,
          noteRequired: true,
          noteLabel: "What needs to change?",
          notePlaceholder: "e.g. Please confirm dose given eGFR 42",
        },
      ];
    case "on_hold":
      return [
        {
          key: "release_hold",
          label: "Release hold",
          description: "Returns this prescription to active pharmacist review.",
          icon: Undo2,
          variant: "default",
        },
        {
          key: "request_modification",
          label: "Request modification",
          description: "Sends this back to the prescribing doctor with your notes.",
          icon: RotateCcw,
          variant: "outline",
          requiresNote: true,
          noteRequired: true,
          noteLabel: "What needs to change?",
          notePlaceholder: "e.g. Please confirm dose given eGFR 42",
        },
      ];
    case "approved_for_dispensing":
      return [
        {
          key: "mark_dispensed",
          label: "Mark as dispensed",
          description: "Completes the dispensing workflow for this prescription.",
          icon: PackageCheck,
          variant: "default",
        },
      ];
    default:
      return [];
  }
}
