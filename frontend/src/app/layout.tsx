import type { Metadata } from "next";
import "./globals.css";
import { AppQueryProvider } from "@/components/providers/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/nav/app-shell";

export const metadata: Metadata = {
  title: "MedX — Clinical Safety & Federation Console",
  description: "Prescription safety review, pharmacy queue, and federation monitoring for MedX.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">
        <AppQueryProvider>
          <TooltipProvider>
            <AppShell>{children}</AppShell>
          </TooltipProvider>
        </AppQueryProvider>
      </body>
    </html>
  );
}
