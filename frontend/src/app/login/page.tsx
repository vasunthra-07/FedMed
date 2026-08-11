"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Info,
  Loader2,
  Network,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { loginFormSchema, type LoginFormValues } from "@/lib/validation/login";
import { cn } from "@/lib/utils";

const ROLES = [
  {
    label: "Doctor",
    href: "/doctor/dashboard",
    icon: Stethoscope,
    descriptor: "Review findings and approve or escalate prescriptions.",
  },
  {
    label: "Pharmacist",
    href: "/pharmacist/queue",
    icon: ClipboardList,
    descriptor: "Triage the queue, place holds, and document interventions.",
  },
  {
    label: "Admin",
    href: "/admin/federation",
    icon: Network,
    descriptor: "Inspect federation status, audit flow, and oversight data.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [pendingRole, setPendingRole] = React.useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit() {
    // No backend auth is connected yet — this is a UI placeholder. A short,
    // real loading state keeps the "Continue" action feeling intentional
    // rather than instant/fake.
    setIsSubmitting(true);
    window.setTimeout(() => router.push("/doctor/dashboard"), 550);
  }

  function enterAsRole(href: string) {
    setPendingRole(href);
    window.setTimeout(() => router.push(href), 350);
  }

  return (
    <div
      className="relative flex min-h-screen flex-col items-center bg-background px-4 py-10"
      style={{
        backgroundImage:
          "radial-gradient(var(--border) 1px, transparent 1px), radial-gradient(var(--border) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
        backgroundPosition: "0 0, 16px 16px",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Soften the grid so it reads as texture, not decoration */}
      <div className="pointer-events-none absolute inset-0 bg-background/90" />

      <div className="relative z-10 w-full max-w-[440px]">
        {/* 1. Top utility */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-sm text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <ArrowLeft className="size-3.5" /> Back to overview
          </Link>
          <span className="rounded-full border bg-card px-2.5 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Prototype
          </span>
        </div>

        {/* 2. Brand header */}
        <div className="mb-7 flex flex-col items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="size-7" />
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">MedX</h1>
          <p className="mt-1 text-sm text-muted-foreground">Medication safety &amp; federation console</p>
        </div>

        {/* Outer frame — a touch darker than the card, so the card reads as anchored */}
        <div className="animate-in fade-in slide-in-from-bottom-4 rounded-2xl bg-surface-alt p-2 shadow-sm duration-500">
          <div className="rounded-xl border bg-card p-6 shadow-md sm:p-7">
            {/* 3. Card title + support copy */}
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use your work credentials to continue, or enter the prototype by role.
            </p>

            {/* 4–6. Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@hospital.org" autoComplete="username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" autoComplete="current-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="mt-1 w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Continuing…
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </form>
            </Form>

            {/* 7. Prototype info callout */}
            <div className="mt-5 flex items-start gap-2.5 rounded-lg bg-primary-soft px-3.5 py-3">
              <Info className="mt-0.5 size-4 shrink-0 text-primary-dark" />
              <div>
                <p className="text-xs font-semibold text-primary-dark">Prototype environment</p>
                <p className="mt-0.5 text-xs leading-relaxed text-primary-dark/80">
                  This demo is not connected to a live clinical backend. Role-based entry is available for product
                  review.
                </p>
              </div>
            </div>

            {/* 8. Divider */}
            <div className="mt-5 flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs font-medium text-muted-foreground">Or explore by role</span>
              <Separator className="flex-1" />
            </div>

            {/* 9. Role access — real entry modes, not fallback buttons */}
            <div className="mt-4 flex flex-col gap-2">
              {ROLES.map((role) => {
                const isPending = pendingRole === role.href;
                return (
                  <button
                    key={role.href}
                    type="button"
                    onClick={() => enterAsRole(role.href)}
                    disabled={pendingRole !== null}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg border bg-background px-3.5 py-3 text-left transition-all",
                      "hover:border-primary/40 hover:bg-primary-soft hover:shadow-sm",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
                      "disabled:cursor-not-allowed disabled:opacity-60"
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {isPending ? <Loader2 className="size-4.5 animate-spin" /> : <role.icon className="size-4.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-1">
                        <span className="text-sm font-semibold text-foreground">Continue as {role.label}</span>
                        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{role.descriptor}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 10. Responsible-use note */}
        <p className="mt-5 text-center text-xs text-muted-faint">
          MedX is a prototype for internal review — not for live clinical use.
        </p>
      </div>
    </div>
  );
}
