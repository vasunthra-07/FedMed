import type { IsoDateTime, SeverityLevel } from "./common";
import type { DoctorRef } from "./user";

export type Gender = "male" | "female" | "other" | "unspecified";

export type PrescriptionStatusSummary =
  | "no_active_prescription"
  | "draft"
  | "pending_review"
  | "on_hold"
  | "approved"
  | "dispensed"
  | string;

export interface Patient {
  id: string;
  mrn: string;
  name: string;
  age: number;
  gender: Gender;
  dateOfBirth: IsoDateTime;
  contactPhone?: string;
  assignedDoctor: DoctorRef;
  knownAllergies: string[];
  activePrescriptionCount: number;
  activeMedicationAlertCount: number;
  highestAlertSeverity: SeverityLevel | null;
  latestPrescriptionStatus: PrescriptionStatusSummary;
  lastReviewedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
}

export interface PatientSummary {
  id: string;
  name: string;
  mrn: string;
  age: number;
  gender: Gender;
}
