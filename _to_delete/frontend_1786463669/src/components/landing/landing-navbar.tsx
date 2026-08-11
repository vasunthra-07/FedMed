"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const NAV_LINKS = [
  { label: "Overview", href: "#overview" },
  { label: "Workflow", href: "#workflow" },
  { label: "Roles", href: "#roles" },
  { label: "Trust", href: "#trust" },
];

const NAV_LINK_CLASS =
  "rounded-sm text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none";

export function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 h-[72px] border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-8">
          <a href="#overview" className="flex items-center gap-2 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">
            <ShieldCheck className="size-5 text-primary" />
            <span className="text-sm font-semibold tracking-tight text-foreground">MedX</span>
          </a>
          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className={NAV_LINK_CLASS}>
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <a href="#proof" className={`hidden sm:inline ${NAV_LINK_CLASS}`}>
            See demo
          </a>
          <Button asChild size="sm">
            <Link href="/login">Sign in</Link>
          </Button>

          {/* Mobile nav */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-4.5 text-primary" /> MedX
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-5">
                {NAV_LINKS.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <a href={link.href} className="rounded-md px-2 py-2.5 text-sm font-medium text-foreground hover:bg-accent">
                      {link.label}
                    </a>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <a href="#proof" className="rounded-md px-2 py-2.5 text-sm font-medium text-foreground hover:bg-accent">
                    See demo
                  </a>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
