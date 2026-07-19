"use client";

/**
 * DIMENSION FIELD — a length input with a ft / in / mm / m unit selector (spec §18).
 *
 * The cabin stores decimal FEET, so this component stores/emits FEET too (onCommitFt), but lets the
 * admin enter and read the value in whichever unit suits the drawing. Conversion happens only at the
 * edge; the canonical value the rest of the app sees never changes. Used for the NEW dimensional
 * inputs (e.g. roof rise) — the existing feet-based cabin UI is left untouched.
 */
import { useEffect, useMemo, useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type LenUnit = "ft" | "in" | "mm" | "m";

/** feet → one unit. */
const FROM_FT: Record<LenUnit, number> = { ft: 1, in: 12, mm: 304.8, m: 0.3048 };
const UNIT_STEP: Record<LenUnit, number> = { ft: 0.05, in: 0.5, mm: 5, m: 0.02 };
const UNIT_DP: Record<LenUnit, number> = { ft: 3, in: 2, mm: 0, m: 3 };

const toUnit = (ft: number, u: LenUnit) => ft * FROM_FT[u];
const toFt = (v: number, u: LenUnit) => v / FROM_FT[u];
const fmt = (n: number, dp: number) => {
  const f = Math.pow(10, dp);
  return String(Math.round((n + Number.EPSILON) * f) / f);
};

export interface DimFieldProps {
  /** The value, in FEET (the cabin's canonical unit). */
  valueFt: number;
  /** Called with the new value in FEET, on blur / Enter. */
  onCommitFt: (ft: number) => void;
  /** Minimum, in FEET. Defaults to 0. */
  minFt?: number;
  className?: string;
  ariaLabel?: string;
}

export function DimField({ valueFt, onCommitFt, minFt = 0, className, ariaLabel }: DimFieldProps) {
  const [unit, setUnit] = useState<LenUnit>("ft");
  const shown = useMemo(() => fmt(toUnit(valueFt, unit), UNIT_DP[unit]), [valueFt, unit]);
  const [text, setText] = useState(shown);

  // Re-sync the buffer when the external value or the display unit changes (and we're not mid-edit).
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setText(shown);
  }, [shown, editing]);

  const commit = () => {
    setEditing(false);
    const n = Number(text);
    if (text.trim() === "" || !isFinite(n)) {
      setText(shown);
      return;
    }
    const ft = Math.max(minFt, toFt(n, unit));
    onCommitFt(ft);
  };

  return (
    <div className="flex items-stretch gap-1">
      <input
        type="number"
        inputMode="decimal"
        step={UNIT_STEP[unit]}
        min={toUnit(minFt, unit)}
        value={text}
        aria-label={ariaLabel}
        onFocus={() => setEditing(true)}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className={cn(
          "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary",
          className,
        )}
      />
      <Select value={unit} onValueChange={(u) => setUnit(u as LenUnit)}>
        <SelectTrigger className="h-9 w-[64px] shrink-0 text-xs" aria-label="Unit">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(["ft", "in", "mm", "m"] as LenUnit[]).map((u) => (
            <SelectItem key={u} value={u} className="text-xs">
              {u}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
