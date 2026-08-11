"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND, NAV_SECTIONS } from "@/components/nav/nav-config";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronsUpDown, Home } from "lucide-react";

const VIEWERS = [
  { name: "Dr. Anita Rao", role: "Doctor · Internal Medicine" },
  { name: "James Whitfield", role: "Pharmacist" },
  { name: "Hospital Admin", role: "Hospital Administrator" },
];

// The mock login screen at "/" is a full-bleed page with no app chrome —
// nothing has been "entered" yet, so the sidebar/nav don't apply there.
const CHROMELESS_ROUTES = new Set(["/"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (CHROMELESS_ROUTES.has(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card lg:flex">
        <Link href="/home" className="flex h-14 items-center gap-2 border-b px-4 hover:bg-accent/50">
          <BRAND.icon className="size-5 text-primary" />
          <span className="text-sm font-semibold tracking-tight">{BRAND.name}</span>
        </Link>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <div className="mb-4">
            <Link
              href="/home"
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                pathname === "/home"
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Home className="size-4 shrink-0" />
              Overview
            </Link>
          </div>
          {NAV_SECTIONS.map((section) => (
            <div key={section.id} className="mb-4">
              <p className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                {section.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.match ?? "__none__");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-secondary text-secondary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t p-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md p-1.5 text-left hover:bg-accent">
              <Avatar className="size-8">
                <AvatarFallback className="bg-primary/10 text-primary">AR</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">Dr. Anita Rao</p>
                <p className="truncate text-xs text-muted-foreground">Internal Medicine</p>
              </div>
              <ChevronsUpDown className="size-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Viewing as</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {VIEWERS.map((v) => (
                <DropdownMenuItem key={v.name}>
                  <div className="flex flex-col">
                    <span className="text-sm">{v.name}</span>
                    <span className="text-xs text-muted-foreground">{v.role}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/70 lg:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <BRAND.icon className="size-5 text-primary" />
            <span className="text-sm font-semibold">{BRAND.name}</span>
          </div>
          <div className="hidden text-xs text-muted-foreground lg:block">
            MedX is a decision-support UI. Clinical values shown are backend-provided; final approval is always human-owned.
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground sm:inline">St. Mary&apos;s General — North Campus</span>
          </div>
        </header>
        <main className="flex-1 px-4 py-5 lg:px-6 lg:py-6">{children}</main>
      </div>
    </div>
  );
}
