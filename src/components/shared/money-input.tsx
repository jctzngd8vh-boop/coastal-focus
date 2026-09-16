"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Displays/edits a dollar amount but always reports whole integer cents up the chain. */
export function MoneyInput({
  cents,
  onChangeCents,
  className,
  onBlur,
  ...props
}: {
  cents: number;
  onChangeCents: (cents: number) => void;
} & Omit<React.ComponentProps<"input">, "value" | "onChange" | "type">) {
  const [text, setText] = React.useState((cents / 100).toFixed(2));
  const [syncedCents, setSyncedCents] = React.useState(cents);

  // Adjust local text when the `cents` prop changes from outside (not from
  // this input's own onBlur commit) — done during render, per React's
  // guidance for syncing state to a changed prop, rather than in an effect.
  if (cents !== syncedCents) {
    setSyncedCents(cents);
    setText((cents / 100).toFixed(2));
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
      <Input
        inputMode="decimal"
        className={cn("pl-6", className)}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => {
          const parsed = Math.round(parseFloat(text || "0") * 100);
          const safe = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
          onChangeCents(safe);
          setText((safe / 100).toFixed(2));
          onBlur?.(e);
        }}
        {...props}
      />
    </div>
  );
}
