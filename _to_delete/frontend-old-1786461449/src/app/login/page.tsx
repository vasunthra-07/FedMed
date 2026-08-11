"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Database,
  Network,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { TrustBadge } from "@/components/shared/trust-badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { loginFormSchema, type LoginFormValues } from "@/lib/validation/login";
import { cn } from "@/lib/utils";

const ROLES = [
  {
    label: "Doctor",
    href: "/doctor/dashboard",
    icon: Stethoscope,
    description: "Dashboard, patients, prescriptions, and safety review.",
  },
  {
    label: "Pharmacist",
    href: "/pharmacist/queue",
    icon: ClipboardList,
    description: "Review queue, holds, interventions, and near misses.",
  },
  {
    label: "Admin",
    href: "/admin/federation",
    icon: Network,
    description: "Federation nodes, training rounds, and the audit trail.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit() {
    // No backend auth is connected yet — this is a UI placeholder.
    // Submitting takes you into the app instead of authenticating.
    router.push("/doctor/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-2xl">
        <Link href="/" className="mb-6 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to overview
        </Link>

        <div className="mb-5 flex flex-col items-center text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-6" />
          </span>
          <h1 className="mt-3 text-lg font-semibold tracking-tight">MedX</h1>
          <p className="mt-1 text-sm text-muted-foreground">Medication safety &amp; federation console</p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <TrustBadge icon={ShieldCheck}>Prototype</TrustBadge>
            <TrustBadge icon={Database}>No production data</TrustBadge>
            <TrustBadge icon={Users}>Role-based demo</TrustBadge>
          </div>
        </div>

        {/* Primary path: role-first entry */}
        <div className="rounded-xl border bg-card p-6 shadow-xs">
          <div className="text-center">
            <h2 className="text-base font-semibold text-foreground">Choose your role to explore</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Jump straight into a role-based demo workspace — no credentials needed.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {ROLES.map((role) => (
              <Link
                key={role.href}
                href={role.href}
                className={cn(
                  "group flex flex-col items-start gap-2 rounded-lg border bg-background p-4 text-left transition-colors",
                  "hover:border-primary/40 hover:bg-accent/40"
                )}
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <role.icon className="size-4.5" />
                </span>
                <span className="flex w-full items-center justify-between gap-1">
                  <span className="text-sm font-semibold text-foreground">{role.label}</span>
                  <ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">{role.description}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Secondary path: prototype auth form, demoted below role entry */}
        <div className="mt-5 flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or use prototype auth</span>
          <Separator className="flex-1" />
        </div>

        <div className="mt-5 rounded-xl border border-dashed bg-card/60 p-5">
          <p className="text-sm font-medium text-foreground">Sign in with email</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Demo environment — authentication isn&apos;t connected to a backend. Any credentials will continue.
          </p>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="flex-1">
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
                  <FormItem className="flex-1">
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" variant="outline" className="sm:w-auto">
                Continue
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
