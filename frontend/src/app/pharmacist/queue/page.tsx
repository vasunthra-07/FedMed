"use client";

import * as React from "react";
import { AlertTriangle, Clock3, ClipboardList, PauseCircle, PackageCheck, Search, UserRound } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
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
type SavedView = "needs_action" | "aging" | "my_queue";

const AGING_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4h — a triage cutoff, not a clinical judgment
const MY_QUEUE_PHARMACIST = "James Whitfield"; // the mocked signed-in pharmacist (see app-shell VIEWERS)

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

const matchesSavedView = (item: PharmacyQueueItem, view: SavedView): boolean => {
  switch (view) {
    case "needs_action":
      return item.reviewStatus === "in_review" || item.reviewStatus === "modification_requested" || item.holdStatus === "on_hold";
    case "aging":
      return Date.now() - new Date(item.queuedAt).getTime() > AGING_THRESHOLD_MS;
    case "my_queue":
      return item.assignedPharmacist?.name === MY_QUEUE_PHARMACIST;
  }
};

const SAVED_VIEWS: { key: SavedView; label: string; icon: typeof Clock3 }[] = [
  { key: "needs_action", label: "Needs action", icon: AlertTriangle },
  { key: "aging", label: "Aging", icon: Clock3 },
  { key: "my_queue", label: "My queue", icon: UserRound },
];

export default function PharmacyQueuePage() {
  const { data: queue, isLoading } = usePharmacyQueue();
  const [quickFilter, setQuickFilter] = React.useState<QuickFilterKey>("all");
  const [savedViews, setSavedViews] = React.useState<Set<SavedView>>(new Set());
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

  function toggleSavedView(view: SavedView) {
    setSavedViews((prev) => {
      const next = new Set(prev);
      if (next.has(view)) next.delete(view);
      else next.add(view);
      return next;
    });
  }

  const filtered = items.filter((item) => {
    if (!matchesQuickFilter(item, quickFilter)) return false;
    for (const view of savedViews) {
      if (!matchesSavedView(item, view)) return false;
    }
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

      {/* Queue health strip — one surface, not four separate cards */}
      <div className="grid grid-cols-2 divide-y divide-border rounded-xl border bg-card sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {(
          [
            { key: "awaiting" as const, label: "Awaiting review", value: awaiting, icon: ClipboardList, tone: "warning" as const },
            { key: "critical" as const, label: "Critical severity", value: critical, icon: AlertTriangle, tone: "danger" as const },
            { key: "on_hold" as const, label: "On hold", value: onHold, icon: PauseCircle, tone: "danger" as const },
            { key: "ready" as const, label: "Ready to dispense", value: readyToDispense, icon: PackageCheck, tone: "success" as const },
          ]
        ).map((seg) => {
          const active = quickFilter === seg.key;
          const toneText: Record<string, string> = {
            warning: "text-status-warning",
            danger: "text-status-danger",
            success: "text-status-success",
          };
          return (
            <button
              key={seg.key}
              type="button"
              onClick={() => setQuickFilter(active ? "all" : seg.key)}
              className={cn(
                "flex items-center justify-between gap-3 px-5 py-4 text-left transition-colors first:rounded-l-xl last:rounded-r-xl",
                active ? "bg-primary-soft" : "hover:bg-accent/40"
              )}
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{seg.label}</p>
                <p className={cn("mt-1 text-2xl leading-none font-semibold tracking-tight", toneText[seg.tone] ?? "text-foreground")}>
                  {seg.value}
                </p>
              </div>
              <seg.icon className={cn("size-4 shrink-0", toneText[seg.tone] ?? "text-muted-foreground")} />
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState title="Queue is empty" description="No prescriptions are currently routed to pharmacy." />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-xs">
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

          {/* Saved views — additive triage lenses on top of the primary filter */}
          <div className="-mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Saved views:</span>
            {SAVED_VIEWS.map((view) => {
              const active = savedViews.has(view.key);
              return (
                <button
                  key={view.key}
                  type="button"
                  onClick={() => toggleSavedView(view.key)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    active ? "border-primary/40 bg-primary-soft text-primary" : "border-border bg-card text-muted-foreground hover:bg-accent"
                  )}
                >
                  <view.icon className="size-3" />
                  {view.label}
                </button>
              );
            })}
          </div>

          {/* One workspace surface — list and detail share a single frame */}
          <div className="rounded-xl border bg-card lg:grid lg:grid-cols-[380px_1fr] lg:overflow-hidden">
            {/* Case list — compact, grouped by severity, one click to preview */}
            <div className="flex flex-col border-b p-3 lg:h-[calc(100vh-24rem)] lg:border-r lg:border-b-0">
              {filtered.length === 0 ? (
                <EmptyState title="No matches" description="Try a different filter or search." />
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <div className="flex flex-col gap-4">
                    {groups.map((group) => (
                      <div key={group.key}>
                        <p className="mb-1.5 px-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                          {group.label} · {group.items.length}
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {group.items.map((item) => {
                            const isSelected = item.queueId === selectedQueueId || (!selectedQueueId && item === filtered[0]);
                            const isAging = Date.now() - new Date(item.queuedAt).getTime() > AGING_THRESHOLD_MS;
                            return (
                              <button
                                key={item.queueId}
                                type="button"
                                onClick={() => setSelectedQueueId(item.queueId)}
                                className={cn(
                                  "w-full rounded-md border pl-4 text-left transition-all",
                                  severityStripeClassRelative(item.highestSeverity),
                                  isSelected
                                    ? "border-primary/50 bg-primary-soft shadow-sm"
                                    : "border-transparent bg-background hover:border-border hover:bg-accent/50"
                                )}
                              >
                                <div className="px-3 py-2.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-foreground">{item.patient.name}</p>
                                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                                        {item.prescriptionDisplayId} · {item.patient.mrn}
                                      </p>
                                    </div>
                                    <SeverityChip severity={item.highestSeverity} size="sm" />
                                  </div>
                                  <div className="mt-1.5 flex items-center gap-1.5">
                                    <StatusBadge status={item.reviewStatus} />
                                  </div>
                                  {item.holdStatus === "on_hold" && item.holdReason && (
                                    <p className="mt-1 truncate text-[11px] text-muted-foreground italic">{item.holdReason}</p>
                                  )}
                                  <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                    <span className="truncate">{item.prescriber.name}</span>
                                    <span className={cn("inline-flex shrink-0 items-center gap-1", isAging && "font-medium text-status-warning")}>
                                      {isAging && <Clock3 className="size-3" />}
                                      {formatRelativeTime(item.queuedAt)}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Case preview — condensed safety analysis + quick actions */}
            <div className="lg:h-[calc(100vh-24rem)] lg:overflow-hidden">
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
        </>
      )}
    </div>
  );
}
