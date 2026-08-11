import type { IsoDateTime } from "./common";

export type AuditActorType = "doctor" | "pharmacist" | "agent" | "system" | "admin" | string;

export type AuditEventType =
  | "prescription_created"
  | "safety_analysis_started"
  | "safety_analysis_completed"
  | "doctor_review_started"
  | "recommendation_accepted"
  | "prescription_modified"
  | "pharmacist_review_requested"
  | "clinical_justification_added"
  | "prescription_approved"
  | "pharmacy_review_started"
  | "prescription_held"
  | "modification_requested"
  | "hold_released"
  | "prescription_dispensed"
  | "intervention_recorded"
  | "near_miss_recorded"
  | "prescription_cancelled"
  | "prescription_rejected"
  | string;

export interface AuditEvent {
  id: string;
  prescriptionId: string;
  prescriptionDisplayId: string;
  eventType: AuditEventType;
  actorType: AuditActorType;
  actorName: string;
  summary: string;
  detail?: string;
  resultingStatus: string;
  timestamp: IsoDateTime;
}
