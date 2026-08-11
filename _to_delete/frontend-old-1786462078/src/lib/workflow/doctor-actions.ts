import { CheckCircle2, ClipboardEdit, MessageSquareText, Send, ThumbsUp } from "lucide-react";
import type { WorkflowAction } from "@/components/shared/workflow-action-panel";
import type { PrescriptionWorkflowStatus } from "@/lib/types";

const REVIEWABLE: PrescriptionWorkflowStatus[] = [
  "pending_doctor_review",
  "doctor_review_in_progress",
  "modification_requested",
  "pharmacist_review_requested",
];

/** Backend-owned: which doctor actions are legal from the current workflow
 * status. The UI only renders what this returns — it never infers new
 * transitions on its own. */
export function getDoctorActions(status: PrescriptionWorkflowStatus): WorkflowAction[] {
  if (!REVIEWABLE.includes(status)) return [];

  const actions: WorkflowAction[] = [
    {
      key: "accept_recommendation",
      label: "Accept agent recommendation",
      description: "Acknowledge the safety analysis and move this to pharmacy review.",
      icon: ThumbsUp,
      variant: "outline",
    },
    {
      key: "modify",
      label: "Modify prescription",
      description: "Record what you're changing before resubmitting.",
      icon: ClipboardEdit,
      variant: "outline",
      requiresNote: true,
      noteRequired: true,
      noteLabel: "What are you modifying?",
      notePlaceholder: "e.g. Reduced Lisinopril dose to 5 mg given renal function flag",
    },
    {
      key: "request_pharmacist_review",
      label: "Request pharmacist review",
      description: "Send this directly to pharmacy for a second look before approval.",
      icon: Send,
      variant: "outline",
    },
    {
      key: "add_justification",
      label: "Add clinical justification",
      description: "Document your clinical reasoning against a flagged issue.",
      icon: MessageSquareText,
      variant: "outline",
      requiresNote: true,
      noteRequired: true,
      noteLabel: "Clinical justification",
      notePlaceholder: "Explain why you are proceeding despite the flagged issue…",
    },
    {
      key: "approve",
      label: "Approve prescription",
      description: "Final clinical approval — routes to pharmacy for dispensing review.",
      icon: CheckCircle2,
      variant: "default",
    },
  ];

  return actions;
}
