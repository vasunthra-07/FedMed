import { useQuery } from "@tanstack/react-query";
import { fetchAgentTrace, fetchSafetyAnalysis } from "@/lib/api/safety";

export function useSafetyAnalysis(prescriptionId: string | undefined) {
  return useQuery({
    queryKey: ["safety-analysis", prescriptionId],
    queryFn: () => fetchSafetyAnalysis(prescriptionId as string),
    enabled: Boolean(prescriptionId),
  });
}

export function useAgentTrace(prescriptionId: string | undefined) {
  return useQuery({
    queryKey: ["agent-trace", prescriptionId],
    queryFn: () => fetchAgentTrace(prescriptionId as string),
    enabled: Boolean(prescriptionId),
  });
}
