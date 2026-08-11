"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Clock } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useAgentTrace } from "@/lib/hooks/use-safety";
import { formatDateTime, formatEnumLabel } from "@/lib/format";

export default function AgentTraceViewerPage({ params }: { params: Promise<{ prescriptionId: string }> }) {
  const { prescriptionId } = use(params);
  const { data: trace, isLoading } = useAgentTrace(prescriptionId);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <PageHeader
        title="Agent trace"
        description="Step-by-step record of the automated safety analysis pipeline — for transparency and traceability, not action."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/prescriptions/${prescriptionId}/review`}>
              <ArrowLeft className="size-4" /> Back to review
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : !trace ? (
        <EmptyState icon={Bot} title="No agent trace available" />
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>Trace {trace.id}</CardTitle>
                  <CardDescription className="mt-1">
                    {trace.steps.length} step{trace.steps.length !== 1 ? "s" : ""} · started {formatDateTime(trace.startedAt)}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Final decision</span>
                  <StatusBadge status={trace.finalDecision} />
                </div>
              </div>
            </CardHeader>
          </Card>

          <Accordion type="multiple" defaultValue={trace.steps.map((s) => s.id)} className="rounded-lg border bg-card px-4">
            {trace.steps.map((step, i) => (
              <AccordionItem key={step.id} value={step.id}>
                <AccordionTrigger>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="min-w-0 text-left">
                      <p className="truncate text-sm font-medium">{step.agentName}</p>
                      <p className="truncate text-xs text-muted-foreground">{formatEnumLabel(step.action)}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="ml-9 flex flex-col gap-2 text-sm">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Input</p>
                      <p className="text-muted-foreground">{step.input}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Output</p>
                      <p>{step.output}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" /> {formatDateTime(step.timestamp)}
                      </span>
                      {typeof step.durationMs === "number" && <span>{step.durationMs} ms</span>}
                      {typeof step.confidence === "number" && (
                        <Badge variant="outline" className="font-normal">
                          Confidence {Math.round(step.confidence * 100)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </>
      )}
    </div>
  );
}
