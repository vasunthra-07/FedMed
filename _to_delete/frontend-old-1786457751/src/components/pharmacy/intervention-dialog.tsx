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
import { useRecordIntervention } from "@/lib/hooks/use-pharmacy";
import { interventionFormSchema, type InterventionFormValues } from "@/lib/validation/pharmacy-records";
import { INTERVENTION_TYPE_OPTIONS, OUTCOME_OPTIONS } from "@/lib/mock/pharmacy-options";
import { formatEnumLabel } from "@/lib/format";

export function InterventionDialog({ defaultPrescriptionId }: { defaultPrescriptionId?: string }) {
  const [open, setOpen] = React.useState(false);
  const { data: prescriptions } = usePrescriptions();
  const recordIntervention = useRecordIntervention();

  const form = useForm<InterventionFormValues>({
    resolver: zodResolver(interventionFormSchema),
    defaultValues: {
      prescriptionId: defaultPrescriptionId ?? "",
      medicationLabel: "",
      interventionType: "",
      outcome: "",
      notes: "",
    },
  });

  const selectedRx = (prescriptions ?? []).find((p) => p.id === form.watch("prescriptionId"));

  React.useEffect(() => {
    if (defaultPrescriptionId) form.setValue("prescriptionId", defaultPrescriptionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultPrescriptionId]);

  function onSubmit(values: InterventionFormValues) {
    recordIntervention.mutate(
      {
        prescriptionId: values.prescriptionId,
        interventionType: values.interventionType,
        outcome: values.outcome,
        medicationLabel: values.medicationLabel,
        notes: values.notes,
        pharmacistId: "phm-001",
        pharmacistName: "James Whitfield",
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
          <Plus className="size-4" /> Record intervention
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record pharmacist intervention</DialogTitle>
          <DialogDescription>
            Document an action you took to correct or clarify a prescription. This is logged to the audit trail.
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
                name="interventionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intervention type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {INTERVENTION_TYPE_OPTIONS.map((t) => (
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
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Describe what happened and what you did…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={recordIntervention.isPending}>
                {recordIntervention.isPending ? "Saving…" : "Save intervention"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
