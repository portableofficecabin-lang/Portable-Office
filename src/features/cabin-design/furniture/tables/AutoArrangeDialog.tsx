"use client";

/**
 * Table module — AUTO ARRANGE (spec §16).
 *
 * The interesting half of this dialog is the FAILURE path. "It doesn't fit" is a useless answer;
 * the customer cannot act on it. So when `autoArrange()` reports `fits: false` it also reports the
 * cabin length and width the layout WOULD have needed, what is actually available, and the two ways
 * out — a smaller standard size, or fewer tables. Both are offered as one-click buttons that re-run
 * the preview, because the customer's next move is always one of those two.
 *
 * Nothing is applied until Apply. `autoArrange()` returns an EMPTY table list when it does not fit
 * (never a half-placed layout), so Preview can never leave the design in a state the customer has
 * to clean up.
 */

import { LayoutGrid, TriangleAlert } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CabinConfig } from "@/components/home/cabin-calculator/pricing";

import { IntStepper, SelectField, UnitField } from "./tableFields";
import { autoArrange, type AutoArrangeResult } from "./tableAutoArrange";
import type { CabinTable, ClearanceRules } from "./tableSchema";
import {
  ARRANGEMENT_PATTERNS,
  CUSTOM_PRESET_ID,
  findTableType,
  TABLE_TYPE_GROUPS,
  TABLE_TYPES,
  type ArrangementPattern,
} from "./tableTypes";
import { formatMm, type TableUnit } from "./tableUnits";

export interface AutoArrangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: CabinConfig;
  tables: CabinTable[];
  clearances: ClearanceRules;
  unit: TableUnit;
  onApply: (next: CabinTable[], label: string) => void;
  onSelect: (id: string | null) => void;
}

export function AutoArrangeDialog({
  open,
  onOpenChange,
  config,
  tables,
  clearances,
  unit,
  onApply,
  onSelect,
}: AutoArrangeDialogProps) {
  const [count, setCount] = React.useState(4);
  const [typeId, setTypeId] = React.useState("workstation");
  const [presetId, setPresetId] = React.useState<string>(CUSTOM_PRESET_ID);
  const [seats, setSeats] = React.useState(0);
  const [passageMm, setPassageMm] = React.useState(clearances.walkingPassageMm);
  const [pattern, setPattern] = React.useState<ArrangementPattern>("single-row");
  const [result, setResult] = React.useState<AutoArrangeResult | null>(null);

  const def = findTableType(typeId);

  /* A preset from the PREVIOUS type is meaningless — reset to the new type's first standard size. */
  React.useEffect(() => {
    setPresetId(def.presets[0]?.id ?? CUSTOM_PRESET_ID);
    setResult(null);
  }, [def]);

  const run = React.useCallback(
    (overrides: { count?: number; presetId?: string } = {}): AutoArrangeResult => {
      const r = autoArrange({
        count: overrides.count ?? count,
        tableTypeId: typeId,
        presetId: overrides.presetId ?? presetId,
        seatingCapacity: seats > 0 ? seats : undefined,
        minPassageMm: passageMm,
        pattern,
        /* The live list, not `config.tables` — auto-arrange must avoid the tables that are on
         * screen right now, including ones added since the parent last synced. */
        config: { ...config, tables },
        clearances,
        existing: tables,
      });
      setResult(r);
      return r;
    },
    [count, typeId, presetId, seats, passageMm, pattern, config, tables, clearances],
  );

  const apply = () => {
    if (!result?.fits || !result.tables.length) return;
    onApply(
      [...tables, ...result.tables],
      `Auto-arrange ${result.tables.length} × ${def.label}`,
    );
    onSelect(result.tables[0]?.id ?? null);
    onOpenChange(false);
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg gap-3 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <LayoutGrid className="h-4 w-4" />
            Auto arrange
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Lay out several tables at once. Existing tables are never moved — they are worked around.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] pr-3">
          <div className="grid grid-cols-2 gap-2.5">
            <IntStepper
              label="Number of tables"
              value={count}
              onCommit={(v) => {
                setCount(v);
                setResult(null);
              }}
              min={1}
              max={30}
            />

            <div className="flex flex-col gap-1">
              <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                Table type
              </span>
              <select
                value={typeId}
                onChange={(e) => setTypeId(e.target.value)}
                aria-label="Table type"
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-[12px] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {TABLE_TYPE_GROUPS.map((group) => (
                  <optgroup key={group} label={group}>
                    {TABLE_TYPES.filter((x) => x.isActive && x.group === group).map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <SelectField
              label="Standard size"
              value={presetId}
              onValueChange={(v) => {
                setPresetId(v);
                setResult(null);
              }}
              options={[
                ...def.presets.map((p) => ({ value: p.id, label: p.label })),
                { value: CUSTOM_PRESET_ID, label: "Type default" },
              ]}
            />

            <SelectField
              label="Arrangement"
              value={pattern}
              onValueChange={(v) => {
                setPattern(v as ArrangementPattern);
                setResult(null);
              }}
              options={ARRANGEMENT_PATTERNS.map((p) => ({ value: p.id, label: p.label }))}
              hint={ARRANGEMENT_PATTERNS.find((p) => p.id === pattern)?.note}
            />

            <IntStepper
              label="Seats per table (0 = auto)"
              value={seats}
              onCommit={(v) => {
                setSeats(v);
                setResult(null);
              }}
              min={0}
              max={30}
            />

            <UnitField
              label="Minimum passage"
              mm={passageMm}
              onCommit={(mm) => {
                setPassageMm(mm);
                setResult(null);
              }}
              unit={unit}
              minMm={600}
              maxMm={3000}
              hint={`Never below ${formatMm(clearances.walkingPassageMm, unit)}.`}
            />
          </div>

          {/* ---------------- the answer ---------------- */}
          {result ? (
            result.fits ? (
              <div className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
                <span className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-400">
                  {result.tables.length} table{result.tables.length === 1 ? "" : "s"} fit.
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">{result.message}</span>
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2">
                <span className="flex items-center gap-1.5">
                  <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-destructive" />
                  <span className="text-[12px] font-semibold text-destructive">Does not fit</span>
                </span>
                <span className="text-[11px] text-muted-foreground">{result.message}</span>

                {result.requiredLengthMm != null || result.requiredWidthMm != null ? (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-destructive/20 pt-1.5">
                    {result.requiredLengthMm != null ? (
                      <span className="text-[10px] text-muted-foreground">
                        Needs length{" "}
                        <span className="font-semibold text-foreground">
                          {formatMm(result.requiredLengthMm, unit)}
                        </span>
                        {result.availableLengthMm != null
                          ? ` · have ${formatMm(result.availableLengthMm, unit)}`
                          : ""}
                      </span>
                    ) : null}
                    {result.requiredWidthMm != null ? (
                      <span className="text-[10px] text-muted-foreground">
                        Needs width{" "}
                        <span className="font-semibold text-foreground">
                          {formatMm(result.requiredWidthMm, unit)}
                        </span>
                        {result.availableWidthMm != null
                          ? ` · have ${formatMm(result.availableWidthMm, unit)}`
                          : ""}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {/* The two ways out — the customer's next move is always one of these. */}
                {result.suggestedPresetId || result.suggestedCount ? (
                  <div className="flex flex-wrap gap-1.5 border-t border-destructive/20 pt-1.5">
                    {result.suggestedPresetId ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px]"
                        onClick={() => {
                          const p = result.suggestedPresetId as string;
                          setPresetId(p);
                          run({ presetId: p });
                        }}
                      >
                        Use{" "}
                        {def.presets.find((p) => p.id === result.suggestedPresetId)?.label ??
                          "a smaller size"}
                      </Button>
                    ) : null}
                    {result.suggestedCount ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px]"
                        onClick={() => {
                          const c = result.suggestedCount as number;
                          setCount(c);
                          run({ count: c });
                        }}
                      >
                        Reduce to {result.suggestedCount}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          ) : null}
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => run()}>
            Preview
          </Button>
          <Button type="button" size="sm" disabled={!result?.fits} onClick={apply}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
