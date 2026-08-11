"use client";

import * as React from "react";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { LoadingState } from "@/components/shared/loading-state";
import { FacetedFilter } from "@/components/shared/faceted-filter";
import { Button } from "@/components/ui/button";
import { usePatients } from "@/lib/hooks/use-patients";
import { DOCTOR_NAMES } from "@/lib/mock/pools";
import { patientColumns } from "./columns";

const SEVERITY_OPTIONS = [
  { label: "critical", value: "critical" },
  { label: "high", value: "high" },
  { label: "moderate", value: "moderate" },
  { label: "low", value: "low" },
];

const STATUS_OPTIONS = [
  "draft",
  "pending_review",
  "on_hold",
  "approved",
  "dispensed",
  "no_active_prescription",
].map((v) => ({ label: v, value: v }));

const DOCTOR_OPTIONS = DOCTOR_NAMES.map((d) => ({ label: d.name, value: d.name }));

export default function PatientListPage() {
  const router = useRouter();
  const { data: patients, isLoading } = usePatients();
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [onlyWithAlerts, setOnlyWithAlerts] = React.useState(false);

  const filters = React.useMemo(() => {
    const base = columnFilters.filter((f) => f.id !== "activeMedicationAlertCount");
    return onlyWithAlerts ? [...base, { id: "activeMedicationAlertCount", value: true }] : base;
  }, [columnFilters, onlyWithAlerts]);

  function getFilterValue(id: string): string[] {
    return (columnFilters.find((f) => f.id === id)?.value as string[]) ?? [];
  }
  function setFilterValue(id: string, value: string[]) {
    setColumnFilters((prev) => {
      const rest = prev.filter((f) => f.id !== id);
      return value.length > 0 ? [...rest, { id, value }] : rest;
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Patients" description="All patients assigned to your care, with active alerts surfaced first." />

      {isLoading ? (
        <LoadingState />
      ) : (
        <DataTable
          columns={patientColumns}
          data={patients ?? []}
          searchPlaceholder="Search by patient ID or name…"
          searchColumnIds={["id", "name"]}
          columnFilters={filters}
          onColumnFiltersChange={setColumnFilters}
          initialSorting={[{ id: "highestAlertSeverity", desc: false }]}
          onRowClick={(patient) => router.push(`/doctor/patients/${patient.id}`)}
          pageSize={12}
          emptyTitle="No patients match these filters"
          emptyDescription="Try clearing a filter or search term."
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <FacetedFilter
                title="Severity"
                options={SEVERITY_OPTIONS}
                selected={getFilterValue("highestAlertSeverity")}
                onChange={(v) => setFilterValue("highestAlertSeverity", v)}
              />
              <FacetedFilter
                title="Rx status"
                options={STATUS_OPTIONS}
                selected={getFilterValue("latestPrescriptionStatus")}
                onChange={(v) => setFilterValue("latestPrescriptionStatus", v)}
              />
              <FacetedFilter
                title="Doctor"
                options={DOCTOR_OPTIONS}
                formatLabel={false}
                selected={getFilterValue("assignedDoctor")}
                onChange={(v) => setFilterValue("assignedDoctor", v)}
              />
              <Button
                variant={onlyWithAlerts ? "secondary" : "outline"}
                size="sm"
                onClick={() => setOnlyWithAlerts((v) => !v)}
              >
                Active alerts only
              </Button>
            </div>
          }
        />
      )}
    </div>
  );
}
