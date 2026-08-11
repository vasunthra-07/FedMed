"use client";

import * as React from "react";
import { Check, ListFilter } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatEnumLabel } from "@/lib/format";

interface Option {
  label: string;
  value: string;
}

export function FacetedFilter({
  title,
  options,
  selected,
  onChange,
  formatLabel = true,
}: {
  title: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
  formatLabel?: boolean;
}) {
  const selectedSet = new Set(selected);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <ListFilter className="size-3.5" />
          {title}
          {selected.length > 0 && (
            <>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                {selected.length}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1.5">
        <div className="flex flex-col gap-0.5">
          {options.map((opt) => {
            const isSelected = selectedSet.has(opt.value);
            return (
              <button
                type="button"
                key={opt.value}
                onClick={() => {
                  const next = new Set(selectedSet);
                  if (isSelected) next.delete(opt.value);
                  else next.add(opt.value);
                  onChange(Array.from(next));
                }}
                className={cn(
                  "flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                    isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input"
                  )}
                >
                  {isSelected && <Check className="size-3" />}
                </span>
                <span className="truncate">{formatLabel ? formatEnumLabel(opt.label) : opt.label}</span>
              </button>
            );
          })}
        </div>
        {selected.length > 0 && (
          <>
            <Separator className="my-1.5" />
            <Button variant="ghost" size="sm" className="w-full justify-center text-xs" onClick={() => onChange([])}>
              Clear filters
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
