"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight } from "lucide-react";

import type { PharmacyQueueItem } from "@/lib/types";
import { SeverityChip } from "@/components/shared/severity-chip";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/format";

const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, moderate: 2, low: 3 };

export const pharmacyQueueColumns: ColumnDef<PharmacyQueueItem>[] = [
  {
    accessorKey: "queueId",
    header: "Queue ID",
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.queueId}</span>,
  },
  {
    accessorKey: "prescriptionDisplayId",
    header: "Prescription",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.prescriptionDisplayId}</span>,
  },
  {
    id: "patient",
    accessorFn: (row) => row.patient.name,
    header: "Patient",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.patient.name}</p>
        <p className="text-xs text-muted-foreground">{row.original.patient.mrn}</p>
      </div>
    ),
  },
  {
    id: "prescriber",
    accessorFn: (row) => row.prescriber.name,
    header: "Prescriber",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.prescriber.name}</span>,
  },
  {
    accessorKey: "highestSeverity",
    header: "Highest severity",
    sortingFn: (a, b) => {
      const ra = SEVERITY_RANK[a.original.highestSeverity ?? ""] ?? 9;
      const rb = SEVERITY_RANK[b.original.highestSeverity ?? ""] ?? 9;
      return ra - rb;
    },
    cell: ({ row }) => <SeverityChip severity={row.original.highestSeverity} size="sm" />,
    filterFn: (row, columnId, filterValue: string[]) => {
      if (!filterValue || filterValue.length === 0) return true;
      return filterValue.includes(String(row.getValue(columnId) ?? "none"));
    },
  },
  {
    accessorKey: "reviewStatus",
    header: "Review status",
    cell: ({ row }) => <StatusBadge status={row.original.reviewStatus} />,
    filterFn: (row, columnId, filterValue: string[]) => {
      if (!filterValue || filterValue.length === 0) return true;
      return filterValue.includes(String(row.getValue(columnId)));
    },
  },
  {
    accessorKey: "holdStatus",
    header: "Hold status",
    cell: ({ row }) =>
      row.original.holdStatus === "on_hold" ? (
        <div>
          <StatusBadge status="on_hold" />
          {row.original.holdReason && <p className="mt-1 max-w-48 truncate text-xs text-muted-foreground" title={row.original.holdReason}>{row.original.holdReason}</p>}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    id: "assignedPharmacist",
    accessorFn: (row) => row.assignedPharmacist?.name ?? "Unassigned",
    header: "Assigned pharmacist",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.assignedPharmacist?.name ?? "Unassigned"}</span>,
  },
  {
    accessorKey: "queuedAt",
    header: "Queue time",
    cell: ({ row }) => <span className="text-muted-foreground">{formatRelativeTime(row.original.queuedAt)}</span>,
  },
  {
    id: "actions",
    header: "",
    enableSorting: false,
    cell: ({ row }) => (
      <Button asChild variant="ghost" size="sm" className="gap-1">
        <Link href={`/pharmacist/queue/${row.original.queueId}`}>
          Review <ArrowUpRight className="size-3.5" />
        </Link>
      </Button>
    ),
  },
];
