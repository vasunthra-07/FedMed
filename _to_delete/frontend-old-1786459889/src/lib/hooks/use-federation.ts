import { useQuery } from "@tanstack/react-query";
import { fetchFederationLog, fetchFederationNodes, fetchFederationOverview } from "@/lib/api/federation";

export function useFederationOverview() {
  return useQuery({ queryKey: ["federation", "overview"], queryFn: fetchFederationOverview });
}

export function useFederationNodes() {
  return useQuery({ queryKey: ["federation", "nodes"], queryFn: fetchFederationNodes });
}

export function useFederationLog() {
  return useQuery({ queryKey: ["federation", "log"], queryFn: fetchFederationLog });
}
