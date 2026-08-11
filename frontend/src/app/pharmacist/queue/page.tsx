"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnFiltersState } from "@tanstack/react-table";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { LoadingState } from "@/components/shared/loading-state";
import { StatCard } from "@/components/shared/stat-card";
import { FacetedFilter } from "@/components/shared/faceted-filter";
import { usePharmacyQueue } from "@/lib/hooks/use-pharmacy";
import { AlertTriangle, ClipboardList, PauseCircle, PackageCheck } from "lucide-react";
import { pharmacyQueueColumns } from "./columns";

const SEVERITY_OPTIONS = ["critical", "high", "moderate", "low"].map((v) => ({ label: v, value: v }));
const STATUS_OPTIONS = ["queued", "in_review", "on_hold", "modification_requested", "approved", "dispensed"].map((v) => ({
  label: v,
  value: v,
}));

export default function PharmacyQueuePage() {
  const router = useRouter();
  const { data: queue, isLoading } = usePharmacyQueue();
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

  const critical = (queue ?? []).filter((q) => q.highestSeverity === "critical").length;
  const onHold = (queue ?? []).filter((q) => q.holdStatus === "on_hold").length;
  const awaiting = (queue ?? []).filter((q) => q.reviewStatus === "queued" || q.reviewStatus === "in_review").length;
  const readyToDispense = (queue ?? []).filter((q) => q.reviewStatus === "approved").length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Pharmacy review queue" description="Prescriptions routed to pharmacy, ranked for fast triage." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Awaiting review" value={awaiting} icon={ClipboardList} tone="warning" />
        <StatCard label="Critical severity" value={critical} icon={AlertTriangle} tone="danger" />
        <StatCard label="On hold" value={onHold} icon={PauseCircle} tone="danger" />
        <StatCard label="Ready to dispense" value={readyToDispense} icon={PackageCheck} tone="success" />
      </div>

      {isLoading ? (
        <LoadingState />
      ) : (
        <DataTable
          columns={pharmacyQueueColumns}
          data={queue ?? []}
          searchPlaceholder="Search patient, prescription ID…"
          searchColumnIds={["patient", "prescriptionDisplayId", "queueId"]}
          columnFilters={columnFilters}
          onColumnFiltersChange={setColumnFilters}
          initialSorting={[{ id: "highestSeverity", desc: false }]}
          onRowClick={(item) => router.push(`/pharmacist/queue/${item.queueId}`)}
          pageSize={12}
          emptyTitle="Queue is empty"
          emptyDescription="No prescriptions match these filters."
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <FacetedFilter
                title="Severity"
                options={SEVERITY_OPTIONS}
                selected={getFilterValue("highestSeverity")}
                onChange={(v) => setFilterValue("highestSeverity", v)}
              />
              <FacetedFilter
                title="Review status"
                options={STATUS_OPTIONS}
                selected={getFilterValue("reviewStatus")}
                onChange={(v) => setFilterValue("reviewStatus", v)}
              />
            </div>
          }
        />
      )}
    </div>
  );
}
