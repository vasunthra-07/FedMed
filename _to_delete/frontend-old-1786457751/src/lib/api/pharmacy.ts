import { INTERVENTIONS, NEAR_MISSES, PATIENTS, PHARMACY_QUEUE, PRESCRIPTIONS } from "@/lib/mock/dataset";
import { simulateLatency, ApiError } from "./client";
import type { Intervention, NearMiss, PharmacyQueueItem } from "@/lib/types";

export async function fetchPharmacyQueue(): Promise<PharmacyQueueItem[]> {
  return simulateLatency([...PHARMACY_QUEUE]);
}

export async function fetchQueueItem(queueId: string): Promise<PharmacyQueueItem> {
  const item = PHARMACY_QUEUE.find((q) => q.queueId === queueId);
  if (!item) throw new ApiError("Queue item not found", "not_found");
  return simulateLatency(item);
}

export async function fetchInterventions(): Promise<Intervention[]> {
  return simulateLatency([...INTERVENTIONS].sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1)));
}

export async function fetchNearMisses(): Promise<NearMiss[]> {
  return simulateLatency([...NEAR_MISSES].sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1)));
}

export interface RecordInterventionInput {
  prescriptionId: string;
  interventionType: string;
  outcome: string;
  medicationLabel: string;
  notes: string;
  pharmacistId: string;
  pharmacistName: string;
}

export async function recordIntervention(input: RecordInterventionInput): Promise<Intervention> {
  const rx = PRESCRIPTIONS.find((p) => p.id === input.prescriptionId);
  if (!rx) throw new ApiError("Prescription not found", "not_found");
  const entry: Intervention = {
    id: `INT-${3000 + INTERVENTIONS.length}`,
    prescriptionId: rx.id,
    prescriptionDisplayId: rx.displayId,
    patient: rx.patient,
    medicationLabel: input.medicationLabel,
    interventionType: input.interventionType,
    outcome: input.outcome,
    pharmacist: { id: input.pharmacistId, name: input.pharmacistName },
    notes: input.notes,
    recordedAt: new Date().toISOString(),
  };
  INTERVENTIONS.unshift(entry);
  return simulateLatency(entry, 350);
}

export interface RecordNearMissInput {
  prescriptionId: string;
  medicationLabel: string;
  category: string;
  severity: string;
  interventionTaken: string;
  outcome: string;
  notes?: string;
  detectedBy: string;
}

export async function recordNearMiss(input: RecordNearMissInput): Promise<NearMiss> {
  const rx = PRESCRIPTIONS.find((p) => p.id === input.prescriptionId);
  if (!rx) throw new ApiError("Prescription not found", "not_found");
  const entry: NearMiss = {
    id: `nm-new-${Date.now()}`,
    displayId: `NM-${7000 + NEAR_MISSES.length}`,
    prescriptionId: rx.id,
    prescriptionDisplayId: rx.displayId,
    patient: rx.patient,
    medicationLabel: input.medicationLabel,
    category: input.category,
    severity: input.severity,
    detectedBy: input.detectedBy,
    interventionTaken: input.interventionTaken,
    outcome: input.outcome,
    notes: input.notes,
    recordedAt: new Date().toISOString(),
  };
  NEAR_MISSES.unshift(entry);
  return simulateLatency(entry, 350);
}

export async function fetchPatientsForSelect() {
  return simulateLatency(PATIENTS.map((p) => ({ id: p.id, name: p.name, mrn: p.mrn })));
}
