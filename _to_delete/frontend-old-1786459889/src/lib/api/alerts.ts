import { PRESCRIPTIONS, SAFETY_ISSUES } from "@/lib/mock/dataset";
import { simulateLatency } from "./client";
import type { SafetyIssue } from "@/lib/types";

export interface AlertRow extends SafetyIssue {
  prescriptionDisplayId: string;
  patientName: string;
  patientId: string;
}

export async function fetchAllAlerts(): Promise<AlertRow[]> {
  const rows: AlertRow[] = SAFETY_ISSUES.map((issue) => {
    const rx = PRESCRIPTIONS.find((p) => p.id === issue.prescriptionId);
    return {
      ...issue,
      prescriptionDisplayId: rx?.displayId ?? issue.prescriptionId,
      patientName: rx?.patient.name ?? "Unknown patient",
      patientId: rx?.patient.id ?? "",
    };
  }).sort((a, b) => (a.detectedAt < b.detectedAt ? 1 : -1));
  return simulateLatency(rows, 220);
}
