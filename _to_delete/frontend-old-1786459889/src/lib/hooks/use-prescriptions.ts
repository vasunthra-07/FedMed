import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  applyDoctorAction,
  applyPharmacistAction,
  createPrescription,
  fetchPrescription,
  fetchPrescriptions,
} from "@/lib/api/prescriptions";

export function usePrescriptions() {
  return useQuery({ queryKey: ["prescriptions"], queryFn: fetchPrescriptions });
}

export function usePrescription(prescriptionId: string | undefined) {
  return useQuery({
    queryKey: ["prescriptions", prescriptionId],
    queryFn: () => fetchPrescription(prescriptionId as string),
    enabled: Boolean(prescriptionId),
  });
}

function useInvalidatePrescriptionQueries() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
    queryClient.invalidateQueries({ queryKey: ["patients"] });
    queryClient.invalidateQueries({ queryKey: ["pharmacy-queue"] });
    queryClient.invalidateQueries({ queryKey: ["charts"] });
    queryClient.invalidateQueries({ queryKey: ["audit"] });
  };
}

export function useDoctorAction() {
  const invalidate = useInvalidatePrescriptionQueries();
  return useMutation({
    mutationFn: (vars: { prescriptionId: string; action: Parameters<typeof applyDoctorAction>[1]; note?: string }) =>
      applyDoctorAction(vars.prescriptionId, vars.action, vars.note),
    onSuccess: invalidate,
  });
}

export function usePharmacistAction() {
  const invalidate = useInvalidatePrescriptionQueries();
  return useMutation({
    mutationFn: (vars: {
      prescriptionId: string;
      action: Parameters<typeof applyPharmacistAction>[1];
      reason?: string;
    }) => applyPharmacistAction(vars.prescriptionId, vars.action, vars.reason),
    onSuccess: invalidate,
  });
}

export function useCreatePrescription() {
  const invalidate = useInvalidatePrescriptionQueries();
  return useMutation({
    mutationFn: createPrescription,
    onSuccess: invalidate,
  });
}
