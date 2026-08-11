"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { Intervention } from "@/lib/types";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime, formatEnumLabel } from "@/lib/format";

export const interventionColumns: ColumnDef<Intervention>[] = [
  {
    accessorKey: "id",
    header: "Intervention ID",
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.id}</span>,
  },
  {
    accessorKey: "prescriptionDisplayId",
    header: "Prescription",
    cell: ({ row }) => (
      <Link href={`/pharmacist/queue`} className="font-mono text-xs text-primary hover:underline">
        {row.original.prescriptionDisplayId}
      </Link>
    ),
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
    accessorKey: "interventionType",
    header: "Type",
    cell: ({ row }) => <span>{formatEnumLabel(row.original.interventionType)}</span>,
  },
  {
    accessorKey: "outcome",
    header: "Outcome",
    cell: ({ row }) => <StatusBadge status={row.original.outcome} />,
  },
  {
    id: "pharmacist",
    accessorFn: (row) => row.pharmacist.name,
    header: "Pharmacist",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.pharmacist.name}</span>,
  },
  {
    accessorKey: "recordedAt",
    header: "Recorded",
    cell: ({ row }) => <span className="text-muted-foreground">{formatDateTime(row.original.recordedAt)}</span>,
  },
];
