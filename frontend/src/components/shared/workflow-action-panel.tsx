"use client";

import * as React from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export interface WorkflowAction {
  key: string;
  label: string;
  description?: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  icon?: React.ElementType;
  requiresNote?: boolean;
  noteLabel?: string;
  notePlaceholder?: string;
  noteRequired?: boolean;
}

export function WorkflowActionPanel({
  title = "Available actions",
  description,
  actions,
  onAction,
  pending,
  className,
}: {
  title?: string;
  description?: string;
  actions: WorkflowAction[];
  onAction: (key: string, note?: string) => void;
  pending?: boolean;
  className?: string;
}) {
  const [activeAction, setActiveAction] = React.useState<WorkflowAction | null>(null);
  const [note, setNote] = React.useState("");

  if (actions.length === 0) {
    return (
      <div className={cn("rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground", className)}>
        No actions are available for the current workflow state.
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      <div className="mt-3 flex flex-col gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.key}
              variant={action.variant ?? "outline"}
              className="w-full justify-start gap-2"
              disabled={pending}
              onClick={() => {
                if (action.requiresNote) {
                  setNote("");
                  setActiveAction(action);
                } else {
                  onAction(action.key);
                }
              }}
            >
              {Icon && <Icon className="size-4" />}
              <span className="flex flex-col items-start text-left">
                <span>{action.label}</span>
                {action.description && (
                  <span className="text-xs font-normal opacity-80">{action.description}</span>
                )}
              </span>
            </Button>
          );
        })}
      </div>

      <Dialog open={!!activeAction} onOpenChange={(open) => !open && setActiveAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeAction?.label}</DialogTitle>
            <DialogDescription>{activeAction?.description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="action-note">{activeAction?.noteLabel ?? "Note"}</Label>
            <Textarea
              id="action-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={activeAction?.notePlaceholder}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveAction(null)}>
              Cancel
            </Button>
            <Button
              variant={activeAction?.variant ?? "default"}
              disabled={activeAction?.noteRequired && note.trim().length === 0}
              onClick={() => {
                if (activeAction) {
                  onAction(activeAction.key, note.trim() || undefined);
                  setActiveAction(null);
                }
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
