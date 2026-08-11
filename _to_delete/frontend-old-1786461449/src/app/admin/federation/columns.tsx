"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { FederationLogEntry } from "@/lib/types";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDateTime, formatEnumLabel } from "@/lib/format";

export const federationLogColumns: ColumnDef<FederationLogEntry>[] = [
  { accessorKey: "round", header: "Round" },
  { accessorKey: "node", header: "Node" },
  {
    accessorKey: "event",
    header: "Event",
    cell: ({ row }) => <span>{formatEnumLabel(row.original.event)}</span>,
    filterFn: (row, columnId, filterValue: string[]) => {
      if (!filterValue || filterValue.length === 0) return true;
      return filterValue.includes(String(row.getValue(columnId)));
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status === "ok" ? "accepted" : row.original.status} />,
  },
  {
    accessorKey: "trustValue",
    header: "Trust value",
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.trustValue ?? "—"}</span>,
  },
  {
    accessorKey: "detail",
    header: "Detail",
    cell: ({ row }) => (
      <span className="block max-w-64 truncate text-muted-foreground" title={row.original.detail}>
        {row.original.detail ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "timestamp",
    header: "Timestamp",
    cell: ({ row }) => <span className="text-muted-foreground">{formatDateTime(row.original.timestamp)}</span>,
  },
];
