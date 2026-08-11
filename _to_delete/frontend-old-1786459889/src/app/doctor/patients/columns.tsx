"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight } from "lucide-react";

import type { Patient } from "@/lib/types";
import { SeverityChip } from "@/components/shared/severity-chip";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/format";

const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, moderate: 2, low: 3 };

export const patientColumns: ColumnDef<Patient>[] = [
  {
    accessorKey: "id",
    header: "Patient ID",
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.id}</span>,
  },
  {
    accessorKey: "name",
    header: "Patient name",
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-foreground">{row.original.name}</p>
        <p className="text-xs text-muted-foreground">{row.original.mrn}</p>
      </div>
    ),
  },
  {
    accessorKey: "age",
    header: "Age",
    cell: ({ row }) => row.original.age,
  },
  {
    accessorKey: "gender",
    header: "Gender",
    cell: ({ row }) => <span className="capitalize">{row.original.gender}</span>,
  },
  {
    accessorKey: "activePrescriptionCount",
    header: "Active Rx",
    cell: ({ row }) => row.original.activePrescriptionCount,
  },
  {
    accessorKey: "activeMedicationAlertCount",
    header: "Active alerts",
    cell: ({ row }) => (
      <span className={row.original.activeMedicationAlertCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"}>
        {row.original.activeMedicationAlertCount}
      </span>
    ),
    filterFn: (row, columnId, filterValue: boolean) => {
      if (!filterValue) return true;
      return (row.getValue(columnId) as number) > 0;
    },
  },
  {
    accessorKey: "highestAlertSeverity",
    header: "Highest severity",
    sortingFn: (a, b) => {
      const ra = SEVERITY_RANK[a.original.highestAlertSeverity ?? ""] ?? 9;
      const rb = SEVERITY_RANK[b.original.highestAlertSeverity ?? ""] ?? 9;
      return ra - rb;
    },
    cell: ({ row }) => <SeverityChip severity={row.original.highestAlertSeverity} size="sm" />,
    filterFn: (row, columnId, filterValue: string[]) => {
      if (!filterValue || filterValue.length === 0) return true;
      return filterValue.includes(String(row.getValue(columnId) ?? "none"));
    },
  },
  {
    accessorKey: "latestPrescriptionStatus",
    header: "Latest Rx status",
    cell: ({ row }) => <StatusBadge status={row.original.latestPrescriptionStatus} />,
    filterFn: (row, columnId, filterValue: string[]) => {
      if (!filterValue || filterValue.length === 0) return true;
      return filterValue.includes(String(row.getValue(columnId)));
    },
  },
  {
    accessorKey: "lastReviewedAt",
    header: "Last reviewed",
    cell: ({ row }) => <span className="text-muted-foreground">{formatRelativeTime(row.original.lastReviewedAt)}</span>,
  },
  {
    id: "assignedDoctor",
    accessorFn: (row) => row.assignedDoctor.name,
    header: "Assigned doctor",
    filterFn: (row, columnId, filterValue: string[]) => {
      if (!filterValue || filterValue.length === 0) return true;
      return filterValue.includes(String(row.getValue(columnId)));
    },
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.assignedDoctor.name}</span>,
  },
  {
    id: "actions",
    header: "",
    enableSorting: false,
    cell: ({ row }) => (
      <Button asChild variant="ghost" size="sm" className="gap-1">
        <Link href={`/doctor/patients/${row.original.id}`}>
          View <ArrowUpRight className="size-3.5" />
        </Link>
      </Button>
    ),
  },
];
