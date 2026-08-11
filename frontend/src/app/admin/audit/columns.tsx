"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { AuditEvent } from "@/lib/types";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime, formatEnumLabel } from "@/lib/format";

export const auditColumns: ColumnDef<AuditEvent>[] = [
  {
    accessorKey: "prescriptionDisplayId",
    header: "Prescription",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.prescriptionDisplayId}</span>,
  },
  {
    accessorKey: "eventType",
    header: "Event",
    cell: ({ row }) => <span className="font-medium">{formatEnumLabel(row.original.eventType)}</span>,
    filterFn: (row, columnId, filterValue: string[]) => {
      if (!filterValue || filterValue.length === 0) return true;
      return filterValue.includes(String(row.getValue(columnId)));
    },
  },
  {
    accessorKey: "actorType",
    header: "Actor type",
    cell: ({ row }) => <span>{formatEnumLabel(row.original.actorType)}</span>,
    filterFn: (row, columnId, filterValue: string[]) => {
      if (!filterValue || filterValue.length === 0) return true;
      return filterValue.includes(String(row.getValue(columnId)));
    },
  },
  { accessorKey: "actorName", header: "Actor" },
  { accessorKey: "summary", header: "Summary" },
  {
    accessorKey: "resultingStatus",
    header: "Resulting status",
    cell: ({ row }) => <StatusBadge status={row.original.resultingStatus} />,
  },
  {
    accessorKey: "timestamp",
    header: "Timestamp",
    cell: ({ row }) => <span className="text-muted-foreground">{formatDateTime(row.original.timestamp)}</span>,
  },
];
