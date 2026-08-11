"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { NearMiss } from "@/lib/types";
import { SeverityChip } from "@/components/shared/severity-chip";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime, formatEnumLabel } from "@/lib/format";

export const nearMissColumns: ColumnDef<NearMiss>[] = [
  {
    accessorKey: "displayId",
    header: "Near miss ID",
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.displayId}</span>,
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
    cell: ({ row }) => <span className="font-medium">{row.original.patient.name}</span>,
  },
  {
    accessorKey: "medicationLabel",
    header: "Medication",
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => <span>{formatEnumLabel(row.original.category)}</span>,
    filterFn: (row, columnId, filterValue: string[]) => {
      if (!filterValue || filterValue.length === 0) return true;
      return filterValue.includes(String(row.getValue(columnId)));
    },
  },
  {
    accessorKey: "severity",
    header: "Severity",
    cell: ({ row }) => <SeverityChip severity={row.original.severity} size="sm" />,
    filterFn: (row, columnId, filterValue: string[]) => {
      if (!filterValue || filterValue.length === 0) return true;
      return filterValue.includes(String(row.getValue(columnId)));
    },
  },
  {
    accessorKey: "detectedBy",
    header: "Detected by",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.detectedBy}</span>,
  },
  {
    accessorKey: "interventionTaken",
    header: "Intervention",
    cell: ({ row }) => <span className="max-w-56 truncate block" title={row.original.interventionTaken}>{row.original.interventionTaken}</span>,
  },
  {
    accessorKey: "outcome",
    header: "Outcome",
    cell: ({ row }) => <StatusBadge status={row.original.outcome} />,
  },
  {
    accessorKey: "recordedAt",
    header: "Recorded",
    cell: ({ row }) => <span className="text-muted-foreground">{formatDateTime(row.original.recordedAt)}</span>,
  },
];
