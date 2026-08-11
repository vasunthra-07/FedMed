import type { IsoDateTime } from "./common";
import type { PatientSummary } from "./patient";
import type { DoctorRef, PharmacistRef } from "./user";

export type PharmacyReviewStatus =
  | "queued"
  | "in_review"
  | "on_hold"
  | "modification_requested"
  | "approved"
  | "dispensed"
  | string;

export type HoldStatus = "none" | "on_hold" | "hold_released" | string;

export interface PharmacyQueueItem {
  queueId: string;
  prescriptionId: string;
  prescriptionDisplayId: string;
  patient: PatientSummary;
  prescriber: DoctorRef;
  highestSeverity: string | null;
  reviewStatus: PharmacyReviewStatus;
  holdStatus: HoldStatus;
  holdReason?: string | null;
  assignedPharmacist?: PharmacistRef | null;
  queuedAt: IsoDateTime;
}

export type InterventionType =
  | "dose_correction"
  | "drug_substitution_suggested"
  | "prescriber_contacted"
  | "allergy_flag_resolved"
  | "monitoring_added"
  | "prescription_held"
  | string;

export type InterventionOutcome =
  | "accepted_by_prescriber"
  | "rejected_by_prescriber"
  | "prescription_modified"
  | "prescription_cancelled"
  | "pending"
  | string;

export interface Intervention {
  id: string;
  prescriptionId: string;
  prescriptionDisplayId: string;
  patient: PatientSummary;
  medicationLabel: string;
  interventionType: InterventionType;
  outcome: InterventionOutcome;
  pharmacist: PharmacistRef;
  notes: string;
  recordedAt: IsoDateTime;
}

export type NearMissCategory =
  | "wrong_dose"
  | "wrong_medication"
  | "wrong_route"
  | "drug_interaction_caught"
  | "allergy_caught"
  | "duplicate_therapy_caught"
  | "documentation_error"
  | string;

export interface NearMiss {
  id: string;
  displayId: string;
  prescriptionId: string;
  prescriptionDisplayId: string;
  patient: PatientSummary;
  medicationLabel: string;
  category: NearMissCategory;
  severity: string;
  detectedBy: string;
  interventionTaken: string;
  outcome: InterventionOutcome;
  notes?: string;
  recordedAt: IsoDateTime;
}
