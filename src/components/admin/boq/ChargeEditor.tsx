"use client";

/**
 * CHARGES — labour, fabrication, painting, transport, installation (spec §8).
 *
 * The editor never computes a charge. The AMOUNT shown against each line is the engine's own
 * `BoqTotals.chargeLines` value, handed down by the panel: the engine knows what "₹18/kg" means
 * (it is levied on TOTAL STEEL kg incl. wastage, not on total weight) and what "₹85/m²" means (it is
 * levied on the PAINTED area — wall, roof and partition coverings only, not the floor). Recomputing
 * either of those here would be guessing, and the guess would be wrong.
 *
 * A charge is deleted, not silently zeroed, so the estimator can see the difference between "we do
 * not charge transport" and "transport is ₹0".
 */

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { ChargeLine } from "@/lib/boq/types";

import { CHARGE_BASIS_LABEL, NumField, money, uid } from "./boqShared";

const BASES: ChargeLine["basis"][] = ["amount", "per_kg", "per_sqm", "percent"];

export interface ChargeEditorProps {
  charges: ChargeLine[];
  onChange: (charges: ChargeLine[]) => void;
  /** charge id → the engine's computed amount for it. Disabled charges are absent. */
  amounts: Record<string, number>;
  totalCharges: number;
}

export function ChargeEditor({ charges, onChange, amounts, totalCharges }: ChargeEditorProps) {
  const patch = (id: string, next: Partial<ChargeLine>) =>
    onChange(charges.map((c) => (c.id === id ? { ...c, ...next } : c)));

  const remove = (id: string) => onChange(charges.filter((c) => c.id !== id));

  const add = () =>
    onChange([
      ...charges,
      { id: `charge:${uid()}`, label: "New charge", basis: "amount", value: 0, enabled: true },
    ]);

  return (
    <div className="space-y-2">
      {charges.length === 0 && (
        <p className="rounded border border-dashed border-slate-300 px-3 py-4 text-center text-[11px] text-slate-400">
          No charges. The quotation will bill materials only.
        </p>
      )}

      {charges.map((c) => (
        <div
          key={c.id}
          className={cn(
            "grid grid-cols-[1fr_130px_84px_110px_auto_auto] items-center gap-2 rounded-lg border p-2",
            c.enabled ? "border-slate-300 bg-white" : "border-slate-200 bg-slate-50 opacity-70",
          )}
        >
          <Input
            value={c.label}
            onChange={(e) => patch(c.id, { label: e.target.value })}
            placeholder="Charge name"
            aria-label="Charge label"
            className="h-8 text-[11px]"
          />

          <Select value={c.basis} onValueChange={(v) => patch(c.id, { basis: v as ChargeLine["basis"] })}>
            <SelectTrigger className="h-8 text-[11px]" aria-label="Charge basis">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BASES.map((b) => (
                <SelectItem key={b} value={b} className="text-[11px]">
                  {CHARGE_BASIS_LABEL[b]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <NumField
            value={c.value}
            onCommit={(v) => patch(c.id, { value: v ?? 0 })}
            step={c.basis === "percent" ? 0.5 : 1}
            min={0}
            className="h-8 text-[11px]"
            ariaLabel="Charge value"
            title={CHARGE_BASIS_LABEL[c.basis]}
          />

          <div
            className="text-right text-[11px] font-bold tabular-nums text-slate-800"
            title="Computed by the pricing engine"
          >
            {c.enabled ? money(amounts[c.id] ?? 0) : "—"}
          </div>

          <Switch
            checked={c.enabled}
            onCheckedChange={(v) => patch(c.id, { enabled: v })}
            aria-label={c.enabled ? "Disable charge" : "Enable charge"}
            className="scale-90"
          />

          <button
            type="button"
            onClick={() => remove(c.id)}
            title="Remove this charge"
            aria-label="Remove charge"
            className="rounded border border-red-200 bg-white p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between gap-3 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={add} className="h-8 text-[11px]">
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add charge
        </Button>
        <div className="text-[11px] text-slate-600">
          Charges subtotal{" "}
          <span className="font-extrabold tabular-nums text-slate-900">{money(totalCharges)}</span>
        </div>
      </div>
    </div>
  );
}

export default ChargeEditor;
