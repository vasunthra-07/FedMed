"use client";

import * as React from "react";
import type { ColumnFiltersState } from "@tanstack/react-table";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { LoadingState } from "@/components/shared/loading-state";
import { FacetedFilter } from "@/components/shared/faceted-filter";
import { WorkflowTimeline } from "@/components/shared/workflow-timeline";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAllAuditEvents } from "@/lib/hooks/use-audit";
import { auditColumns } from "./columns";
import type { AuditEvent } from "@/lib/types";

const EVENT_TYPE_OPTIONS = [
  "prescription_created",
  "safety_analysis_started",
  "safety_analysis_completed",
  "doctor_review_started",
  "recommendation_accepted",
  "prescription_modified",
  "pharmacist_review_requested",
  "clinical_justification_added",
  "prescription_approved",
  "pharmacy_review_started",
  "prescription_held",
  "modification_requested",
  "hold_released",
  "prescription_dispensed",
  "intervention_recorded",
  "near_miss_recorded",
  "prescription_cancelled",
  "prescription_rejected",
].map((v) => ({ label: v, value: v }));

const ACTOR_OPTIONS = ["doctor", "pharmacist", "agent", "system", "admin"].map((v) => ({ label: v, value: v }));

export default function AuditTrailPage() {
  const { data: events, isLoading } = useAllAuditEvents();
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [selectedPrescription, setSelectedPrescription] = React.useState<string | null>(null);

  function getFilterValue(id: string): string[] {
    return (columnFilters.find((f) => f.id === id)?.value as string[]) ?? [];
  }
  function setFilterValue(id: string, value: string[]) {
    setColumnFilters((prev) => {
      const rest = prev.filter((f) => f.id !== id);
      return value.length > 0 ? [...rest, { id, value }] : rest;
    });
  }

  const selectedEvents = (events ?? [])
    .filter((e: AuditEvent) => e.prescriptionId === selectedPrescription)
    .sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
  const selectedDisplayId = selectedEvents[0]?.prescriptionDisplayId;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Audit trail"
        description="Every recorded workflow event across doctors, pharmacists, agents, and the system. Click a row to see the full timeline for that prescription."
      />

      {isLoading ? (
        <LoadingState />
      ) : (
        <DataTable
          columns={auditColumns}
          data={events ?? []}
          searchPlaceholder="Search actor, summary, prescription…"
          searchColumnIds={["actorName", "summary", "prescriptionDisplayId"]}
          columnFilters={columnFilters}
          onColumnFiltersChange={setColumnFilters}
          initialSorting={[{ id: "timestamp", desc: true }]}
          onRowClick={(event) => setSelectedPrescription(event.prescriptionId)}
          pageSize={15}
          emptyTitle="No audit events"
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <FacetedFilter
                title="Event type"
                options={EVENT_TYPE_OPTIONS}
                selected={getFilterValue("eventType")}
                onChange={(v) => setFilterValue("eventType", v)}
              />
              <FacetedFilter
                title="Actor type"
                options={ACTOR_OPTIONS}
                selected={getFilterValue("actorType")}
                onChange={(v) => setFilterValue("actorType", v)}
              />
            </div>
          }
        />
      )}

      <Sheet open={!!selectedPrescription} onOpenChange={(open) => !open && setSelectedPrescription(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Workflow timeline — {selectedDisplayId}</SheetTitle>
            <SheetDescription>
              Full audit history for this prescription.{" "}
              {selectedPrescription && (
                <Link
                  href={`/prescriptions/${selectedPrescription}/review`}
                  className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
                >
                  Open in review <ArrowUpRight className="size-3" />
                </Link>
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="px-5 pb-5">
            <WorkflowTimeline events={selectedEvents} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
