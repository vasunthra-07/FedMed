"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Database,
  FileClock,
  FlaskConical,
  GitBranch,
  Lock,
  Network,
  PackageCheck,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TrustBadge } from "@/components/shared/trust-badge";
import { InterfacePreviewMockup } from "@/components/shared/interface-preview-mockup";
import { ProcessTimeline } from "@/components/shared/process-timeline";
import { usePatients } from "@/lib/hooks/use-patients";
import { useAllAlerts } from "@/lib/hooks/use-alerts";
import { usePharmacyQueue, useNearMisses } from "@/lib/hooks/use-pharmacy";
import { useFederationOverview } from "@/lib/hooks/use-federation";
import { usePrescriptions } from "@/lib/hooks/use-prescriptions";

const SAFETY_POINTS = [
  {
    icon: Users,
    title: "Human-owned decisions",
    description: "Agents recommend — doctors and pharmacists decide. Every workflow ends with a named person's explicit approval.",
  },
  {
    icon: Lock,
    title: "No clinical logic on the frontend",
    description: "Severity, status, and recommendations are rendered exactly as the backend returns them — never computed, scored, or inferred here.",
  },
  {
    icon: FileClock,
    title: "Full audit trail",
    description: "Every human and agent action is logged and replayable, end to end, for any prescription.",
  },
  {
    icon: Network,
    title: "Role-based access",
    description: "Doctors, pharmacists, and admins each see a workspace scoped to exactly what their role needs.",
  },
];

const ROLES = [
  {
    icon: Stethoscope,
    title: "Doctor",
    bullets: ["Dashboard ranked by severity", "Patient list & history", "Create & review prescriptions"],
  },
  {
    icon: ClipboardList,
    title: "Pharmacist",
    bullets: ["Fast triage review queue", "Hold & modification workflow", "Interventions & near misses"],
  },
  {
    icon: Network,
    title: "Admin",
    bullets: ["Federation node health", "Training round status", "Full workflow audit trail"],
  },
];

const WORKFLOW_STEPS = [
  { title: "Prescription created", detail: "Doctor drafts one or more medication items for a patient." },
  { title: "Automated safety analysis", detail: "Backend agents screen for interactions, allergies, dosing, and monitoring issues." },
  { title: "Doctor review", detail: "Doctor reads agent findings, accepts, modifies, justifies, or escalates to pharmacy." },
  { title: "Pharmacist review", detail: "Pharmacist approves, holds, or requests modification before dispensing." },
  { title: "Dispensing", detail: "Approved prescriptions are marked dispensed; holds and interventions stay visible." },
  { title: "Audit trail", detail: "Every step — human and agent — is recorded and reviewable at any time." },
];

const REAL_ITEMS = [
  "Component behavior & workflow gating — actions are enabled or disabled exactly as the backend's state machine would allow.",
  "Live counts shown on this page — pulled through the same data hooks the rest of the app uses.",
  "API contract shape — every mock response is structured the way a real backend response would be.",
];

const ILLUSTRATIVE_ITEMS = [
  "Patient, prescription, and safety data — generated from a seeded mock dataset, not real patients.",
  "Sign-in — the demo login isn't connected to a backend; role entry is for exploration only.",
  "Federation nodes & training rounds — simulated to demonstrate the monitoring views.",
];

export default function LandingPage() {
  const { data: patients, isLoading: patientsLoading } = usePatients();
  const { data: alerts, isLoading: alertsLoading } = useAllAlerts();
  const { data: queue, isLoading: queueLoading } = usePharmacyQueue();
  const { data: nearMisses, isLoading: nearMissLoading } = useNearMisses();
  const { data: federation, isLoading: federationLoading } = useFederationOverview();
  const { data: prescriptions } = usePrescriptions();

  const openAlerts = (alerts ?? []).filter((a) => a.reviewStatus === "open" || a.reviewStatus === "acknowledged").length;
  const dispensedCount = (prescriptions ?? []).filter((rx) => rx.workflowStatus === "dispensed").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Standalone top bar — no app sidebar here, nothing has been entered yet */}
      <header className="flex h-14 items-center justify-between border-b px-4 lg:px-8">
        <span className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <span className="text-sm font-semibold tracking-tight">MedX</span>
        </span>
        <Button asChild size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
      </header>

      <div className="mx-auto flex max-w-5xl flex-col gap-16 px-4 py-12 lg:px-8">
        {/* 1. What MedX is — hero, with an illustrative interface preview above the fold */}
        <section className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col items-start gap-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" /> Decision-support prototype
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              MedX helps clinical teams catch medication risk without losing the human in the loop.
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              MedX brings prescription safety analysis, doctor and pharmacist review, dispensing workflows, and
              cross-hospital federation monitoring into one console. Every severity, status, and recommendation you
              see is generated by the backend and rendered as-is.
            </p>
            <Button asChild size="lg">
              <Link href="/login">Sign in to MedX</Link>
            </Button>
          </div>
          <InterfacePreviewMockup className="w-full" />
        </section>

        {/* 2. Why it's safe to use — split-layout storytelling, not a card grid */}
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Why it&apos;s safe to use</h2>
            <p className="mt-3 text-xl font-semibold tracking-tight text-foreground">
              MedX is built to keep clinical judgment where it belongs — with the clinician.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The frontend never invents a severity, computes a risk score, or reasons about outcomes. It renders
              what the backend agents found, and every consequential step still requires a person to act on it.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {SAFETY_POINTS.map((point) => (
              <div key={point.title} className="flex gap-3 rounded-lg border bg-card p-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <point.icon className="size-4.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{point.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{point.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Who it's for */}
        <section>
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Who it&apos;s for</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {ROLES.map((role) => (
              <Card key={role.title} className="py-5">
                <CardContent className="pb-0">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <role.icon className="size-4.5" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-foreground">{role.title}</p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {role.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-primary/60" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 4. How review works — a real timeline, not a card grid */}
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">How review works</h2>
            <p className="mt-3 text-xl font-semibold tracking-tight text-foreground">
              One prescription, six checkpoints, a full paper trail.
            </p>
            <p className="mt-3 inline-flex items-start gap-1.5 text-xs text-muted-foreground">
              <GitBranch className="mt-0.5 size-3.5 shrink-0" />
              Doctors can loop pharmacy back for modification, and pharmacists can hold or return prescriptions at
              any point — every transition is state-gated by the backend.
            </p>
          </div>
          <ProcessTimeline steps={WORKFLOW_STEPS} />
        </section>

        {/* 5. What the interface looks like */}
        <section>
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">What the interface looks like</h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            An illustrative preview of the layout — severity-first triage, quick filters, and role-scoped navigation.
          </p>
          <InterfacePreviewMockup className="mx-auto max-w-2xl" />
        </section>

        {/* 6. Auditability, roles & federation — at a glance (live data) */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Auditability, roles &amp; federation — at a glance
            </h2>
            <span className="text-xs text-muted-foreground">Live numbers from the current backend data</span>
          </div>
          <div className="grid grid-cols-1 gap-4 rounded-xl border bg-card p-5 sm:grid-cols-3">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Users className="size-3.5 text-primary" /> Roles
              </p>
              <ul className="flex flex-col gap-1.5">
                {ROLES.map((r) => (
                  <li key={r.title} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <r.icon className="size-3.5 text-muted-foreground" /> {r.title}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Network className="size-3.5 text-primary" /> Federation
              </p>
              <p className="text-lg font-semibold text-foreground">
                {federationLoading ? "…" : `${federation?.connectedNodeCount ?? 0} / ${federation?.totalNodeCount ?? 0}`}
                <span className="ml-1 text-xs font-normal text-muted-foreground">nodes connected</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Round {federationLoading ? "…" : (federation?.currentRound ?? "—")}
              </p>
            </div>
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <FileClock className="size-3.5 text-primary" /> Audit
              </p>
              <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                <li>{alertsLoading ? "…" : openAlerts} open safety alerts</li>
                <li>{queueLoading ? "…" : (queue ?? []).length} in pharmacy queue</li>
                <li>{nearMissLoading ? "…" : (nearMisses ?? []).length} near misses logged</li>
              </ul>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MiniStat label="Patients tracked" value={patientsLoading ? "…" : (patients ?? []).length} icon={Activity} />
            <MiniStat label="Open alerts" value={alertsLoading ? "…" : openAlerts} icon={AlertTriangle} tone="danger" />
            <MiniStat label="In queue" value={queueLoading ? "…" : (queue ?? []).length} icon={ClipboardList} tone="warning" />
            <MiniStat label="Dispensed" value={dispensedCount} icon={PackageCheck} tone="success" />
          </div>
        </section>

        {/* 7. What data is real vs illustrative — a structured trust disclosure, not footer fine print */}
        <section className="rounded-xl border bg-card p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldAlert className="size-4.5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">What data is real vs. illustrative</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                MedX is a UI prototype for demonstration and internal review — not clinically validated, not a
                substitute for clinical judgment, and not connected to a production backend.
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-status-success uppercase">
                <CheckCircle2 className="size-3.5" /> Real
              </p>
              <ul className="flex flex-col gap-2">
                {REAL_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-status-success" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-status-warning uppercase">
                <FlaskConical className="size-3.5" /> Illustrative
              </p>
              <ul className="flex flex-col gap-2">
                {ILLUSTRATIVE_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-status-warning" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-5 flex items-center gap-1.5 border-t pt-4 text-xs text-muted-foreground">
            <Database className="size-3.5" /> Shaped to match a real API contract, so swapping in a live backend
            never touches component code.
          </p>
        </section>

        {/* 8. Sign in */}
        <section className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-10 text-center">
          <p className="text-lg font-semibold text-foreground">Ready to explore MedX?</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Sign in to choose a role and reach the doctor, pharmacist, or federation workspace.
          </p>
          <Button asChild size="lg">
            <Link href="/login">Sign in to MedX</Link>
          </Button>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <TrustBadge icon={ShieldCheck}>Prototype</TrustBadge>
            <TrustBadge icon={Database}>No production data</TrustBadge>
            <TrustBadge icon={Users}>Role-based demo</TrustBadge>
          </div>
        </section>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  tone?: "neutral" | "danger" | "warning" | "success";
}) {
  const toneStyles: Record<string, string> = {
    neutral: "text-foreground",
    danger: "text-status-danger",
    warning: "text-status-warning",
    success: "text-status-success",
  };
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <p className={`mt-1 text-xl font-semibold tracking-tight ${toneStyles[tone]}`}>{value}</p>
    </div>
  );
}
