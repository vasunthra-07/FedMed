"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ClipboardList, Network, ShieldCheck, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { loginFormSchema, type LoginFormValues } from "@/lib/validation/login";

const QUICK_ENTRY = [
  { label: "Continue as Doctor", href: "/doctor/dashboard", icon: Stethoscope },
  { label: "Continue as Pharmacist", href: "/pharmacist/queue", icon: ClipboardList },
  { label: "Continue as Admin", href: "/admin/federation", icon: Network },
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Back to overview
        </Link>

        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-6" />
          </span>
          <h1 className="mt-3 text-lg font-semibold tracking-tight">MedX</h1>
          <p className="mt-1 text-sm text-muted-foreground">Medication safety &amp; federation console</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Enter your work credentials to continue.</CardDescription>
          </CardHeader>
          <CardContent className="pb-5">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
                <Button type="submit" className="w-full">
                  Continue
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Demo environment — authentication isn&apos;t connected to a backend yet. Any credentials will continue.
                </p>
              </form>
            </Form>

            <div className="my-5 flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or jump straight in</span>
              <Separator className="flex-1" />
            </div>

            <div className="flex flex-col gap-2">
              {QUICK_ENTRY.map((item) => (
                <Button key={item.href} asChild variant="outline" className="justify-start gap-2">
                  <Link href={item.href}>
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
