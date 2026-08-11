import { AUDIT_EVENTS, DOCTORS_LIST, PATIENTS, PHARMACISTS_LIST, PRESCRIPTIONS } from "@/lib/mock/dataset";
import { simulateLatency, ApiError } from "./client";
import type {
  AuditEvent,
  MedicationItem,
  Prescription,
  PrescriptionWorkflowStatus,
} from "@/lib/types";
import type { PrescriptionFormValues } from "@/lib/validation/prescription";

export async function fetchPrescriptions(): Promise<Prescription[]> {
  return simulateLatency([...PRESCRIPTIONS]);
}

export async function fetchPrescription(prescriptionId: string): Promise<Prescription> {
  const rx = PRESCRIPTIONS.find((p) => p.id === prescriptionId);
  if (!rx) throw new ApiError(`Prescription ${prescriptionId} not found`, "not_found");
  return simulateLatency(rx);
}

function pushAudit(rx: Prescription, eventType: string, actorType: string, actorName: string, summary: string) {
  const entry: AuditEvent = {
    id: `AUDIT-${rx.id}-${AUDIT_EVENTS.length}`,
    prescriptionId: rx.id,
    prescriptionDisplayId: rx.displayId,
    eventType,
    actorType,
    actorName,
    summary,
    resultingStatus: rx.workflowStatus,
    timestamp: new Date().toISOString(),
  };
  AUDIT_EVENTS.push(entry);
}

/** Doctor-owned workflow transitions. The backend is the source of truth for
 * which transitions are legal from a given state — this mock simply applies
 * the requested transition and logs it, mirroring what a real mutation
 * endpoint would return. */
export type DoctorActionKey =
  | "accept_recommendation"
  | "request_pharmacist_review"
  | "add_justification"
  | "modify"
  | "approve";

export async function applyDoctorAction(
  prescriptionId: string,
  action: DoctorActionKey,
  note?: string
): Promise<Prescription> {
  const rx = PRESCRIPTIONS.find((p) => p.id === prescriptionId);
  if (!rx) throw new ApiError("Prescription not found", "not_found");

  const nextStatus: Record<DoctorActionKey, PrescriptionWorkflowStatus> = {
    accept_recommendation: "pending_pharmacist_review",
    request_pharmacist_review: "pharmacist_review_requested",
    add_justification: rx.workflowStatus,
    modify: "doctor_review_in_progress",
    approve: "pending_pharmacist_review",
  };
  rx.workflowStatus = nextStatus[action];
  rx.updatedAt = new Date().toISOString();
  if (note && (action === "add_justification" || action === "modify")) {
    const label = action === "add_justification" ? "Clinical justification" : "Modification note";
    rx.clinicalNotes = `${rx.clinicalNotes ? rx.clinicalNotes + "\n\n" : ""}${label}: ${note}`;
  }
  const summaryMap: Record<DoctorActionKey, string> = {
    accept_recommendation: "Doctor accepted agent recommendation",
    request_pharmacist_review: "Doctor requested pharmacist review",
    add_justification: "Clinical justification added",
    modify: "Prescription modified by doctor",
    approve: "Prescription approved by doctor — routed to pharmacy",
  };
  const eventTypeMap: Record<DoctorActionKey, string> = {
    accept_recommendation: "recommendation_accepted",
    request_pharmacist_review: "pharmacist_review_requested",
    add_justification: "clinical_justification_added",
    modify: "prescription_modified",
    approve: "prescription_approved",
  };
  pushAudit(rx, eventTypeMap[action], "doctor", rx.prescriber.name, summaryMap[action]);
  return simulateLatency(rx, 350);
}

export async function createPrescription(input: PrescriptionFormValues): Promise<Prescription> {
  const patient = PATIENTS.find((p) => p.id === input.patientId);
  const prescriber = DOCTORS_LIST.find((d) => d.id === input.prescribingDoctorId) ?? DOCTORS_LIST[0];
  if (!patient) throw new ApiError("Patient not found", "not_found");

  const id = `rx-new-${Date.now()}`;
  const displayId = `RX-${300000 + PRESCRIPTIONS.length}`;
  const medicationItems: MedicationItem[] = input.medications.map((m, i) => ({
    id: `MED-${id}-${i}`,
    medicationName: m.medicationName,
    strength: m.strength,
    dosage: m.dosage,
    route: m.route,
    frequency: m.frequency,
    duration: m.duration,
    indication: m.indication,
    specialInstructions: m.specialInstructions || undefined,
    startDate: m.startDate,
  }));

  const rx: Prescription = {
    id,
    displayId,
    patient: { id: patient.id, name: patient.name, mrn: patient.mrn, age: patient.age, gender: patient.gender },
    prescriber,
    medicationItems,
    knownAllergies: input.knownAllergies.length ? input.knownAllergies : patient.knownAllergies,
    clinicalNotes: input.clinicalNotes || undefined,
    workflowStatus: "submitted_for_analysis",
    medicationCount: medicationItems.length,
    highestSeverity: null,
    assignedReviewer: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  PRESCRIPTIONS.unshift(rx);
  pushAudit(rx, "prescription_created", "doctor", prescriber.name, "Prescription drafted and submitted for safety analysis");
  return simulateLatency(rx, 450);
}

export type PharmacistActionKey =
  | "approve_dispensing"
  | "place_on_hold"
  | "request_modification"
  | "mark_dispensed"
  | "release_hold";

/** Pharmacist-owned workflow transitions. */
export async function applyPharmacistAction(
  prescriptionId: string,
  action: PharmacistActionKey,
  reason?: string
): Promise<Prescription> {
  const rx = PRESCRIPTIONS.find((p) => p.id === prescriptionId);
  if (!rx) throw new ApiError("Prescription not found", "not_found");

  const nextStatus: Record<string, PrescriptionWorkflowStatus> = {
    approve_dispensing: "approved_for_dispensing",
    place_on_hold: "on_hold",
    request_modification: "modification_requested",
    mark_dispensed: "dispensed",
    release_hold: "pharmacist_review_in_progress",
  };
  rx.workflowStatus = nextStatus[action];
  rx.updatedAt = new Date().toISOString();
  const pharmacist = PHARMACISTS_LIST.find((p) => p.id === (rx.assignedReviewer?.id)) ?? PHARMACISTS_LIST[0];
  rx.assignedReviewer = pharmacist;
  const summaryMap: Record<string, string> = {
    approve_dispensing: "Pharmacist approved prescription for dispensing",
    place_on_hold: `Prescription placed on hold${reason ? `: ${reason}` : ""}`,
    request_modification: `Pharmacist requested modification${reason ? `: ${reason}` : ""}`,
    mark_dispensed: "Prescription marked as dispensed",
    release_hold: "Hold released — returned to pharmacist review",
  };
  const eventTypeMap: Record<string, string> = {
    approve_dispensing: "prescription_approved",
    place_on_hold: "prescription_held",
    request_modification: "modification_requested",
    mark_dispensed: "prescription_dispensed",
    release_hold: "hold_released",
  };
  pushAudit(rx, eventTypeMap[action], "pharmacist", pharmacist.name, summaryMap[action]);
  return simulateLatency(rx, 350);
}
