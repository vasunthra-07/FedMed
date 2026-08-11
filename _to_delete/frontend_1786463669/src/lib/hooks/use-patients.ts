import { useQuery } from "@tanstack/react-query";
import { fetchPatient, fetchPatientPrescriptions, fetchPatientSafetyIssues, fetchPatients } from "@/lib/api/patients";

export function usePatients() {
  return useQuery({ queryKey: ["patients"], queryFn: fetchPatients });
}

export function usePatient(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patients", patientId],
    queryFn: () => fetchPatient(patientId as string),
    enabled: Boolean(patientId),
  });
}

export function usePatientPrescriptions(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patients", patientId, "prescriptions"],
    queryFn: () => fetchPatientPrescriptions(patientId as string),
    enabled: Boolean(patientId),
  });
}

export function usePatientSafetyIssues(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patients", patientId, "safety-issues"],
    queryFn: () => fetchPatientSafetyIssues(patientId as string),
    enabled: Boolean(patientId),
  });
}
