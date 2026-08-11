import { PATIENTS, PRESCRIPTIONS, SAFETY_ISSUES } from "@/lib/mock/dataset";
import { simulateLatency, ApiError } from "./client";
import type { Patient, Prescription, SafetyIssue } from "@/lib/types";

export async function fetchPatients(): Promise<Patient[]> {
  return simulateLatency([...PATIENTS]);
}

export async function fetchPatient(patientId: string): Promise<Patient> {
  const patient = PATIENTS.find((p) => p.id === patientId);
  if (!patient) throw new ApiError(`Patient ${patientId} not found`, "not_found");
  return simulateLatency(patient);
}

export async function fetchPatientPrescriptions(patientId: string): Promise<Prescription[]> {
  return simulateLatency(PRESCRIPTIONS.filter((rx) => rx.patient.id === patientId));
}

export async function fetchPatientSafetyIssues(patientId: string): Promise<SafetyIssue[]> {
  const rxIds = new Set(PRESCRIPTIONS.filter((rx) => rx.patient.id === patientId).map((rx) => rx.id));
  return simulateLatency(SAFETY_ISSUES.filter((i) => rxIds.has(i.prescriptionId)));
}
