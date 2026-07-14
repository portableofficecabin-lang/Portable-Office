"use client";

/**
 * ELEVATION-WISE BREAKUP — one collapsible card per BOQ section (spec §5).
 *
 * This is not a second calculation. `SectionSummary` comes straight off the engine, which alone knows
 * the enabled / disabled / override rules — a card that re-summed its own lines would be a second,
 * quietly divergent engine. The card renders the summary and lists the lines that produced it.
 *
 * The DRAWING NAME is printed in the header on purpose: it is the answer to "where did this 412 kg
 * come from?", and the reason the take-off carries a drawingRef on every single item.
 */

import { ChevronDown } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { BoqLine, SectionSummary } from "@/lib/boq/types";

import { TD, TD_R, TH, money, num } from "./boqShared";

export interface SectionCardProps {
  summary: SectionSummary;
  lines: BoqLine[];
  defaultOpen?: boolean;
  /** Section switched off wholesale in Settings → disabledSections. */
  sectionDisabled: boolean;
}

export function SectionCard({ summary, lines, defaultOpen = false, sectionDisabled }: SectionCardProps) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className={cn(
        "rounded-xl border bg-white",
        sectionDisabled ? "border-slate-200 opacity-70" : "border-slate-300",
      )}
    >
      <CollapsibleTrigger className="group flex w-full items-center gap-3 px-3 py-2 text-left">
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-data-[state=open]:rotate-180" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-[12px] font-bold text-slate-900">{summary.label}</span>
            {sectionDisabled && (
              <span className="rounded bg-slate-200 px-1 text-[8.5px] font-bold uppercase text-slate-600">
                section off
              </span>
            )}
          </div>
          <div className="truncate text-[9.5px] text-slate-500">
            From: {summary.drawing} · {summary.lines} line{summary.lines === 1 ? "" : "s"}
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-3 text-right">
          <div>
            <div className="text-[8.5px] uppercase tracking-wide text-slate-400">Steel</div>
            <div className="text-[11px] font-semibold tabular-nums text-slate-700">{num(summary.steelKg)} kg</div>
          </div>
          <div>
            <div className="text-[8.5px] uppercase tracking-wide text-slate-400">Total wt</div>
            <div className="text-[11px] font-semibold tabular-nums text-slate-700">{num(summary.totalKg)} kg</div>
          </div>
          <div>
            <div className="text-[8.5px] uppercase tracking-wide text-slate-400">Cost</div>
            <div className="text-[11px] font-extrabold tabular-nums text-amber-800">
              {money(summary.materialAmount)}
            </div>
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="overflow-x-auto border-t border-slate-200 p-3">
          <table className="w-full min-w-[760px] border-collapse text-[10.5px]">
            <thead>
              <tr className="bg-slate-100 text-left text-slate-700">
                {["Material description", "Size & specification", "Calculation formula", "Qty", "Unit", "Weight (kg)", "Amount", "Drawing"].map(
                  (h) => (
                    <th key={h} className={TH}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr
                  key={l.id}
                  className={cn(
                    !l.enabled ? "bg-slate-50 text-slate-400 line-through" : i % 2 === 1 ? "bg-slate-50/70" : undefined,
                  )}
                >
                  <td className={cn(TD, "font-medium text-slate-800")}>{l.description || l.material}</td>
                  <td className={cn(TD, "text-[9.5px] text-slate-600")}>{l.spec || "—"}</td>
                  <td className={cn(TD, "text-[9px] leading-tight text-slate-500")}>{l.formula}</td>
                  <td className={TD_R}>{num(l.qty, 3)}</td>
                  <td className={cn(TD, "text-slate-500")}>{l.uom}</td>
                  <td className={TD_R}>{num(l.totalWeightKg)}</td>
                  <td className={cn(TD_R, "font-semibold")}>{money(l.amount)}</td>
                  <td className={cn(TD, "text-[9px] leading-tight text-slate-500")}>{l.drawingRef || summary.drawing}</td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={8} className="border border-slate-300 px-2 py-2 text-center text-slate-400">
                    No lines in this section.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-amber-50">
                <td colSpan={5} className="border border-slate-300 px-1.5 py-1 text-right font-bold text-slate-900">
                  Subtotal — {summary.label}
                </td>
                <td className="border border-slate-300 px-1.5 py-1 text-right font-bold tabular-nums text-slate-900">
                  {num(summary.totalKg)}
                </td>
                <td className="border border-slate-300 px-1.5 py-1 text-right font-extrabold tabular-nums text-slate-900">
                  {money(summary.materialAmount)}
                </td>
                <td className="border border-slate-300" />
              </tr>
            </tfoot>
          </table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default SectionCard;
