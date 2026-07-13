"use client";

import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApprovedCivilQuote, QuoteGate } from "@/lib/quotation/labourColonyCivil";

/**
 * QUOTE CHANGE GATE — the civil price never moves behind the customer's back.
 *
 * The freshly-computed civil quantities are compared line-by-line against the price the user last
 * APPROVED. While anything differs (footing count, steel take-off, concrete, cost), the quotation
 * keeps charging the approved figure and this panel shows the before/after. The new price is only
 * adopted when the user explicitly confirms it.
 */

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const fmt = (v: number, unit: string) =>
  unit === "INR" ? inr(v) : `${Number(v.toFixed(unit === "nos" ? 0 : 1)).toLocaleString("en-IN")} ${unit}`;

export function QuoteChangeGate({ gate, onApprove }: {
  gate: QuoteGate;
  onApprove: (q: ApprovedCivilQuote) => void;
}) {
  const approve = () => onApprove({ ...gate.computed, approvedAt: new Date().toISOString() });

  /* ---- nothing approved yet: the price is live, offer to lock it ---- */
  if (!gate.hasApproved) {
    return (
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2 text-xs text-slate-700">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <div>
              <b>No civil price approved yet.</b> The quotation is showing the live computed figure of{" "}
              <b>{inr(gate.computed.totalCost)}</b> ({gate.computed.footingCount} footings,{" "}
              {Math.round(gate.computed.steelKg).toLocaleString("en-IN")} kg steel). Approve it to lock it — after
              that, any change to the quantities will need your confirmation before the price moves.
            </div>
          </div>
          <Button size="sm" onClick={approve} className="shrink-0 gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> Approve this price
          </Button>
        </div>
      </div>
    );
  }

  /* ---- approved and unchanged ---- */
  if (!gate.pending) {
    return (
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>
            <b>Civil price approved and up to date</b> — {inr(gate.approved!.totalCost)} (
            {gate.approved!.footingCount} footings,{" "}
            {Math.round(gate.approved!.steelKg).toLocaleString("en-IN")} kg steel). The quotation matches the
            current quantities.
          </span>
        </div>
      </div>
    );
  }

  /* ---- CHANGED: hold the price, show before/after, demand confirmation ---- */
  const totalDelta = gate.deltas.find((d) => d.key === "totalCost");
  const up = (totalDelta?.diff ?? 0) > 0;

  return (
    <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3">
      <div className="mb-2 flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div className="text-xs text-amber-950">
          <b>Civil quantities have changed since the last approval.</b> The quotation is still charging the{" "}
          <b>approved price of {inr(gate.approved!.totalCost)}</b>. Review the change below and confirm before
          the BOQ price is updated — nothing is applied automatically.
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-white/70 text-left text-slate-700">
              <th className="border border-amber-300 px-2 py-1 font-semibold">Item</th>
              <th className="border border-amber-300 px-2 py-1 text-right font-semibold">Approved (before)</th>
              <th className="border border-amber-300 px-2 py-1 text-right font-semibold">Computed (after)</th>
              <th className="border border-amber-300 px-2 py-1 text-right font-semibold">Change</th>
            </tr>
          </thead>
          <tbody>
            {gate.deltas.map((d) => {
              const worse = d.diff > 0;
              return (
                <tr key={d.key} className="bg-white/40">
                  <td className="border border-amber-300 px-2 py-1">{d.label}</td>
                  <td className="border border-amber-300 px-2 py-1 text-right text-slate-500">{fmt(d.before, d.unit)}</td>
                  <td className="border border-amber-300 px-2 py-1 text-right font-semibold text-slate-900">{fmt(d.after, d.unit)}</td>
                  <td className={`border border-amber-300 px-2 py-1 text-right font-bold ${worse ? "text-red-700" : "text-emerald-700"}`}>
                    {worse ? "+" : "−"}{fmt(Math.abs(d.diff), d.unit)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-amber-950">
          {totalDelta ? (
            <>
              Civil total would go from <b>{inr(totalDelta.before)}</b> to <b>{inr(totalDelta.after)}</b> —{" "}
              <b className={up ? "text-red-700" : "text-emerald-700"}>
                {up ? "an increase" : "a reduction"} of {inr(Math.abs(totalDelta.diff))}
              </b>.
            </>
          ) : (
            <>Quantities changed but the civil total is unchanged.</>
          )}
        </div>
        <Button size="sm" onClick={approve} className="shrink-0 gap-1.5 bg-amber-600 text-white hover:bg-amber-700">
          <CheckCircle2 className="h-4 w-4" /> Apply to quotation
        </Button>
      </div>
    </div>
  );
}
