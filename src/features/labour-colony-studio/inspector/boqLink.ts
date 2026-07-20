/**
 * COMPONENT ↔ LIVE BOQ LINK — the DUAL-SOURCE colony resolver.
 *
 * A colony part traces its price/weight/quantity to ONE of two independent priced models, and the two
 * namespaces must NEVER be cross-joined:
 *
 *   • boqSource === "steel"  → the SUPERSTRUCTURE Material BOQ (`BoqResult.lines`, ids like
 *     `floor:joist:6`, `front:brace:100`). The part carries the exact `boqLineId`; siblings that
 *     roll up into one aggregated line share it. A kind-keyword fallback resolves a representative
 *     line when a part has no exact id yet.
 *   • boqSource === "civil"  → the SUBSTRUCTURE civil engine (`CivilWorkResult`). A foundation member
 *     resolves against its footing TYPE (F1/F2/F3, matched by part mark or grid) for the physical
 *     concrete take-off, and against a foundation civil line for the priced cost.
 *   • boqSource === "none"   → synthesized connection hardware (base plates, gussets, bolts, welds) the
 *     priced take-offs do not itemise. There is no price to look up, so the inspector shows the
 *     part's own fabrication spec (bolt / weld / plate thickness) and never invents a rate.
 *
 * Because both priced results are recomputed upstream when a Material Master rate or a civil rate
 * changes, the inspector updates live with NO geometry rebuild.
 */

import type { BoqLine, BoqResult } from "@/lib/boq/types";
import type { CivilWorkResult } from "@/lib/quotation/labourColonyCivil";
import type { ColonyPart, ColonyPartKind } from "@/features/labour-colony-studio/model/types";

type FootingType = CivilWorkResult["foundation"]["footingTypes"][number];
type CivilLineRow = CivilWorkResult["foundation"]["lines"][number];

/** The unified BOQ view for a clicked part — the inspector renders exactly this, whichever source it came from. */
export interface InspectorBoq {
  /** The priced steel line, when the part resolves to the Material BOQ (undefined for civil / none). */
  line?: BoqLine;
  /** Which priced model produced this view — drives the inspector's source badge. */
  source: "steel" | "civil" | "none";
  material?: string;
  sectionSize?: string;
  grade?: string;
  qty?: number;
  uom?: string;
  unitWeightKg?: number;
  totalWeightKg?: number;
  rate?: number;
  amount?: number;
  /** The BOQ / civil line id this part traces to. */
  lineId?: string;
  /** Material Master key (steel) or the part's materialKey (civil). */
  materialCode?: string;
  /** Free-text derivation — footing schedule detail, bolt/weld spec, etc. */
  note?: string;
}

/* ---------------------------------------------------------------------------
 * STEEL — the superstructure Material BOQ.
 * ------------------------------------------------------------------------- */

/** A representative line-id keyword per steel kind, for the fallback when a part has no exact `boqLineId`. */
const STEEL_KEYWORD: Partial<Record<ColonyPartKind, string>> = {
  column: "column",
  stud: "stud",
  rail: "rail",
  "base-beam": "beam",
  "floor-beam": "beam",
  joist: "joist",
  brace: "brace",
  "roof-truss": "truss",
  rafter: "rafter",
  "truss-web": "truss",
  purlin: "purlin",
  ridge: "ridge",
  "veranda-beam": "beam",
  "veranda-joist": "joist",
  "veranda-post": "post",
  "walkway-plate": "walkway",
  "floor-board": "floor",
  "floor-finish": "floor",
  "ext-panel": "sheet",
  "int-finish": "lining",
  "roof-sheet": "sheet",
  ceiling: "ceiling",
  partition: "partition",
  door: "door",
  window: "window",
  "stair-stringer": "stair",
  "stair-tread": "tread",
  landing: "landing",
  handrail: "handrail",
  "handrail-post": "handrail",
  "toe-plate": "toe",
};

function findSteelLine(part: ColonyPart, lines: BoqLine[]): BoqLine | undefined {
  if (part.boqLineId) {
    const exact = lines.find((l) => l.id === part.boqLineId);
    if (exact) return exact;
  }
  const kw = STEEL_KEYWORD[part.kind];
  if (kw) {
    const hit = lines.find((l) => l.id.includes(kw));
    if (hit) return hit;
  }
  return undefined;
}

function steelBoq(part: ColonyPart, result: BoqResult | null | undefined): InspectorBoq | null {
  const lines = result?.lines ?? [];
  if (!lines.length) return null;
  const l = findSteelLine(part, lines);
  if (!l) return null;
  return {
    line: l,
    source: "steel",
    material: l.material,
    sectionSize: l.spec,
    grade: l.grade,
    qty: l.qty,
    uom: l.uom,
    unitWeightKg: l.unitWeight ?? undefined,
    totalWeightKg: l.totalWeightKg,
    rate: l.rate ?? undefined,
    amount: l.amount,
    lineId: l.id,
    materialCode: l.materialKey,
  };
}

/* ---------------------------------------------------------------------------
 * CIVIL — the substructure civil engine (footing types + priced foundation lines).
 * ------------------------------------------------------------------------- */

/** Kind → the foundation civil-line key that carries this member's priced cost. */
const CIVIL_LINE_KEY: Partial<Record<ColonyPartKind, string>> = {
  pcc: "pcc_bed",
  footing: "rcc_main",
  pedestal: "rcc_main",
  "plinth-beam": "rcc_main",
  "base-plate": "steel_frame",
  "levelling-plate": "steel_frame",
};

/** Resolve the footing TYPE (F1/F2/F3 …) for a foundation part by its part mark, else its grid. */
function findFootingType(part: ColonyPart, civil: CivilWorkResult): FootingType | undefined {
  const types = civil.foundation.footingTypes ?? [];
  if (!types.length) return undefined;
  if (part.partMark) {
    const byMark = types.find((t) => t.mark === part.partMark);
    if (byMark) return byMark;
  }
  if (part.grid) {
    const byGrid = types.find((t) => t.columns.some((c) => c.grid === part.grid));
    if (byGrid) return byGrid;
  }
  return undefined;
}

/** Resolve the priced foundation civil line — exact by `boqLineId`, else by kind. */
function findCivilLine(part: ColonyPart, civil: CivilWorkResult): CivilLineRow | undefined {
  const rows = civil.foundation.lines ?? [];
  if (part.boqLineId) {
    const exact = rows.find((r) => r.key === part.boqLineId);
    if (exact) return exact;
  }
  const key = CIVIL_LINE_KEY[part.kind];
  if (key) {
    const byKind = rows.find((r) => r.key === key);
    if (byKind) return byKind;
  }
  return undefined;
}

function civilBoq(part: ColonyPart, civil: CivilWorkResult | null | undefined): InspectorBoq | null {
  if (!civil) return null;
  const ft = findFootingType(part, civil);
  const row = findCivilLine(part, civil);
  if (!ft && !row) return null;

  const sp = part.spec;
  const grade = sp.grade ?? civil.foundation.section.grade;
  // Physical take-off comes from the footing type; priced cost from the civil line — never mixed with steel.
  const sectionSize =
    sp.sectionSize ?? (ft ? `${ft.sideM} m sq × ${ft.depthM} m deep` : row?.spec);
  const note = ft
    ? `${ft.mark} · ${ft.kind} · ${ft.count} nos · ${ft.concreteCum} cum each · ` +
      `${ft.bearingPressureKnm2}/${ft.sbcKnm2} kN/m² (${Math.round(ft.utilisation * 100)}% SBC)`
    : sp.note;

  return {
    source: "civil",
    material: sp.material ?? row?.item ?? `RCC ${grade}`,
    sectionSize,
    grade,
    qty: row ? row.quantity : ft?.concreteCum,
    uom: row ? row.unit : ft ? "cum" : undefined,
    unitWeightKg: sp.unitWeightKg,
    totalWeightKg: sp.totalWeightKg,
    rate: row?.rate,
    amount: row?.amount,
    lineId: row?.key ?? part.boqLineId,
    materialCode: part.materialKey,
    note,
  };
}

/* ---------------------------------------------------------------------------
 * NONE — synthesized fabrication / connection detail (no priced line exists).
 * ------------------------------------------------------------------------- */

function fabricationDetail(part: ColonyPart): InspectorBoq {
  const sp = part.spec;
  const bolt =
    sp.boltSpec != null
      ? `${sp.boltCount != null ? `${sp.boltCount} × ` : ""}${sp.boltSpec}`
      : undefined;
  const plate = sp.thicknessMm != null ? `${sp.thicknessMm} mm plate` : undefined;
  const note =
    [bolt, sp.weldSpec, plate].filter(Boolean).join(" · ") || sp.note || undefined;
  return {
    source: "none",
    material: sp.material,
    sectionSize: sp.sectionSize,
    grade: sp.grade,
    unitWeightKg: sp.unitWeightKg,
    totalWeightKg: sp.totalWeightKg,
    rate: sp.rate,
    amount: sp.amount,
    lineId: part.boqLineId,
    materialCode: part.materialKey,
    note,
  };
}

/* ---------------------------------------------------------------------------
 * The dual-source entry point.
 * ------------------------------------------------------------------------- */

/**
 * The live BOQ view for a colony part, routed by its `boqSource`, or null when the part maps to no
 * priced/synthesized detail (e.g. a door-swing on an empty BOQ). The two priced namespaces are kept
 * strictly separate — a steel part never reads the civil result and vice-versa.
 */
export function colonyBoqForPart(
  part: ColonyPart,
  boqResult: BoqResult | null | undefined,
  civil: CivilWorkResult | null | undefined,
): InspectorBoq | null {
  switch (part.boqSource) {
    case "steel":
      return steelBoq(part, boqResult);
    case "civil":
      return civilBoq(part, civil);
    case "none":
      return fabricationDetail(part);
    default:
      return null;
  }
}
