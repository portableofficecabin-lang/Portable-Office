"use client";

/**
 * COLONY COMPONENT INSPECTOR.
 *
 * Given a clicked ColonyPart (from the 2D fabrication sheets or the 3D model) plus the two live priced
 * results, this renders one card that reads the SAME everywhere: identity (label / kind / part mark /
 * grid / floor / assembly step / fabrication), the resolved section size / material / grade / length /
 * quantity / unit + total weight / rate / amount, any connection detail (connection id, bolt spec +
 * count, weld spec), and the BOQ line the part traces to — badged with which priced model it came
 * from (Material BOQ / Civil BOQ / synthesized detail).
 *
 * The dual-source lookup lives in boqLink.ts; this component is pure presentational UI and is never
 * exported to PDF, so ordinary Tailwind colours are fine here (no oklch-safety constraint).
 */

import { X } from "lucide-react";
import type { ColonyPart } from "@/features/labour-colony-studio/model/types";
import type { BoqResult } from "@/lib/boq/types";
import type { CivilWorkResult } from "@/lib/quotation/labourColonyCivil";
import { ASSEMBLY_SEQUENCE } from "@/features/labour-colony-studio/model/assembly";
import { colonyBoqForPart, type InspectorBoq } from "./boqLink";

const rs = (n?: number | null): string =>
  n == null || !isFinite(n) ? "—" : `₹ ${Math.round(n).toLocaleString("en-IN")}`;
const kg = (n?: number | null): string =>
  n == null || !isFinite(n) ? "—" : `${n.toFixed(1)} kg`;
/** Colony native unit is METRES — show metres, never the cabin mm→ft conversion. */
const m = (v?: number | null): string =>
  v == null || !isFinite(v) ? "—" : `${v.toFixed(3)} m`;

function floorLabel(f?: number): string | undefined {
  if (f == null) return undefined;
  if (f === -1) return "Foundation";
  if (f === 0) return "Ground floor";
  if (f === 1) return "First floor";
  return `Floor ${f}`;
}

const SOURCE_META: Record<InspectorBoq["source"], { label: string; className: string }> = {
  steel: { label: "Material BOQ", className: "bg-emerald-100 text-emerald-700" },
  civil: { label: "Civil BOQ", className: "bg-amber-100 text-amber-700" },
  none: { label: "Synthesized detail", className: "bg-slate-200 text-slate-600" },
};

const FABRICATION_LABEL: Record<NonNullable<ColonyPart["fabrication"]>, string> = {
  shop: "Shop-fabricated",
  site: "Site-erected",
  reference: "Reference (civil)",
};

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
  part,
  boqResult,
  civil,
  onClose,
}: {
  part: ColonyPart | null;
  boqResult: BoqResult | null;
  civil: CivilWorkResult | null;
  onClose?: () => void;
}) {
  if (!part) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        Click any component in the 2D fabrication sheet or the 3D model to see its part mark, section,
        material, weight and cost — traced live to the Material or Civil BOQ.
      </div>
    );
  }

  const sp = part.spec;
  const boq = colonyBoqForPart(part, boqResult, civil);
  const source = boq?.source ?? part.boqSource;
  const sourceMeta = SOURCE_META[source] ?? SOURCE_META.none;

  const material = boq?.material ?? sp.material;
  const sectionSize = boq?.sectionSize ?? sp.sectionSize;
  const grade = boq?.grade ?? sp.grade;
  const weightEach = boq?.unitWeightKg ?? sp.unitWeightKg;
  const weightTotal = boq?.totalWeightKg ?? sp.totalWeightKg;
  const stepTitle = ASSEMBLY_SEQUENCE.find((s) => s.step === part.assemblyStep)?.title;

  const boltValue =
    sp.boltSpec != null
      ? `${sp.boltCount != null ? `${sp.boltCount} × ` : ""}${sp.boltSpec}`
      : undefined;

  return (
    <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-base font-bold leading-tight">{part.label}</div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {part.kind.replace(/-/g, " ")}
            {part.partMark ? ` · ${part.partMark}` : ""} · step {part.assemblyStep}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${sourceMeta.className}`}>
            {sourceMeta.label}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-border/60">
        {/* identity */}
        <Row label="Part mark" value={part.partMark} />
        <Row label="Grid" value={part.grid} />
        <Row label="Floor" value={floorLabel(part.floor)} />
        {/* the canonical step count is COUNTED from the sequence, never spelled: the assembly video
            may film one construction step as several shots, but the step numbering is still this */}
        <Row
          label="Assembly step"
          value={stepTitle
            ? `${part.assemblyStep} of ${ASSEMBLY_SEQUENCE.length} — ${stepTitle}`
            : `${part.assemblyStep} of ${ASSEMBLY_SEQUENCE.length}`}
        />
        <Row label="Fabrication" value={part.fabrication ? FABRICATION_LABEL[part.fabrication] : undefined} />

        {/* material + geometry */}
        <Row label="Material" value={material} />
        <Row label="Section size" value={sectionSize} />
        <Row label="Grade" value={grade} />
        <Row label="Length" value={m(sp.lengthM)} />
        <Row label="Thickness" value={sp.thicknessMm != null ? `${sp.thicknessMm} mm` : undefined} />

        {/* quantity + weight + money */}
        <Row
          label="Quantity"
          value={boq?.qty != null ? `${boq.qty} ${boq.uom ?? ""}`.trim() : sp.quantity}
        />
        <Row label="Unit weight" value={kg(weightEach)} />
        <Row label="Total weight" value={kg(weightTotal)} />
        <Row
          label="Unit rate"
          value={boq?.rate != null ? `${rs(boq.rate)} / ${boq.uom ?? "unit"}` : rs(sp.rate)}
        />
        <Row label="Total cost" value={rs(boq?.amount ?? sp.amount)} />

        {/* connection detail */}
        <Row label="Connection" value={part.connectionId} />
        <Row label="Bolts" value={boltValue} />
        <Row label="Hole dia" value={sp.holeDiaMm != null ? `${sp.holeDiaMm} mm` : undefined} />
        <Row
          label="Weld"
          value={
            sp.weldSpec
              ? sp.weldLengthMm != null
                ? `${sp.weldSpec} · ${sp.weldLengthMm} mm`
                : sp.weldSpec
              : undefined
          }
        />

        {/* traceability */}
        <Row label="Material code" value={boq?.materialCode ?? part.materialKey} />
        <Row label="BOQ line" value={boq?.lineId ?? part.boqLineId} />
        <Row label="Detail" value={boq?.note ?? sp.note} />
      </div>

      {source === "steel" ? (
        <p className="mt-3 text-xs text-emerald-600">
          Live from the Material BOQ — updates when a rate or override changes.
        </p>
      ) : source === "civil" ? (
        <p className="mt-3 text-xs text-amber-600">
          Live from the Civil BOQ — foundation take-off + priced civil line.
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Synthesized connection detail — engineering fabrication data, not a priced BOQ line.
        </p>
      )}
    </div>
  );
}
