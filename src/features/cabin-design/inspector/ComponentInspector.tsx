"use client";

/**
 * COMPONENT INSPECTOR (spec §4).
 *
 * Given a clicked CabinPart (from the 2D sheet or the 3D model) and — where the part maps to a
 * priced BOQ line — that live BoqLine, this renders name / material / section size / L·W·H /
 * thickness / quantity / unit + total weight / rate / total cost. Reused by both the 2D and 3D
 * surfaces so a component reads the same everywhere. Pure presentational UI (never exported to PDF),
 * so ordinary Tailwind colours are fine here.
 */

import { X } from "lucide-react";
import type { CabinPart } from "@/features/cabin-design/model/types";

/** The subset of a priced BoqLine the inspector shows — the caller maps BoqLine → this. */
export interface InspectorBoq {
  material?: string;
  spec?: string;
  qty?: number;
  uom?: string;
  unitWeightKg?: number | null;
  totalWeightKg?: number;
  rate?: number | null;
  amount?: number;
  drawingRef?: string;
  /** BOQ line reference (the priced line's id). */
  lineId?: string;
  /** Material Master code (materialKey). */
  materialCode?: string;
}

const MM_PER_FT = 304.8;

function ftIn(mm?: number): string {
  if (!mm || !isFinite(mm)) return "—";
  const totalIn = (mm / MM_PER_FT) * 12;
  const ft = Math.floor(totalIn / 12);
  const inch = Math.round(totalIn - ft * 12);
  return `${ft}′-${inch}″ (${Math.round(mm)} mm)`;
}
const rs = (n?: number | null): string =>
  n == null || !isFinite(n) ? "—" : `₹ ${Math.round(n).toLocaleString("en-IN")}`;
const kg = (n?: number | null): string =>
  n == null || !isFinite(n) ? "—" : `${n.toFixed(1)} kg`;

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function ComponentInspector({
  part, boq, onClose,
}: {
  part: CabinPart | null;
  boq?: InspectorBoq | null;
  onClose?: () => void;
}) {
  if (!part) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        Click any component in the 2D drawing or 3D model to see its material, size, weight and cost.
      </div>
    );
  }

  const sp = part.spec;
  const material = boq?.material ?? sp.material;
  const weightEach = boq?.unitWeightKg ?? sp.unitWeightKg;
  const weightTotal = boq?.totalWeightKg ?? sp.totalWeightKg;

  return (
    <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-base font-bold leading-tight">{part.label}</div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {part.kind.replace(/-/g, " ")} · step {part.assemblyStep}
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="divide-y divide-border/60">
        <Row label="Material" value={material} />
        <Row label="Section size" value={boq?.spec ?? sp.sectionSize} />
        <Row label="Length" value={ftIn(sp.lengthMm)} />
        <Row label="Width" value={ftIn(sp.widthMm)} />
        <Row label="Height" value={ftIn(sp.heightMm)} />
        <Row label="Thickness" value={sp.thicknessMm ? `${sp.thicknessMm} mm` : undefined} />
        <Row label="Quantity" value={boq?.qty != null ? `${boq.qty} ${boq.uom ?? ""}`.trim() : sp.quantity} />
        <Row label="Unit weight" value={kg(weightEach)} />
        <Row label="Total weight" value={kg(weightTotal)} />
        <Row label="Unit rate" value={boq?.rate != null ? `${rs(boq.rate)} / ${boq.uom ?? "unit"}` : rs(sp.rate)} />
        <Row label="Total cost" value={rs(boq?.amount ?? sp.amount)} />
        <Row label="Material code" value={boq?.materialCode} />
        <Row label="BOQ line" value={boq?.lineId ?? part.boqLineId} />
        <Row label="Drawing" value={boq?.drawingRef} />
        <Row label="Assembly step" value={`${part.assemblyStep} of 17`} />
        <Row label="Note" value={sp.note} />
      </div>

      {boq ? (
        <p className="mt-3 text-xs text-emerald-600">Live from the Material BOQ — updates when a rate changes.</p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Rate &amp; weight appear here once the Material BOQ panel below has priced this component.
        </p>
      )}
    </div>
  );
}
