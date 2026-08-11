"use client";

import Link from "next/link";
import {
  Bot,
  CheckCircle2,
  ClipboardList,
  FileClock,
  FlaskConical,
  GitBranch,
  Network,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Users,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { TrustStrip } from "@/components/landing/trust-strip";
import { AnnotatedPreview } from "@/components/landing/annotated-preview";
import { RoleFeaturePanel } from "@/components/landing/role-feature-panel";
import { NodeMapMockup } from "@/components/landing/node-map-mockup";
import { InterfacePreviewMockup } from "@/components/shared/interface-preview-mockup";
import { ProcessTimeline } from "@/components/shared/process-timeline";
import { useFederationOverview } from "@/lib/hooks/use-federation";
import { formatEnumLabel } from "@/lib/format";

const TRUST_STRIP_ITEMS = [
  { icon: Users, label: "Human-approved decisions" },
  { icon: Bot, label: "Backend-driven recommendations" },
  { icon: FileClock, label: "Replayable audit trail" },
  { icon: FlaskConical, label: "Prototype only, not for live clinical use" },
];

const WORKFLOW_STEPS = [
  { title: "Prescription created", detail: "Doctor drafts one or more medication items for a patient." },
  { title: "Automated safety analysis", detail: "Backend agents screen for interactions, allergies, dosing, and monitoring issues." },
  { title: "Doctor review", detail: "Doctor reads agent findings, accepts, modifies, justifies, or escalates to pharmacy." },
  { title: "Pharmacist review", detail: "Pharmacist approves, holds, or requests modification before dispensing." },
  { title: "Dispense or hold", detail: "Approved prescriptions move to dispensing; holds stay visible until resolved." },
  { title: "Audit record created", detail: "Every step — human and agent — is recorded and reviewable at any time." },
];

const ROLE_PANELS = [
  {
    icon: Stethoscope,
    title: "Doctor workspace",
    description: "Draft, review, and act on backend safety findings.",
    bullets: ["Draft prescriptions", "Review agent findings", "Accept, modify, justify, or escalate"],
    href: "/doctor/dashboard",
    previewUrl: "medx.app/doctor/dashboard",
    previewActiveLabel: "Dashboard",
  },
  {
    icon: ClipboardList,
    title: "Pharmacist queue",
    description: "Triage the review queue and act with full context.",
    bullets: ["Triage by severity", "Hold or intervene", "Track queue aging and pending issues"],
    href: "/pharmacist/queue",
    previewUrl: "medx.app/pharmacist/queue",
    previewActiveLabel: "Review queue",
  },
  {
    icon: Network,
    title: "Admin / federation oversight",
    description: "Monitor the system beyond any single prescription.",
    bullets: ["Monitor nodes and rounds", "Review audit logs", "Inspect trust and update acceptance"],
    href: "/admin/federation",
    previewUrl: "medx.app/admin/federation",
    previewActiveLabel: "Federation",
  },
];

const PROOF_BULLETS = [
  "Severity-first ranking so critical cases surface fast",
  "Review states and hold reasons visible in context",
  "Human decisions logged step by step",
  "Federation monitoring shown as reported, without invented scoring",
];

const AUDIT_BULLETS = [
  "Prescription timeline, from creation to dispensing",
  "Every role action — doctor, pharmacist, admin",
  "Full intervention history",
  "Backend recommendation visibility at each step",
];

const WHAT_IT_DOES = [
  "Surfaces medication-related risks",
  "Supports doctor and pharmacist review",
  "Records auditable workflow state",
  "Shows federation monitoring information",
];

const WHAT_IT_DOES_NOT_CLAIM = [
  "Not production ready",
  "Not clinically validated",
  "Not HIPAA or GDPR compliant",
  "Not a replacement for clinical judgment",
];

const FINAL_CTA_ROLES = [
  { label: "Continue as Doctor", href: "/doctor/dashboard" },
  { label: "Continue as Pharmacist", href: "/pharmacist/queue" },
  { label: "Continue as Admin", href: "/admin/federation" },
];

const FOOTER_LINKS = [
  { label: "Overview", href: "#overview" },
  { label: "Workflow", href: "#workflow" },
  { label: "Sign in", href: "/login" },
];

export default function LandingPage() {
  const { data: federation, isLoading: federationLoading } = useFederationOverview();

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />

      <main className="flex flex-col">
        {/* 1. Hero */}
        <section id="overview" className="mx-auto w-full max-w-6xl px-4 py-16 lg:px-8 lg:py-24">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <div className="flex flex-col items-start gap-5">
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary" /> Decision-support prototype
              </span>
              <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground lg:text-4xl">
                Medication safety review designed for human accountability.
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
                MedX helps clinical teams surface prescription risk, route reviews across doctors and pharmacists,
                and keep every consequential action traceable. Recommendations come from the backend. Final
                approval stays with people.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/login">Explore MedX</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <a href="#workflow">See workflow</a>
                </Button>
              </div>
            </div>
            <AnnotatedPreview />
          </div>
        </section>

        {/* 2. Trust strip */}
        <TrustStrip items={TRUST_STRIP_ITEMS} />

        {/* 3. Workflow */}
        <section id="workflow" className="mx-auto w-full max-w-6xl px-4 py-16 lg:px-8 lg:py-20">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">How MedX works</h2>
          </div>
          <ProcessTimeline steps={WORKFLOW_STEPS} />
          <p className="mx-auto mt-8 flex max-w-2xl items-start justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <GitBranch className="mt-0.5 size-3.5 shrink-0" />
            Every transition is state-gated by the backend, and every clinical decision remains explicitly
            human-owned.
          </p>
        </section>

        {/* 4. Role-based section */}
        <section id="roles" className="border-t bg-surface-alt">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 lg:px-8 lg:py-20">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Built for each part of the review chain</h2>
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {ROLE_PANELS.map((role) => (
                <RoleFeaturePanel key={role.title} {...role} />
              ))}
            </div>
          </div>
        </section>

        {/* 5. Product proof */}
        <section id="proof" className="mx-auto w-full max-w-6xl px-4 py-16 lg:px-8 lg:py-20">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <InterfacePreviewMockup url="medx.app/doctor/dashboard" activeLabel="Dashboard" className="w-full" />
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Designed for visible, reviewable clinical flow
              </h2>
              <ul className="mt-5 flex flex-col gap-3">
                {PROOF_BULLETS.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 6. Federation + audit — distinct background, the differentiator */}
        <section className="bg-primary-dark text-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 lg:px-8 lg:py-20">
            <h2 className="text-2xl font-semibold tracking-tight text-balance">Oversight beyond the individual prescription</h2>
            <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                <div>
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-white/70 uppercase">
                    <Network className="size-3.5" /> Federation visibility
                  </p>
                  <ul className="flex flex-col gap-2.5 text-sm text-white/90">
                    <li>
                      Connected nodes —{" "}
                      <strong className="font-semibold text-white">
                        {federationLoading ? "…" : `${federation?.connectedNodeCount ?? 0} / ${federation?.totalNodeCount ?? 0}`}
                      </strong>
                    </li>
                    <li>
                      Current round —{" "}
                      <strong className="font-semibold text-white">
                        {federationLoading ? "…" : (federation?.currentRound ?? "—")}
                      </strong>{" "}
                      ({federationLoading ? "…" : formatEnumLabel(federation?.roundStatus)})
                    </li>
                    <li>Per-node trust value and update acceptance, shown exactly as reported</li>
                  </ul>
                </div>
                <div>
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-white/70 uppercase">
                    <FileClock className="size-3.5" /> Audit replay
                  </p>
                  <ul className="flex flex-col gap-2.5 text-sm text-white/90">
                    {AUDIT_BULLETS.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <NodeMapMockup />
            </div>
          </div>
        </section>

        {/* 7. Responsible use */}
        <section id="trust" className="mx-auto w-full max-w-6xl px-4 py-16 lg:px-8 lg:py-20">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">What MedX is, and what it is not</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-xl border bg-card p-6">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-status-success uppercase">
                <CheckCircle2 className="size-3.5" /> What it does
              </p>
              <ul className="flex flex-col gap-2.5">
                {WHAT_IT_DOES.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-status-success" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border bg-card p-6">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-status-danger uppercase">
                <ShieldAlert className="size-3.5" /> What it does not claim
              </p>
              <ul className="flex flex-col gap-2.5">
                {WHAT_IT_DOES_NOT_CLAIM.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                    <XCircle className="mt-0.5 size-4 shrink-0 text-status-danger" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 8. Final CTA */}
        <section className="border-t bg-surface-alt">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 py-16 text-center lg:px-8 lg:py-20">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Enter the MedX prototype</h2>
            <p className="text-sm text-muted-foreground">Choose a role and explore the workflow from review to audit.</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              {FINAL_CTA_ROLES.map((role) => (
                <Button key={role.href} asChild size="lg" variant="outline">
                  <Link href={role.href}>{role.label}</Link>
                </Button>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* 9. Footer */}
      <footer className="border-t bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 lg:flex-row lg:items-start lg:justify-between lg:px-8">
          <div className="max-w-sm">
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4.5 text-primary" />
              <span className="text-sm font-semibold tracking-tight text-foreground">MedX</span>
            </span>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              MedX is a decision-support UI prototype for internal review and demonstration. It is not clinically
              validated, not production-ready, and not connected to a live clinical backend or real patient data.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-sm text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
