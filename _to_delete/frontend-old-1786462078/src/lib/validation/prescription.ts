import { z } from "zod";

export const medicationItemSchema = z.object({
  medicationName: z.string().min(2, "Medication name is required"),
  strength: z.string().min(1, "Strength is required"),
  dosage: z.string().min(1, "Dosage is required"),
  route: z.string().min(1, "Route is required"),
  frequency: z.string().min(1, "Frequency is required"),
  duration: z.string().min(1, "Duration is required"),
  indication: z.string().min(2, "Indication / reason is required"),
  specialInstructions: z.string(),
  startDate: z.string().min(1, "Start date is required"),
});

export const prescriptionFormSchema = z.object({
  patientId: z.string().min(1, "Select a patient"),
  prescribingDoctorId: z.string().min(1, "Select the prescribing doctor"),
  medications: z.array(medicationItemSchema).min(1, "Add at least one medication"),
  knownAllergies: z.array(z.string()),
  clinicalNotes: z.string(),
});

export type MedicationItemFormValues = z.infer<typeof medicationItemSchema>;
export type PrescriptionFormValues = z.infer<typeof prescriptionFormSchema>;

export const emptyMedicationItem: MedicationItemFormValues = {
  medicationName: "",
  strength: "",
  dosage: "",
  route: "",
  frequency: "",
  duration: "",
  indication: "",
  specialInstructions: "",
  startDate: new Date().toISOString().slice(0, 10),
};
