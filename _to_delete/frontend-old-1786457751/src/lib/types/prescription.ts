import type { IsoDateTime } from "./common";
import type { PatientSummary } from "./patient";
import type { DoctorRef, PharmacistRef } from "./user";

/**
 * Backend-owned prescription workflow state machine. The UI only ever
 * displays this value and gates available actions from it — it never
 * infers or advances state on its own.
 */
export type PrescriptionWorkflowStatus =
  | "draft"
  | "submitted_for_analysis"
  | "safety_analysis_in_progress"
  | "safety_analysis_complete"
  | "pending_doctor_review"
  | "doctor_review_in_progress"
  | "modification_requested"
  | "pharmacist_review_requested"
  | "doctor_approved"
  | "pending_pharmacist_review"
  | "pharmacist_review_in_progress"
  | "on_hold"
  | "approved_for_dispensing"
  | "dispensed"
  | "cancelled"
  | "rejected"
  | string;

export type MedicationRoute =
  | "oral"
  | "iv"
  | "im"
  | "subcutaneous"
  | "topical"
  | "inhalation"
  | "rectal"
  | "sublingual"
  | "ophthalmic"
  | "other"
  | string;

export interface MedicationItem {
  id: string;
  medicationName: string;
  strength: string;
  dosage: string;
  route: MedicationRoute;
  frequency: string;
  duration: string;
  indication: string;
  specialInstructions?: string;
  startDate: IsoDateTime;
}

export interface Prescription {
  id: string;
  displayId: string;
  patient: PatientSummary;
  prescriber: DoctorRef;
  medicationItems: MedicationItem[];
  knownAllergies: string[];
  clinicalNotes?: string;
  workflowStatus: PrescriptionWorkflowStatus;
  medicationCount: number;
  highestSeverity: string | null;
  assignedReviewer?: PharmacistRef | DoctorRef | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface PrescriptionListItem {
  id: string;
  displayId: string;
  patient: PatientSummary;
  prescriber: DoctorRef;
  medicationCount: number;
  highestSeverity: string | null;
  workflowStatus: PrescriptionWorkflowStatus;
  assignedReviewer?: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}
