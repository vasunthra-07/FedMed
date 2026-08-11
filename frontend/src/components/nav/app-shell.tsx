"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND, NAV_SECTIONS, type NavItem } from "@/components/nav/nav-config";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";

const VIEWERS = [
  { name: "Dr. Anita Rao", role: "Doctor · Internal Medicine" },
  { name: "James Whitfield", role: "Pharmacist" },
  { name: "Hospital Admin", role: "Hospital Administrator" },
];

// The public landing page ("/") and the mock login screen ("/login") are
// full-bleed pages with no app chrome — nothing has been "entered" yet, so
// the sidebar/nav don't apply there.
const CHROMELESS_ROUTES = new Set(["/", "/login"]);

function isItemActive(pathname: string, item: NavItem) {
  return pathname === item.href || pathname.startsWith(item.match ?? "__none__");
}

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
        collapsed && "justify-center px-0 py-2",
        active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {active && !collapsed && <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary" aria-hidden />}
      {active && collapsed && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" aria-hidden />}
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

function NavSections({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3">
      {NAV_SECTIONS.map((section) => (
        <div key={section.id} className="mb-4">
          {!collapsed && (
            <p className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {section.label}
            </p>
          )}
          <div className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isItemActive(pathname, item)}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function UserBlock({ collapsed }: { collapsed: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex w-full items-center gap-2 rounded-md p-1.5 text-left hover:bg-accent",
          collapsed && "justify-center"
        )}
      >
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary">AR</AvatarFallback>
        </Avatar>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">Dr. Anita Rao</p>
              <p className="truncate text-xs text-muted-foreground">Internal Medicine</p>
            </div>
          </>
        )}
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
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // In-memory only: the App Router keeps this layout mounted across
  // client-side navigation, so the collapsed state survives moving between
  // pages without needing localStorage (and the hydration risk that comes
  // with reading it before mount).
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  if (CHROMELESS_ROUTES.has(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop rail — collapsible */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-card transition-[width] duration-200 lg:flex",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        <div className="relative flex h-14 items-center border-b px-4">
          <Link href="/doctor/dashboard" className={cn("flex min-w-0 items-center gap-2", collapsed && "justify-center")}>
            <BRAND.icon className="size-5 shrink-0 text-primary" />
            {!collapsed && <span className="truncate text-sm font-semibold tracking-tight">{BRAND.name}</span>}
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            className="absolute top-1/2 -right-3 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground"
          >
            {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
          </button>
        </div>

        <NavSections pathname={pathname} collapsed={collapsed} />

        <div className="border-t p-3">
          <UserBlock collapsed={collapsed} />
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/70 lg:px-6">
          <div className="flex items-center gap-2">
            {/* Mobile / tablet: hamburger opens the slide-out drawer */}
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="flex h-14 items-center border-b px-4">
                  <BRAND.icon className="size-5 text-primary" />
                  <span className="ml-2 text-sm font-semibold tracking-tight">{BRAND.name}</span>
                </div>
                <NavSections pathname={pathname} collapsed={false} onNavigate={() => setMobileNavOpen(false)} />
                <div className="border-t p-3">
                  <UserBlock collapsed={false} />
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2 lg:hidden">
              <BRAND.icon className="size-5 text-primary" />
              <span className="text-sm font-semibold">{BRAND.name}</span>
            </div>
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
