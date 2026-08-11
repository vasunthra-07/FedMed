"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, X } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { LoadingState } from "@/components/shared/loading-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  emptyMedicationItem,
  prescriptionFormSchema,
  type PrescriptionFormValues,
} from "@/lib/validation/prescription";
import { usePatients } from "@/lib/hooks/use-patients";
import { useCreatePrescription } from "@/lib/hooks/use-prescriptions";
import { DOCTOR_NAMES, ROUTES } from "@/lib/mock/pools";

export default function NewPrescriptionPage() {
  return (
    <React.Suspense fallback={<LoadingState label="Loading…" />}>
      <NewPrescriptionForm />
    </React.Suspense>
  );
}

function NewPrescriptionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPatientId = searchParams.get("patientId") ?? "";
  const { data: patients, isLoading: patientsLoading } = usePatients();
  const createPrescription = useCreatePrescription();
  const [allergyDraft, setAllergyDraft] = React.useState("");

  const form = useForm<PrescriptionFormValues>({
    resolver: zodResolver(prescriptionFormSchema),
    defaultValues: {
      patientId: preselectedPatientId,
      prescribingDoctorId: DOCTOR_NAMES[0].id,
      medications: [emptyMedicationItem],
      knownAllergies: [],
      clinicalNotes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "medications" });
  const selectedPatientId = form.watch("patientId");
  const selectedPatient = (patients ?? []).find((p) => p.id === selectedPatientId);
  const allergies = form.watch("knownAllergies");

  React.useEffect(() => {
    if (selectedPatient && form.getValues("knownAllergies").length === 0) {
      form.setValue("knownAllergies", selectedPatient.knownAllergies.filter((a) => a !== "None documented"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatient?.id]);

  function onSubmit(values: PrescriptionFormValues) {
    createPrescription.mutate(values, {
      onSuccess: (rx) => {
        router.push(`/prescriptions/${rx.id}/review`);
      },
    });
  }

  function addAllergy() {
    const value = allergyDraft.trim();
    if (value && !allergies.includes(value)) {
      form.setValue("knownAllergies", [...allergies, value]);
    }
    setAllergyDraft("");
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-16">
      <PageHeader title="New prescription" description="Create a prescription for doctor review and automated safety analysis." />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          {/* Section 1 — Patient & Prescriber */}
          <Card>
            <CardHeader>
              <CardTitle>Patient &amp; prescriber</CardTitle>
              <CardDescription>Who this prescription is for, and who is prescribing it.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 pb-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient</FormLabel>
                    {patientsLoading ? (
                      <LoadingState label="Loading patients…" className="justify-start py-2" />
                    ) : (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a patient" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(patients ?? []).map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} · {p.mrn}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prescribingDoctorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prescribing doctor</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select prescriber" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DOCTOR_NAMES.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name} · {d.specialty}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Section 2 — Medications */}
          <Card>
            <CardHeader>
              <CardTitle>Medications</CardTitle>
              <CardDescription>Add every medication item included in this prescription.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pb-5">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold">Medication {index + 1}</p>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-muted-foreground hover:text-destructive"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="size-3.5" /> Remove
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name={`medications.${index}.medicationName`}
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Medication name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Metformin" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`medications.${index}.strength`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Strength</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 500 mg" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`medications.${index}.dosage`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dosage</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 1 tablet" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`medications.${index}.route`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Route</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select route" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ROUTES.map((r) => (
                                <SelectItem key={r} value={r} className="capitalize">
                                  {r}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`medications.${index}.frequency`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frequency</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Twice daily" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`medications.${index}.duration`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 14 days" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`medications.${index}.startDate`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`medications.${index}.indication`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Indication / reason</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Type 2 diabetes" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`medications.${index}.specialInstructions`}
                      render={({ field }) => (
                        <FormItem className="sm:col-span-3">
                          <FormLabel>Special instructions</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Optional — e.g. take with food" rows={2} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                className="w-full gap-1.5"
                onClick={() => append(emptyMedicationItem)}
              >
                <Plus className="size-4" /> Add another medication
              </Button>
            </CardContent>
          </Card>

          {/* Section 3 — Allergies & Clinical Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Allergies &amp; clinical notes</CardTitle>
              <CardDescription>Reviewed by the safety analysis agents before this reaches your review queue.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pb-5">
              <div>
                <FormLabel>Known allergies</FormLabel>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {allergies.length === 0 && <p className="text-sm text-muted-foreground">None added</p>}
                  {allergies.map((a) => (
                    <Badge key={a} variant="outline" className="gap-1 pr-1">
                      {a}
                      <button
                        type="button"
                        onClick={() => form.setValue("knownAllergies", allergies.filter((x) => x !== a))}
                        className="rounded-full p-0.5 hover:bg-accent"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <Input
                    value={allergyDraft}
                    onChange={(e) => setAllergyDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addAllergy();
                      }
                    }}
                    placeholder="Type an allergy and press Enter"
                    className="max-w-xs"
                  />
                  <Button type="button" variant="outline" onClick={addAllergy}>
                    Add
                  </Button>
                </div>
                <FormDescription className="mt-1">
                  Pre-filled from the patient&apos;s record when available — edit as needed.
                </FormDescription>
              </div>

              <Separator />

              <FormField
                control={form.control}
                name="clinicalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clinical notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional context for the reviewing pharmacist or agents" rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPrescription.isPending}>
              {createPrescription.isPending ? "Submitting…" : "Submit for safety analysis"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
