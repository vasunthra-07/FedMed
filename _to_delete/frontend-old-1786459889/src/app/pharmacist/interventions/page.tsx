"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { LoadingState } from "@/components/shared/loading-state";
import { InterventionDialog } from "@/components/pharmacy/intervention-dialog";
import { useInterventions } from "@/lib/hooks/use-pharmacy";
import { interventionColumns } from "./columns";

function InterventionsContent() {
  const searchParams = useSearchParams();
  const prescriptionId = searchParams.get("prescriptionId") ?? undefined;
  const { data: interventions, isLoading } = useInterventions();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Pharmacist interventions"
        description="A traceable record of every intervention pharmacists have made on prescriptions."
        actions={<InterventionDialog defaultPrescriptionId={prescriptionId} />}
      />
      {isLoading ? (
        <LoadingState />
      ) : (
        <DataTable
          columns={interventionColumns}
          data={interventions ?? []}
          searchPlaceholder="Search patient, medication…"
          searchColumnIds={["patient", "medicationLabel", "prescriptionDisplayId"]}
          initialSorting={[{ id: "recordedAt", desc: true }]}
          pageSize={12}
          emptyTitle="No interventions recorded yet"
        />
      )}
    </div>
  );
}

export default function InterventionsPage() {
  return (
    <React.Suspense fallback={<LoadingState />}>
      <InterventionsContent />
    </React.Suspense>
  );
}
