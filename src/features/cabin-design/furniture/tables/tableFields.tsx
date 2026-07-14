"use client";

/**
 * Table module — the INPUT PRIMITIVES every table panel is built from (spec §4, §29).
 *
 * Three problems are solved here once, so that seven panels do not solve them seven ways:
 *
 *  1. THE CLAMP FIGHT. Every edit is routed through `clampTable()`, which snaps a value into its
 *     buildable range. If an input mirrored the model on every keystroke, typing the "1" of "1500"
 *     into a length field would commit 1 → clamp to 300 → and the field would rewrite itself to
 *     "300" underneath the cursor. So a field keeps its own TEXT while it is focused and only
 *     re-syncs from the model when it is not. The model is the truth; the keyboard is the truth
 *     while you are typing.
 *
 *  2. THE UNDO STORM (spec §29). Committing on every keystroke would push one history entry per
 *     character. Instead each keystroke is debounced (the model still updates live, so the plan
 *     redraws as you type) and the caller passes a `mergeKey`, which makes useTableHistory coalesce
 *     the whole burst into ONE undo entry. `onSeal()` on blur closes the gesture.
 *
 *  3. UNIT ENTRY (spec §4). mm is canonical; the customer types in whatever unit they chose.
 *     `UnitField` converts at the input edge ONLY — nothing downstream of it ever sees a foot.
 *     "ft-in" is the odd one out: it needs two boxes, because nobody types 5.906 feet.
 *
 * This module exports COMPONENTS ONLY — react-refresh requires a .tsx module to export components,
 * and the debounce lives inside the fields rather than in an exported hook for exactly that reason.
 */

import { Minus, Plus } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import {
  fromDisplay,
  fromFeetInches,
  toDisplay,
  toFeetInches,
  unitStep,
  unitSuffix,
  type TableUnit,
} from "./tableUnits";

/** Long enough that a burst of typing is one commit; short enough that the plan feels live. */
const COMMIT_DEBOUNCE_MS = 220;

/* ==========================================================================
 * NumField — a debounced numeric input
 * ========================================================================== */

export interface NumFieldProps {
  label?: string;
  value: number;
  onCommit: (v: number) => void;
  /** Close the undo gesture. Called on blur, never on keystroke. */
  onSeal?: () => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  /** 0 commits immediately — right for a stepper, wrong for a keyboard. */
  debounceMs?: number;
  "aria-label"?: string;
}

export function NumField({
  label,
  value,
  onCommit,
  onSeal,
  step,
  min,
  max,
  suffix,
  hint,
  disabled,
  className,
  inputClassName,
  debounceMs = COMMIT_DEBOUNCE_MS,
  ...rest
}: NumFieldProps) {
  const [text, setText] = React.useState<string>(() => String(value));
  const focused = React.useRef(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Re-sync from the model only while the user is NOT typing — see the header (the clamp fight). */
  React.useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const commit = (raw: string) => {
    const n = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(n)) return;
    onCommit(n);
  };

  const handleChange = (raw: string) => {
    setText(raw);
    if (timer.current) clearTimeout(timer.current);
    if (debounceMs <= 0) {
      commit(raw);
      return;
    }
    timer.current = setTimeout(() => commit(raw), debounceMs);
  };

  const handleBlur = () => {
    focused.current = false;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    commit(text);
    /* Snap back to the model. When the commit CHANGED the model the effect above re-runs and wins;
     * when the model clamped straight back to what it already was (no re-render), this is the line
     * that clears a half-typed "1" out of the box. */
    setText(String(value));
    onSeal?.();
  };

  const n = Number(text);
  const outOfRange =
    text.trim() !== "" &&
    Number.isFinite(n) &&
    ((min != null && n < min) || (max != null && n > max));

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label ? (
        <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      ) : null}
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          value={text}
          step={step}
          disabled={disabled}
          onFocus={() => {
            focused.current = true;
          }}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className={cn(
            "h-8 pr-9 text-[12px]",
            outOfRange && "border-destructive focus-visible:ring-destructive",
            inputClassName,
          )}
          {...rest}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
      {outOfRange ? (
        <span className="text-[10px] font-medium text-destructive">
          {min != null && max != null
            ? `Must be ${min} – ${max}${suffix ? ` ${suffix}` : ""}`
            : min != null
              ? `Minimum ${min}${suffix ? ` ${suffix}` : ""}`
              : `Maximum ${max}${suffix ? ` ${suffix}` : ""}`}
        </span>
      ) : hint ? (
        <span className="text-[10px] text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  );
}

/* ==========================================================================
 * UnitField — a length, typed in the customer's unit, stored in mm
 * ========================================================================== */

export interface UnitFieldProps {
  label: string;
  /** The canonical value. Always mm. */
  mm: number;
  onCommit: (mm: number) => void;
  onSeal?: () => void;
  unit: TableUnit;
  minMm?: number;
  maxMm?: number;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

export function UnitField({
  label,
  mm,
  onCommit,
  onSeal,
  unit,
  minMm,
  maxMm,
  hint,
  disabled,
  className,
}: UnitFieldProps) {
  /* Feet & inches is the one unit a single box cannot express: 5.906 ft is a number nobody types.
   * Two boxes, one commit — the pair always writes a whole mm value back. */
  if (unit === "ftin") {
    const { ft, inch } = toFeetInches(mm);
    return (
      <div className={cn("flex flex-col gap-1", className)}>
        <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
        <div className="flex gap-1.5">
          <NumField
            value={ft}
            onCommit={(v) => onCommit(fromFeetInches(v, inch))}
            onSeal={onSeal}
            step={1}
            suffix="ft"
            disabled={disabled}
            className="flex-1"
            aria-label={`${label} — feet`}
          />
          <NumField
            value={inch}
            onCommit={(v) => onCommit(fromFeetInches(ft, v))}
            onSeal={onSeal}
            step={1}
            min={0}
            max={11}
            suffix="in"
            disabled={disabled}
            className="flex-1"
            aria-label={`${label} — inches`}
          />
        </div>
        {hint ? <span className="text-[10px] text-muted-foreground">{hint}</span> : null}
      </div>
    );
  }

  return (
    <NumField
      label={label}
      value={toDisplay(mm, unit)}
      onCommit={(v) => onCommit(fromDisplay(v, unit))}
      onSeal={onSeal}
      step={unitStep(unit)}
      min={minMm != null ? toDisplay(minMm, unit) : undefined}
      max={maxMm != null ? toDisplay(maxMm, unit) : undefined}
      suffix={unitSuffix(unit)}
      hint={hint}
      disabled={disabled}
      className={className}
      aria-label={label}
    />
  );
}

/* ==========================================================================
 * IntStepper — a counted quantity (sockets, drawers, legs, chairs)
 * ========================================================================== */

export interface IntStepperProps {
  label?: string;
  value: number;
  onCommit: (v: number) => void;
  onSeal?: () => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}

export function IntStepper({
  label,
  value,
  onCommit,
  onSeal,
  min = 0,
  max = 20,
  disabled,
  className,
}: IntStepperProps) {
  const set = (v: number) => {
    const next = Math.min(Math.max(Math.round(v), min), max);
    if (next !== value) onCommit(next);
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label ? (
        <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      ) : null}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={disabled || value <= min}
          onClick={() => {
            set(value - 1);
            onSeal?.();
          }}
          aria-label={label ? `${label} — decrease` : "Decrease"}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        {/* A stepper commits on the click, so it does not debounce — but the box still takes typing. */}
        <NumField
          value={value}
          onCommit={set}
          onSeal={onSeal}
          min={min}
          max={max}
          step={1}
          disabled={disabled}
          className="flex-1"
          inputClassName="pr-2 text-center"
          aria-label={label ?? "Quantity"}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={disabled || value >= max}
          onClick={() => {
            set(value + 1);
            onSeal?.();
          }}
          aria-label={label ? `${label} — increase` : "Increase"}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ==========================================================================
 * SwitchField — a labelled boolean
 * ========================================================================== */

export interface SwitchFieldProps {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

export function SwitchField({
  label,
  checked,
  onCheckedChange,
  hint,
  disabled,
  className,
}: SwitchFieldProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-background px-2.5 py-2",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-medium text-foreground">{label}</span>
        {hint ? <span className="block truncate text-[10px] text-muted-foreground">{hint}</span> : null}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </label>
  );
}

/* ==========================================================================
 * TextField — a free-text attribute (colour, brand, laminate code)
 * ========================================================================== */

export interface TextFieldProps {
  label: string;
  value: string;
  onCommit: (v: string) => void;
  onSeal?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TextField({
  label,
  value,
  onCommit,
  onSeal,
  placeholder,
  disabled,
  className,
}: TextFieldProps) {
  const [text, setText] = React.useState(value);
  const focused = React.useRef(false);

  React.useEffect(() => {
    if (!focused.current) setText(value);
  }, [value]);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <Input
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => {
          focused.current = true;
        }}
        onChange={(e) => {
          setText(e.target.value);
          onCommit(e.target.value);
        }}
        onBlur={() => {
          focused.current = false;
          onSeal?.();
        }}
        className="h-8 text-[12px]"
        aria-label={label}
      />
    </div>
  );
}

/* ==========================================================================
 * SelectField — a labelled enum
 * ========================================================================== */

export interface SelectFieldProps {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
  disabled?: boolean;
  className?: string;
}

export function SelectField({
  label,
  value,
  onValueChange,
  options,
  hint,
  disabled,
  className,
}: SelectFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="h-8 text-[12px]" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-[12px]">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint ? <span className="text-[10px] text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

/* ==========================================================================
 * PanelSection — the heading every editor block shares
 * ========================================================================== */

export interface PanelSectionProps {
  title: string;
  note?: string;
  children: React.ReactNode;
  className?: string;
}

export function PanelSection({ title, note, children, className }: PanelSectionProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-foreground">{title}</span>
        {note ? <span className="text-[10px] text-muted-foreground">{note}</span> : null}
      </div>
      {children}
    </div>
  );
}
