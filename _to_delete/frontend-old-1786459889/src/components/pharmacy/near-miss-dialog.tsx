"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { usePrescriptions } from "@/lib/hooks/use-prescriptions";
import { useRecordNearMiss } from "@/lib/hooks/use-pharmacy";
import { nearMissFormSchema, type NearMissFormValues } from "@/lib/validation/pharmacy-records";
import { NEAR_MISS_CATEGORY_OPTIONS, OUTCOME_OPTIONS, SEVERITY_OPTIONS } from "@/lib/mock/pharmacy-options";
import { formatEnumLabel } from "@/lib/format";

export function NearMissDialog({ defaultPrescriptionId }: { defaultPrescriptionId?: string }) {
  const [open, setOpen] = React.useState(false);
  const { data: prescriptions } = usePrescriptions();
  const recordNearMiss = useRecordNearMiss();

  const form = useForm<NearMissFormValues>({
    resolver: zodResolver(nearMissFormSchema),
    defaultValues: {
      prescriptionId: defaultPrescriptionId ?? "",
      medicationLabel: "",
      category: "",
      severity: "",
      interventionTaken: "",
      outcome: "",
      notes: "",
    },
  });

  const selectedRx = (prescriptions ?? []).find((p) => p.id === form.watch("prescriptionId"));

  function onSubmit(values: NearMissFormValues) {
    recordNearMiss.mutate(
      {
        prescriptionId: values.prescriptionId,
        medicationLabel: values.medicationLabel,
        category: values.category,
        severity: values.severity,
        interventionTaken: values.interventionTaken,
        outcome: values.outcome,
        notes: values.notes,
        detectedBy: "James Whitfield",
      },
      {
        onSuccess: () => {
          setOpen(false);
          form.reset();
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" /> Record near miss
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record near miss</DialogTitle>
          <DialogDescription>
            Log an error that was caught before it reached the patient. No patient harm is implied by this record.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="prescriptionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prescription</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select prescription" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(prescriptions ?? []).map((rx) => (
                        <SelectItem key={rx.id} value={rx.id}>
                          {rx.displayId} · {rx.patient.name}
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
              name="medicationLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medication</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={!selectedRx}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={selectedRx ? "Select medication" : "Select a prescription first"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {selectedRx?.medicationItems.map((m) => (
                        <SelectItem key={m.id} value={m.medicationName}>
                          {m.medicationName} {m.strength}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {NEAR_MISS_CATEGORY_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {formatEnumLabel(t)}
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
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SEVERITY_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {formatEnumLabel(t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="interventionTaken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Intervention taken</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="What was done before dispensing?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="outcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outcome</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select outcome" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {OUTCOME_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {formatEnumLabel(t)}
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Additional context" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={recordNearMiss.isPending}>
                {recordNearMiss.isPending ? "Saving…" : "Save near miss"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
