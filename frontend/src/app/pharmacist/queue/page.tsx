"use client";

import * as React from "react";
import { AlertTriangle, ClipboardList, PauseCircle, PackageCheck, Search } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { SeverityChip } from "@/components/shared/severity-chip";
import { QuickFilterBar, type QuickFilterOption } from "@/components/shared/quick-filter-bar";
import { QueueCasePreview } from "@/components/pharmacy/queue-case-preview";
import { Input } from "@/components/ui/input";
import { usePharmacyQueue } from "@/lib/hooks/use-pharmacy";
import { groupBySeverity, severityStripeClassRelative } from "@/lib/severity";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PharmacyQueueItem } from "@/lib/types";

type QuickFilterKey = "all" | "critical" | "on_hold" | "awaiting" | "ready";

const matchesQuickFilter = (item: PharmacyQueueItem, key: QuickFilterKey): boolean => {
  switch (key) {
    case "critical":
      return item.highestSeverity === "critical";
    case "on_hold":
      return item.holdStatus === "on_hold";
    case "awaiting":
      return item.reviewStatus === "queued" || item.reviewStatus === "in_review";
    case "ready":
      return item.reviewStatus === "approved";
    default:
      return true;
  }
};

export default function PharmacyQueuePage() {
  const { data: queue, isLoading } = usePharmacyQueue();
  const [quickFilter, setQuickFilter] = React.useState<QuickFilterKey>("all");
  const [search, setSearch] = React.useState("");
  const [selectedQueueId, setSelectedQueueId] = React.useState<string | null>(null);

  const items = queue ?? [];

  const critical = items.filter((q) => q.highestSeverity === "critical").length;
  const onHold = items.filter((q) => q.holdStatus === "on_hold").length;
  const awaiting = items.filter((q) => q.reviewStatus === "queued" || q.reviewStatus === "in_review").length;
  const readyToDispense = items.filter((q) => q.reviewStatus === "approved").length;

  const quickFilterOptions: QuickFilterOption[] = [
    { value: "all", label: "All", count: items.length },
    { value: "critical", label: "Critical", count: critical, tone: "danger" },
    { value: "on_hold", label: "On hold", count: onHold, tone: "danger" },
    { value: "awaiting", label: "Awaiting review", count: awaiting, tone: "warning" },
    { value: "ready", label: "Ready to dispense", count: readyToDispense, tone: "success" },
  ];

  const filtered = items.filter((item) => {
    if (!matchesQuickFilter(item, quickFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !item.patient.name.toLowerCase().includes(q) &&
        !item.prescriptionDisplayId.toLowerCase().includes(q) &&
        !item.queueId.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const groups = groupBySeverity(filtered, (item) => item.highestSeverity).map((group) => ({
    ...group,
    items: [...group.items].sort((a, b) => new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime()),
  }));

  // Default to the first visible case until the user explicitly picks one —
  // derived at render time (no effect) so there's no cascading setState.
  const explicitSelection = selectedQueueId ? (items.find((i) => i.queueId === selectedQueueId) ?? null) : null;
  const selectedItem = explicitSelection ?? filtered[0] ?? null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Pharmacy review queue" description="Prescriptions routed to pharmacy, ranked for fast triage." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button type="button" onClick={() => setQuickFilter("awaiting")} className="text-left">
          <StatCard
            label="Awaiting review"
            value={awaiting}
            icon={ClipboardList}
            tone="warning"
            className={cn(quickFilter === "awaiting" && "ring-2 ring-status-warning")}
          />
        </button>
        <button type="button" onClick={() => setQuickFilter("critical")} className="text-left">
          <StatCard
            label="Critical severity"
            value={critical}
            icon={AlertTriangle}
            tone="danger"
            className={cn(quickFilter === "critical" && "ring-2 ring-status-danger")}
          />
        </button>
        <button type="button" onClick={() => setQuickFilter("on_hold")} className="text-left">
          <StatCard
            label="On hold"
            value={onHold}
            icon={PauseCircle}
            tone="danger"
            className={cn(quickFilter === "on_hold" && "ring-2 ring-status-danger")}
          />
        </button>
        <button type="button" onClick={() => setQuickFilter("ready")} className="text-left">
          <StatCard
            label="Ready to dispense"
            value={readyToDispense}
            icon={PackageCheck}
            tone="success"
            className={cn(quickFilter === "ready" && "ring-2 ring-status-success")}
          />
        </button>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState title="Queue is empty" description="No prescriptions are currently routed to pharmacy." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr] lg:items-stretch">
          {/* Case list — compact, grouped by severity, one click to preview */}
          <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 lg:h-[calc(100vh-19rem)]">
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search patient, prescription…"
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <QuickFilterBar options={quickFilterOptions} value={quickFilter} onChange={(v) => setQuickFilter(v as QuickFilterKey)} />
            </div>

            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <EmptyState title="No matches" description="Try a different filter or search." />
              ) : (
                <div className="flex flex-col gap-4">
                  {groups.map((group) => (
                    <div key={group.key}>
                      <p className="mb-1.5 px-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                        {group.label} · {group.items.length}
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {group.items.map((item) => {
                          const isSelected = item.queueId === selectedQueueId;
                          return (
                            <button
                              key={item.queueId}
                              type="button"
                              onClick={() => setSelectedQueueId(item.queueId)}
                              className={cn(
                                "w-full rounded-md border bg-background px-3 py-2.5 pl-4 text-left transition-colors",
                                severityStripeClassRelative(item.highestSeverity),
                                isSelected ? "border-primary/40 bg-accent" : "hover:bg-accent/50"
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-foreground">{item.patient.name}</p>
                                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                                    {item.prescriptionDisplayId} · {item.patient.mrn}
                                  </p>
                                </div>
                                <SeverityChip severity={item.highestSeverity} size="sm" />
                              </div>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                <StatusBadge status={item.reviewStatus} />
                                {item.holdStatus === "on_hold" && <StatusBadge status="on_hold" />}
                              </div>
                              <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                <span className="truncate">{item.prescriber.name}</span>
                                <span className="shrink-0">{formatRelativeTime(item.queuedAt)}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Case preview — condensed safety analysis + quick actions */}
          <div className="rounded-lg border bg-card lg:h-[calc(100vh-19rem)] lg:overflow-hidden">
            {selectedItem ? (
              <QueueCasePreview key={selectedItem.queueId} queueItem={selectedItem} />
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="Select a case to review"
                description="Pick a prescription from the list to see its safety analysis and available actions."
                className="h-full"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
