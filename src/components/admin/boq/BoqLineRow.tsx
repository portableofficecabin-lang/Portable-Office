"use client";

/**
 * ONE ROW of the detailed Material BOQ — and the only place in the UI that WRITES a BoqOverride.
 *
 * Every edit here is expressed as a patch against `settings.overrides[line.id]`, never against the
 * take-off: the take-off is re-derived from the drawing on every change and would throw the edit
 * away. That indirection is the whole override design — `id` is a stable, deterministic take-off key
 * (see types.ts TakeoffBase.id), so an admin's ₹-rate edit on the front-wall studs survives the
 * customer resizing the cabin, and lands back on the same studs.
 *
 * LOCK, precisely: BoqOverride.locked alone only chips the row "LOCKED" — it does not freeze
 * anything, because the engine still reads `ov.qty ?? item.qty`. So locking WRITES the current
 * quantity into the override at the moment you lock it. That is what makes a lock a lock.
 *
 * WASTAGE, precisely: `line.wastagePercent` is what the engine CHARGED — the material's own % (or the
 * global override, or this line's) PLUS the norm loss for the kind of work: saw kerf on steel, off-cut
 * on sheet. `BoqOverride.wastagePercent` replaces only the FIRST of those; the engine adds the norm
 * loss back on top regardless. So the editable cell shows `line.wastagePercent − extraWastagePercent`
 * and prints the sum underneath. Bind the cell to the total and an admin who types 8 watches it turn
 * into 11.
 */

import { Lock, RotateCcw, Trash2, Unlock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { round, type BoqLine, type BoqOverride } from "@/lib/boq/types";

import {
  NumField,
  QTY_SOURCE_BADGE,
  RATE_LABEL,
  SECTION_META,
  TD,
  TD_R,
  money,
  num,
  qtyEditOf,
  unitWeightText,
} from "./boqShared";

export interface BoqLineRowProps {
  index: number;
  line: BoqLine;
  override: BoqOverride | undefined;
  /** True when the row came from settings.manualItems rather than from a drawing. */
  isAdded: boolean;
  /** The norm loss the engine adds on top of this line's material wastage (cutting % / sheet %). */
  extraWastagePercent: number;
  onQty: (v: number | null) => void;
  onRate: (v: number | null) => void;
  onWastage: (v: number | null) => void;
  onToggleLock: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  onReset: () => void;
  /** Present only for added rows — removes the ManualBoqItem itself. */
  onDelete?: () => void;
}

export function BoqLineRow({
  index,
  line,
  override,
  isAdded,
  extraWastagePercent,
  onQty,
  onRate,
  onWastage,
  onToggleLock,
  onToggleEnabled,
  onReset,
  onDelete,
}: BoqLineRowProps) {
  const chip = QTY_SOURCE_BADGE[line.qtySource];
  const edit = qtyEditOf(line);
  const locked = override?.locked === true;
  const touched = override != null && Object.keys(override).length > 0;
  const off = !line.enabled;

  /** The overridable half of the wastage — see the file header. */
  const baseWastage = round(Math.max(0, line.wastagePercent - extraWastagePercent), 2);

  /* An unknown material key prices to zero and raises a validation error — flag the row so the admin
   * does not have to cross-reference the Validation tab to find out which one. */
  const unknown = line.material.startsWith("UNKNOWN:");
  const highlight = line.qtySource === "manual" || line.qtySource === "added";

  return (
    <tr
      className={cn(
        off ? "bg-slate-50 text-slate-400" : index % 2 === 1 ? "bg-slate-50/70" : undefined,
        unknown && !off && "bg-red-50",
      )}
    >
      <td
        className={cn(
          TD_R,
          "text-slate-500",
          highlight && "border-l-4 border-l-amber-400",
          locked && !highlight && "border-l-4 border-l-sky-400",
        )}
      >
        {index + 1}
      </td>

      {/* description + provenance */}
      <td className={cn(TD, "min-w-[180px]")}>
        <div className={cn("flex flex-wrap items-center gap-1", off && "line-through")}>
          <span className={cn("font-medium", unknown ? "text-red-700" : "text-slate-900")}>
            {line.description || line.material}
          </span>
          <Badge
            variant="outline"
            title={chip.title}
            className={cn("h-4 rounded px-1 py-0 text-[8.5px] font-bold leading-4", chip.className)}
          >
            {chip.label}
          </Badge>
        </div>
        <div className="text-[9px] leading-tight text-slate-500">{line.material}</div>
        {line.remarks.length > 0 && (
          <div className="mt-0.5 text-[9px] leading-tight text-amber-700">{line.remarks.join(" · ")}</div>
        )}
      </td>

      <td className={cn(TD, "text-[9.5px] text-slate-600")}>{line.spec || "—"}</td>

      <td className={cn(TD, "min-w-[160px] text-[9px] leading-tight text-slate-500")} title={line.formula}>
        {line.formula}
      </td>

      {/* QTY — the override quantity, not the billed one (see boqShared.qtyEditOf) */}
      <td className={cn(TD, "w-[92px]")}>
        <div className="flex items-center gap-1">
          <NumField
            value={edit.value}
            onCommit={(v) => onQty(v)}
            allowEmpty
            step={0.001}
            min={0}
            className="text-[10.5px]"
            ariaLabel={`Quantity — ${line.description}`}
            title={`Overrides the take-off quantity (${edit.unit}). Clear the field to return to AUTO.`}
          />
          <span className="shrink-0 text-[9px] text-slate-400">{edit.unit}</span>
        </div>
        {edit.hint ? <div className="mt-0.5 text-[8.5px] leading-tight text-slate-400">{edit.hint}</div> : null}
      </td>

      <td className={cn(TD, "text-center text-[9.5px] text-slate-600")}>
        <div className="font-medium tabular-nums text-slate-800">{num(line.qty, 3)}</div>
        <div className="text-[9px] text-slate-400">{line.uom}</div>
      </td>

      <td className={cn(TD_R, "whitespace-nowrap text-[9.5px] text-slate-600")}>{unitWeightText(line)}</td>

      <td className={cn(TD_R, "font-medium")}>{num(line.totalWeightKg)}</td>

      {/* RATE */}
      <td className={cn(TD, "w-[96px]")}>
        <NumField
          value={line.rate}
          onCommit={(v) => onRate(v)}
          allowEmpty
          step={0.01}
          min={0}
          className="text-[10.5px]"
          ariaLabel={`Rate — ${line.description}`}
          title="Per-quotation rate override. Clear the field to fall back to the Material Master rate."
        />
        <div className="mt-0.5 text-right text-[8.5px] text-slate-400">{RATE_LABEL[line.rateUnit]}</div>
      </td>

      {/* WASTAGE — the material component; the norm loss is added by the engine on top */}
      <td className={cn(TD, "w-[76px]")}>
        <NumField
          value={baseWastage}
          onCommit={(v) => onWastage(v)}
          allowEmpty
          step={0.5}
          min={0}
          className="text-[10.5px]"
          ariaLabel={`Wastage % — ${line.description}`}
          title="Material wastage %. Clear the field to fall back to the Material Master's own %."
        />
        {extraWastagePercent > 0 ? (
          <div className="mt-0.5 text-right text-[8.5px] leading-tight text-slate-400">
            + {num(extraWastagePercent, 1)}% norm = {num(line.wastagePercent, 1)}%
          </div>
        ) : null}
      </td>

      <td className={cn(TD_R, "font-semibold", off ? "text-slate-400" : "text-slate-900")}>
        {money(line.amount)}
      </td>

      <td className={cn(TD, "text-[9px] leading-tight text-slate-500")}>
        <div>{line.drawingRef || SECTION_META[line.section].drawing}</div>
        <div className="text-slate-400">{SECTION_META[line.section].label}</div>
      </td>

      {/* actions */}
      <td className={cn(TD, "whitespace-nowrap")}>
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={onToggleLock}
            title={
              locked
                ? "Unlock — the quantity follows the drawing again"
                : "Lock the quantity at its current value — a design change will not overwrite it"
            }
            aria-label={locked ? "Unlock quantity" : "Lock quantity"}
            className={cn(
              "rounded border p-1 transition-colors",
              locked
                ? "border-sky-400 bg-sky-100 text-sky-700 hover:bg-sky-200"
                : "border-slate-300 bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600",
            )}
          >
            {locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
          </button>

          <Switch
            checked={line.enabled}
            onCheckedChange={onToggleEnabled}
            aria-label={line.enabled ? "Exclude line from totals" : "Include line in totals"}
            title={line.enabled ? "Exclude this line from all totals" : "Include this line in the totals"}
            className="scale-75"
          />

          <button
            type="button"
            onClick={onReset}
            disabled={!touched}
            title={touched ? "Reset this row to AUTO — discards qty / rate / wastage overrides" : "Row is already AUTO"}
            aria-label="Reset row to auto"
            className={cn(
              "rounded border p-1 transition-colors",
              touched
                ? "border-slate-300 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300",
            )}
          >
            <RotateCcw className="h-3 w-3" />
          </button>

          {isAdded && onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              title="Delete this manually added row"
              aria-label="Delete manual row"
              className="rounded border border-red-200 bg-white p-1 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

export default BoqLineRow;
