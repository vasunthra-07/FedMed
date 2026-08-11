"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Search } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { MedicationSafetyCard } from "@/components/shared/medication-safety-card";
import { FacetedFilter } from "@/components/shared/faceted-filter";
import { QuickFilterBar, type QuickFilterOption } from "@/components/shared/quick-filter-bar";
import { Input } from "@/components/ui/input";
import { useAllAlerts } from "@/lib/hooks/use-alerts";
import { FileClock } from "lucide-react";

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

export default function SafetyAlertsPage() {
  const { data: alerts, isLoading } = useAllAlerts();
  const [quickFilter, setQuickFilter] = React.useState<QuickFilterKey>("all");
  const [severity, setSeverity] = React.useState<string[]>([]);
  const [category, setCategory] = React.useState<string[]>([]);
  const [status, setStatus] = React.useState<string[]>([]);
  const [query, setQuery] = React.useState("");

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

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Medication safety alerts" description="Every backend-detected issue across your patients, most recent first." />

      <QuickFilterBar options={quickFilterOptions} value={quickFilter} onChange={(v) => setQuickFilter(v as QuickFilterKey)} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient, medication, Rx ID…" className="pl-8" />
        </div>
        <FacetedFilter title="Severity" options={SEVERITY_OPTIONS} selected={severity} onChange={setSeverity} />
        <FacetedFilter title="Category" options={CATEGORY_OPTIONS} selected={category} onChange={setCategory} />
        <FacetedFilter title="Review status" options={STATUS_OPTIONS} selected={status} onChange={setStatus} />
      </div>

      {isLoading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No alerts match these filters" description="Try clearing a filter or search term." />
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {filtered.map((alert) => (
            <MedicationSafetyCard
              key={alert.id}
              issue={alert}
              footer={
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/doctor/patients/${alert.patientId}`} className="text-xs font-medium text-primary hover:underline">
                    {alert.patientName}
                  </Link>
                  <Link
                    href={`/prescriptions/${alert.prescriptionId}/safety-analysis`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
                  >
                    <FileClock className="size-3.5" /> {alert.prescriptionDisplayId}
                  </Link>
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
