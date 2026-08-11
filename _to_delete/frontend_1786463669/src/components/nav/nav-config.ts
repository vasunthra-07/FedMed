import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  FileClock,
  FilePlus2,
  Network,
  PackageCheck,
  ShieldAlert,
  Stethoscope,
  Users,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  match?: string;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: "doctor",
    label: "Doctor",
    items: [
      { label: "Dashboard", href: "/doctor/dashboard", icon: Activity },
      { label: "Patients", href: "/doctor/patients", icon: Users, match: "/doctor/patients" },
      { label: "New prescription", href: "/doctor/prescriptions/new", icon: FilePlus2 },
      { label: "Safety alerts", href: "/doctor/alerts", icon: AlertTriangle },
    ],
  },
  {
    id: "pharmacist",
    label: "Pharmacist",
    items: [
      { label: "Review queue", href: "/pharmacist/queue", icon: ClipboardList, match: "/pharmacist/queue" },
      { label: "Interventions", href: "/pharmacist/interventions", icon: ShieldAlert },
      { label: "Near misses", href: "/pharmacist/near-misses", icon: PackageCheck },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    items: [
      { label: "Federation", href: "/admin/federation", icon: Network },
      { label: "Audit trail", href: "/admin/audit", icon: FileClock },
    ],
  },
];

export const BRAND = {
  name: "MedX",
  icon: Stethoscope,
};
