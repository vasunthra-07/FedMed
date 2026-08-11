import { z } from "zod";

export const interventionFormSchema = z.object({
  prescriptionId: z.string().min(1, "Select a prescription"),
  medicationLabel: z.string().min(1, "Medication is required"),
  interventionType: z.string().min(1, "Select an intervention type"),
  outcome: z.string().min(1, "Select an outcome"),
  notes: z.string().min(5, "Add a short note describing the intervention"),
});
export type InterventionFormValues = z.infer<typeof interventionFormSchema>;

export const nearMissFormSchema = z.object({
  prescriptionId: z.string().min(1, "Select a prescription"),
  medicationLabel: z.string().min(1, "Medication is required"),
  category: z.string().min(1, "Select a category"),
  severity: z.string().min(1, "Select a severity"),
  interventionTaken: z.string().min(5, "Describe the intervention taken"),
  outcome: z.string().min(1, "Select an outcome"),
  notes: z.string(),
});
export type NearMissFormValues = z.infer<typeof nearMissFormSchema>;
