"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Bot, ClipboardList, FileClock, Search } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { SeverityChip } from "@/components/shared/severity-chip";
import { StatusBadge } from "@/components/shared/status-badge";
import { RecommendationBlock } from "@/components/shared/recommendation-block";
import { FacetedFilter } from "@/components/shared/faceted-filter";
import { QuickFilterBar, type QuickFilterOption } from "@/components/shared/quick-filter-bar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAllAlerts } from "@/lib/hooks/use-alerts";
import { severityStripeClassRelative } from "@/lib/severity";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AlertRow } from "@/lib/api/alerts";

const SEVERITY_OPTIONS = ["critical", "high", "moderate", "low"].map((v) => ({ label: v, value: v }));
const CATEGORY_OPTIONS = [
  "drug_interaction",
  "allergy_conflict",
  "contraindication",
  "duplicate_therapy",
  "dose_concern",
  "renal_hepatic_concern",
  "missing_information",
  "monitoring_requirement",
].map((v) => ({ label: v, value: v }));
const STATUS_OPTIONS = ["open", "acknowledged", "action_taken", "resolved", "dismissed"].map((v) => ({ label: v, value: v }));

type QuickFilterKey = "all" | "critical" | "high" | "needs_action" | "resolved";

function AlertDetailPanel({ alert }: { alert: AlertRow }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">{alert.prescriptionDisplayId}</p>
            <h2 className="truncate text-base font-semibold text-foreground">{alert.patientName}</h2>
            <p className="text-xs text-muted-foreground">Detected {formatDateTime(alert.detectedAt)}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            <SeverityChip severity={alert.severity} />
            <StatusBadge status={alert.reviewStatus} />
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-foreground">{alert.shortTitle}</p>
          <p className="mt-0.5 text-sm font-medium text-foreground/80">{alert.medicationLabel}</p>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">{alert.clinicalExplanation}</p>

        <RecommendationBlock action={alert.recommendedAction} approverRole="doctor" />

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 px-3.5 py-2.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Bot className="size-3.5" />
            Detected by {alert.detectingAgent}
          </span>
          <span>{alert.category.replace(/_/g, " ")}</span>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-1 border-t bg-muted/30 px-4 py-2.5">
        <Button asChild size="sm" className="gap-1.5">
          <Link href={`/prescriptions/${alert.prescriptionId}/review`}>
            Open full review <ArrowUpRight className="size-3.5" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <Link href={`/prescriptions/${alert.prescriptionId}/safety-analysis`}>
            <FileClock className="size-3.5" /> Full safety analysis
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="ml-auto gap-1.5 text-muted-foreground">
          <Link href={`/doctor/patients/${alert.patientId}`}>{alert.patientName}</Link>
        </Button>
      </div>
    </div>
  );
}

export default function SafetyAlertsPage() {
  const { data: alerts, isLoading } = useAllAlerts();
  const [quickFilter, setQuickFilter] = React.useState<QuickFilterKey>("all");
  const [severity, setSeverity] = React.useState<string[]>([]);
  const [category, setCategory] = React.useState<string[]>([]);
  const [status, setStatus] = React.useState<string[]>([]);
  const [query, setQuery] = React.useState("");
  const [selectedAlertId, setSelectedAlertId] = React.useState<string | null>(null);

  const allAlerts = alerts ?? [];
  const criticalCount = allAlerts.filter((a) => a.severity === "critical").length;
  const highCount = allAlerts.filter((a) => a.severity === "high").length;
  const needsActionCount = allAlerts.filter((a) => a.reviewStatus === "open" || a.reviewStatus === "acknowledged").length;
  const resolvedCount = allAlerts.filter((a) => a.reviewStatus === "resolved" || a.reviewStatus === "dismissed").length;

  const quickFilterOptions: QuickFilterOption[] = [
    { value: "all", label: "All", count: allAlerts.length },
    { value: "critical", label: "Critical", count: criticalCount, tone: "danger" },
    { value: "high", label: "High", count: highCount, tone: "warning" },
    { value: "needs_action", label: "Needs action", count: needsActionCount, tone: "warning" },
    { value: "resolved", label: "Resolved / dismissed", count: resolvedCount, tone: "success" },
  ];

  const filtered = allAlerts.filter((a) => {
    if (quickFilter === "critical" && a.severity !== "critical") return false;
    if (quickFilter === "high" && a.severity !== "high") return false;
    if (quickFilter === "needs_action" && !(a.reviewStatus === "open" || a.reviewStatus === "acknowledged")) return false;
    if (quickFilter === "resolved" && !(a.reviewStatus === "resolved" || a.reviewStatus === "dismissed")) return false;
    if (severity.length && !severity.includes(a.severity)) return false;
    if (category.length && !category.includes(a.category)) return false;
    if (status.length && !status.includes(a.reviewStatus)) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!a.patientName.toLowerCase().includes(q) && !a.medicationLabel.toLowerCase().includes(q) && !a.prescriptionDisplayId.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  // Derived at render time (no effect / no cascading setState): default to
  // the first visible alert until the user explicitly picks one.
  const explicitSelection = selectedAlertId ? (allAlerts.find((a) => a.id === selectedAlertId) ?? null) : null;
  const selectedAlert = explicitSelection ?? filtered[0] ?? null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Medication safety alerts" description="Every backend-detected issue across your patients, most recent first." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient, medication, Rx ID…" className="h-8 pl-8 text-xs" />
        </div>
        <QuickFilterBar options={quickFilterOptions} value={quickFilter} onChange={(v) => setQuickFilter(v as QuickFilterKey)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FacetedFilter title="Severity" options={SEVERITY_OPTIONS} selected={severity} onChange={setSeverity} />
        <FacetedFilter title="Category" options={CATEGORY_OPTIONS} selected={category} onChange={setCategory} />
        <FacetedFilter title="Review status" options={STATUS_OPTIONS} selected={status} onChange={setStatus} />
      </div>

      {isLoading ? (
        <LoadingState />
      ) : allAlerts.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No alerts detected" />
      ) : (
        <div className="rounded-xl border bg-card lg:grid lg:grid-cols-[400px_1fr] lg:overflow-hidden">
          {/* Alert list — compact rows, severity leading the eye */}
          <div className="flex flex-col border-b p-3 lg:h-[calc(100vh-20rem)] lg:border-r lg:border-b-0">
            {filtered.length === 0 ? (
              <EmptyState title="No matches" description="Try a different filter or search." />
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col gap-1.5">
                  {filtered.map((alert) => {
                    const isSelected = alert.id === selectedAlertId || (!selectedAlertId && alert === filtered[0]);
                    return (
                      <button
                        key={alert.id}
                        type="button"
                        onClick={() => setSelectedAlertId(alert.id)}
                        className={cn(
                          "w-full rounded-md border pl-4 text-left transition-all",
                          severityStripeClassRelative(alert.severity),
                          isSelected
                            ? "border-primary/50 bg-primary-soft shadow-sm"
                            : "border-transparent bg-background hover:border-border hover:bg-accent/50"
                        )}
                      >
                        <div className="px-3 py-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">{alert.patientName}</p>
                              <p className="truncate text-xs text-muted-foreground">{alert.shortTitle}</p>
                            </div>
                            <SeverityChip severity={alert.severity} size="sm" />
                          </div>
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            <StatusBadge status={alert.reviewStatus} />
                            <span className="shrink-0 text-[11px] text-muted-foreground">{formatRelativeTime(alert.detectedAt)}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Detail pane — full clinical context without leaving the list */}
          <div className="lg:h-[calc(100vh-20rem)] lg:overflow-hidden">
            {selectedAlert ? (
              <AlertDetailPanel key={selectedAlert.id} alert={selectedAlert} />
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="Select an alert to review"
                description="Pick an alert from the list to see its full clinical detail and recommendation."
                className="h-full"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
