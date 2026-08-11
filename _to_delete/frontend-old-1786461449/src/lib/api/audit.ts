import { AUDIT_EVENTS } from "@/lib/mock/dataset";
import { simulateLatency } from "./client";
import type { AuditEvent } from "@/lib/types";

export async function fetchAuditTrail(prescriptionId: string): Promise<AuditEvent[]> {
  return simulateLatency(
    AUDIT_EVENTS.filter((e) => e.prescriptionId === prescriptionId).sort((a, b) =>
      a.timestamp < b.timestamp ? -1 : 1
    )
  );
}

export async function fetchAllAuditEvents(): Promise<AuditEvent[]> {
  return simulateLatency([...AUDIT_EVENTS].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)));
}
