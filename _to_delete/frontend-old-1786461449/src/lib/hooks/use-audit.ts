import { useQuery } from "@tanstack/react-query";
import { fetchAllAuditEvents, fetchAuditTrail } from "@/lib/api/audit";

export function useAuditTrail(prescriptionId: string | undefined) {
  return useQuery({
    queryKey: ["audit", prescriptionId],
    queryFn: () => fetchAuditTrail(prescriptionId as string),
    enabled: Boolean(prescriptionId),
  });
}

export function useAllAuditEvents() {
  return useQuery({ queryKey: ["audit", "all"], queryFn: fetchAllAuditEvents });
}
