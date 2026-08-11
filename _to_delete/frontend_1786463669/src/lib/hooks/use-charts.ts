import { useQuery } from "@tanstack/react-query";
import {
  fetchAgentDecisions,
  fetchAlertsOverTime,
  fetchFederationMetrics,
  fetchNearMissTrends,
  fetchPharmacyReviewOutcomes,
  fetchWorkflowStatusDistribution,
} from "@/lib/api/chart-data";

export function useAlertsOverTimeChart() {
  return useQuery({ queryKey: ["charts", "alerts-over-time"], queryFn: fetchAlertsOverTime });
}
export function useWorkflowStatusChart() {
  return useQuery({ queryKey: ["charts", "workflow-status"], queryFn: fetchWorkflowStatusDistribution });
}
export function usePharmacyOutcomesChart() {
  return useQuery({ queryKey: ["charts", "pharmacy-outcomes"], queryFn: fetchPharmacyReviewOutcomes });
}
export function useNearMissTrendsChart() {
  return useQuery({ queryKey: ["charts", "near-miss-trends"], queryFn: fetchNearMissTrends });
}
export function useAgentDecisionsChart() {
  return useQuery({ queryKey: ["charts", "agent-decisions"], queryFn: fetchAgentDecisions });
}
export function useFederationMetricsChart() {
  return useQuery({ queryKey: ["charts", "federation-metrics"], queryFn: fetchFederationMetrics });
}
