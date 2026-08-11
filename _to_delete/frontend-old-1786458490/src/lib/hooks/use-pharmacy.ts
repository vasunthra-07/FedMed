import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchInterventions,
  fetchNearMisses,
  fetchPharmacyQueue,
  fetchQueueItem,
  recordIntervention,
  recordNearMiss,
} from "@/lib/api/pharmacy";

export function usePharmacyQueue() {
  return useQuery({ queryKey: ["pharmacy-queue"], queryFn: fetchPharmacyQueue });
}

export function useQueueItem(queueId: string | undefined) {
  return useQuery({
    queryKey: ["pharmacy-queue", queueId],
    queryFn: () => fetchQueueItem(queueId as string),
    enabled: Boolean(queueId),
  });
}

export function useInterventions() {
  return useQuery({ queryKey: ["interventions"], queryFn: fetchInterventions });
}

export function useNearMisses() {
  return useQuery({ queryKey: ["near-misses"], queryFn: fetchNearMisses });
}

export function useRecordIntervention() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recordIntervention,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interventions"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}

export function useRecordNearMiss() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recordNearMiss,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["near-misses"] });
      queryClient.invalidateQueries({ queryKey: ["charts"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}
