"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  FileClock,
  GitBranch,
  Network,
  PackageCheck,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { usePatients } from "@/lib/hooks/use-patients";
import { useAllAlerts } from "@/lib/hooks/use-alerts";
import { usePharmacyQueue, useNearMisses } from "@/lib/hooks/use-pharmacy";
import { useFederationOverview } from "@/lib/hooks/use-federation";
import { usePrescriptions } from "@/lib/hooks/use-prescriptions";

const OBJECTIVES = [
  {
    icon: ShieldAlert,
    title: "Surface risk fast",
    description:
      "Every prescription is screened for interactions, allergy conflicts, dosing, and monitoring concerns, with severity-first ordering so nothing critical gets buried.",
  },
  {
    icon: Users,
    title: "Keep decisions human-owned",
    description:
      "Agents recommend — doctors and pharmacists decide. Every screen frames backend suggestions as suggestions, and final clinical approval is always explicit.",
  },
  {
    icon: FileClock,
    title: "Make every decision traceable",
    description:
      "From agent trace to doctor review to pharmacist action to dispensing, each step is logged to an audit trail you can replay end to end.",
  },
  {
    icon: Network,
    title: "Watch the federation, honestly",
    description:
      "Node trust, training rounds, and update acceptance are shown exactly as reported — no invented scoring or grading layered on top.",
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

const AREAS = [
  {
    icon: Stethoscope,
    title: "Doctor",
    description: "Dashboard, patient list, prescription creation, and safety review — all in one workspace.",
  },
  {
    icon: ClipboardList,
    title: "Pharmacist",
    description: "Review queue, holds and modification loops, interventions, and near-miss recording.",
  },
  {
    icon: Network,
    title: "Federation",
    description: "Connected hospital nodes, training rounds, update status, and trust values.",
  },
  {
    icon: FileClock,
    title: "Audit",
    description: "A replayable workflow timeline across every prescription, human and agent alike.",
  },
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

      <div className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-12 lg:px-8">
        {/* Hero */}
        <section className="flex flex-col items-start gap-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" /> Decision-support prototype
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            MedX helps clinical teams catch medication risk without losing the human in the loop.
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            MedX brings prescription safety analysis, doctor and pharmacist review, dispensing workflows, and
            cross-hospital federation monitoring into one console. Every severity, status, and recommendation you
            see is generated by the backend and rendered as-is — MedX never computes clinical logic on the
            frontend, and every consequential decision still ends with a named person signing off.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg">
              <Link href="/login">Sign in to MedX</Link>
            </Button>
          </div>
        </section>

        {/* Objectives */}
        <section>
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">What MedX is for</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {OBJECTIVES.map((o) => (
              <Card key={o.title} className="py-5">
                <CardContent className="flex gap-3 pb-0">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <o.icon className="size-4.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{o.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{o.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section>
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">How it works</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {WORKFLOW_STEPS.map((step, i) => (
              <div key={step.title} className="flex gap-3 rounded-lg border bg-card p-4">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{step.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <GitBranch className="size-3.5" />
            Doctors can loop pharmacy back for modification, and pharmacists can hold or return prescriptions at any point — every transition is state-gated by the backend.
          </p>
        </section>

        {/* What's inside */}
        <section>
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">What&apos;s inside</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {AREAS.map((area) => (
              <Card key={area.title} className="py-5">
                <CardContent className="pb-0">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <area.icon className="size-4.5" />
                  </span>
                  <p className="mt-3 text-sm font-semibold text-foreground">{area.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{area.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Live snapshot */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">See it in action</h2>
            <span className="text-xs text-muted-foreground">Live numbers from the current backend data</span>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Patients tracked" value={patientsLoading ? "…" : (patients ?? []).length} icon={Users} />
            <StatCard
              label="Open safety alerts"
              value={alertsLoading ? "…" : openAlerts}
              icon={AlertTriangle}
              tone="danger"
            />
            <StatCard
              label="In pharmacy queue"
              value={queueLoading ? "…" : (queue ?? []).length}
              icon={ClipboardList}
              tone="warning"
            />
            <StatCard label="Dispensed" value={dispensedCount} icon={PackageCheck} tone="success" />
            <StatCard
              label="Near misses logged"
              value={nearMissLoading ? "…" : (nearMisses ?? []).length}
              icon={ShieldAlert}
            />
            <StatCard
              label="Federation round"
              value={federationLoading ? "…" : (federation?.currentRound ?? "—")}
              icon={Activity}
            />
            <StatCard
              label="Nodes connected"
              value={
                federationLoading
                  ? "…"
                  : `${federation?.connectedNodeCount ?? 0} / ${federation?.totalNodeCount ?? 0}`
              }
              icon={Network}
            />
          </div>
        </section>

        {/* Final CTA */}
        <section className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-10 text-center">
          <p className="text-lg font-semibold text-foreground">Ready to explore MedX?</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Sign in to reach the doctor, pharmacist, and federation workspaces.
          </p>
          <Button asChild size="lg">
            <Link href="/login">Sign in to MedX</Link>
          </Button>
        </section>

        <p className="border-t pt-6 text-xs text-muted-foreground">
          MedX is a UI prototype for demonstration and internal review. It is not clinically validated, not a
          substitute for clinical judgment, and not connected to a production backend. Every status, severity, and
          recommendation shown is illustrative placeholder data shaped to match a real API contract.
        </p>
      </div>
    </div>
  );
}
