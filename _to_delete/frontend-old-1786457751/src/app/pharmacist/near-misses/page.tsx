"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import type { ColumnFiltersState } from "@tanstack/react-table";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { LoadingState } from "@/components/shared/loading-state";
import { StatCard } from "@/components/shared/stat-card";
import { FacetedFilter } from "@/components/shared/faceted-filter";
import { NearMissDialog } from "@/components/pharmacy/near-miss-dialog";
import { NearMissTrendsChart } from "@/components/charts/near-miss-trends-chart";
import { useNearMisses } from "@/lib/hooks/use-pharmacy";
import { NEAR_MISS_CATEGORY_OPTIONS, SEVERITY_OPTIONS } from "@/lib/mock/pharmacy-options";
import { AlertOctagon, PackageCheck } from "lucide-react";
import { nearMissColumns } from "./columns";

function NearMissesContent() {
  const searchParams = useSearchParams();
  const prescriptionId = searchParams.get("prescriptionId") ?? undefined;
  const { data: nearMisses, isLoading } = useNearMisses();
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  function getFilterValue(id: string): string[] {
    return (columnFilters.find((f) => f.id === id)?.value as string[]) ?? [];
  }
  function setFilterValue(id: string, value: string[]) {
    setColumnFilters((prev) => {
      const rest = prev.filter((f) => f.id !== id);
      return value.length > 0 ? [...rest, { id, value }] : rest;
    });
  }

  const critical = (nearMisses ?? []).filter((n) => n.severity === "critical" || n.severity === "high").length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Near miss recording"
        description="Errors caught before reaching the patient — recorded for pattern detection and quality review."
        actions={<NearMissDialog defaultPrescriptionId={prescriptionId} />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total recorded" value={(nearMisses ?? []).length} icon={PackageCheck} />
        <StatCard label="Critical / high severity" value={critical} icon={AlertOctagon} tone="danger" />
      </div>

      <NearMissTrendsChart />

      {isLoading ? (
        <LoadingState />
      ) : (
        <DataTable
          columns={nearMissColumns}
          data={nearMisses ?? []}
          searchPlaceholder="Search patient, medication…"
          searchColumnIds={["patient", "medicationLabel", "prescriptionDisplayId", "displayId"]}
          columnFilters={columnFilters}
          onColumnFiltersChange={setColumnFilters}
          initialSorting={[{ id: "recordedAt", desc: true }]}
          pageSize={12}
          emptyTitle="No near misses recorded yet"
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <FacetedFilter
                title="Category"
                options={NEAR_MISS_CATEGORY_OPTIONS.map((v) => ({ label: v, value: v }))}
                selected={getFilterValue("category")}
                onChange={(v) => setFilterValue("category", v)}
              />
              <FacetedFilter
                title="Severity"
                options={SEVERITY_OPTIONS.map((v) => ({ label: v, value: v }))}
                selected={getFilterValue("severity")}
                onChange={(v) => setFilterValue("severity", v)}
              />
            </div>
          }
        />
      )}
    </div>
  );
}

export default function NearMissesPage() {
  return (
    <React.Suspense fallback={<LoadingState />}>
      <NearMissesContent />
    </React.Suspense>
  );
}
