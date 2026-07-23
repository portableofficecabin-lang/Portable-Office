/**
 * LABOUR COLONY ENGINEERING STUDIO — the model builder (spec: "single shared engineering model").
 *
 * buildColonyModel(input) → ColonyModel: a flat, deterministically-id'd list of every structural
 * component in colony METRES, ready for the 2D fabrication sheets, the Tekla-style 3D scene, the
 * exploded animation, the assembly video, the inspector, the BOQ highlighting and the report / drawing
 * export. It POSITIONS the members the two priced BOQs already took off — it NEVER re-prices or
 * invents a quantity:
 *
 *   • the SUPERSTRUCTURE (columns, base frame, joists, studs, rails, bracing, roof trusses / rafters /
 *     purlins, envelope, openings, stair, veranda) is positioned from `buildColonyTakeoff(result).frame`
 *     + per-face `buildElevation()` + per-floor `buildRoomFloorPlan()`, and linked to the Material BOQ
 *     lines (`boqResult`, ids like `${section}:column-corner`, `floor:joist:${c}`, `${face}:brace:${mm}`);
 *   • the SUBSTRUCTURE (PCC, footings, pedestals, plinth beams) is positioned on the SAME column grid
 *     (`buildColumnMarks`) the civil engine used, and linked to the civil result — so a steel column
 *     always lands on a real footing;
 *   • the CONNECTION hardware the priced take-off does not itemise (base plates, anchor bolts, splice
 *     plates, gussets, welds) is SYNTHESIZED as engineering-only detail — geometry with no price.
 *
 * Section sizes + piece counts are read from the LIVE priced BOQ via the resolvers in opts (so a
 * manual override, lock, DB edit or section swap flows straight through); the fallback is the model's
 * own take-off (which equals the BOQ's auto count) and finally the engine's `result.sections`.
 *
 * Pure: no React, no three.js, no DOM. Never statically import from a public / homepage component —
 * it pulls in the BOQ take-off; it belongs behind the admin lazy islands.
 */

import {
  buildColonyTakeoff, FLOOR_TUBE_SIZE_M, FLOOR_TUBE_SPACING_M, floorTubeLineYs,
} from "@/lib/boq/colonyTakeoff";
import { DEFAULT_NORMS } from "@/lib/boq/types";
import type { BoqNorms, TakeoffItem } from "@/lib/boq/types";
import type { LabourColonyResult, MemberSections, MsSection } from "@/lib/quotation/labourColony";
import type { CivilWorkResult } from "@/lib/quotation/labourColonyCivil";
import { buildColumnMarks, type ColumnMark } from "@/lib/quotation/labourColonyRebar";
import { buildRoomFloorPlan, type FPRoom, type FPStair, type FPVeranda, type RoomFloorPlanGeom } from "@/lib/quotation/roomFloorPlan";
import { buildElevation, type ElevationFace, type ElevationGeom } from "@/lib/quotation/elevation";
import {
  ASSEMBLY_SEQUENCE, COLOR_OF_KIND, EXPLODE_OF_KIND, LAYER_OF_KIND, STEP_OF_KIND, viewMaskOf,
} from "./assembly";
import { msSectionToDims, parseSectionDims, parseSectionFromSpec, type SectionDims } from "./sectionDims";
import { derivePufLock, platePocketGeometry, type PufLockDerived } from "./pufLock";
import {
  deriveRafterSupport, rafterCleatGeometry, tubeRunGeometry,
  type RafterSupportBox, type RafterSupportDerived, type RafterSupportRafterLine,
  type RafterSupportTubeLine,
} from "./rafterSupport";
import {
  buildSheetLayout, MIN_EDGE_BEARING_MM, SHEET_LABEL, type SheetLayoutResult,
} from "./sheetLayout";
import { buildPanelSupportSpec, type PanelSupportSpec } from "./panelSupport";
import type {
  BoqSource, ColonyAssemblyStep, ColonyModel, ColonyPart, ColonyPartKind, ModelBounds, ModelWarning,
  PartSolid, PartSpec, Pt, Vec3,
} from "./types";

/* ------------------------------------------------------------------ constants + helpers ------ */

const FACES: ElevationFace[] = ["front", "rear", "left", "right"];
/** Smallest visible cross-section (m). */
const MIN_VIS = 0.022;
/** Fallback draw sizes (m) when no section can be read. */
const FALLBACK: Record<string, number> = {
  column: 0.1, beam: 0.1, joist: 0.06, stud: 0.045, rail: 0.05, brace: 0.05, purlin: 0.06, truss: 0.075,
};
const PLATE_T = 0.012;      // connection-plate thickness (m)
const BASE_PLATE = 0.32;    // base-plate side (m)
const BASE_PLATE_T = 0.016;
const BOLT_D = 0.024;       // anchor / connection bolt visual diameter (m)
const DECK_T = 0.05;        // floor deck thickness (m)
/** 50 × 50 SHS — the MS pipe frame resting on seat cleats above the floor rafters (m).
 *  The size, spacing and run derivation are SHARED with the priced take-off (colonyTakeoff.ts), so
 *  the model can never place a tube the `floor:tube` line does not buy. */
const FLOOR_TUBE_H = FLOOR_TUBE_SIZE_M;
/**
 * CLEAR VERTICAL SEPARATION between the primary rafter and the secondary MS pipe (user rule,
 * 2026-07-23): the pipe never lies flush on the chord — it RESTS ON a seat cleat this tall, so the
 * two members read as two members in every view and the site can get a spanner between them.
 */
const RAFTER_SEAT_GAP = 0.04;
const RAIL_H = 1.0;         // handrail height (m)
const SKIN_T = 0.06, INS_T = 0.05, LIN_T = 0.02;

const rectPoly = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
  { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 },
];

const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): PartSolid => ({
  kind: "box",
  min: { x: Math.min(x0, x1), y: Math.min(y0, y1), z: Math.min(z0, z1) },
  max: { x: Math.max(x0, x1), y: Math.max(y0, y1), z: Math.max(z0, z1) },
});
const prism = (poly: Pt[], z0: number, z1: number): PartSolid => ({ kind: "prism", poly, z0, z1 });

/** A regular hexagon prism footprint (bolt head / nut) centred on (cx,cy), across-flats `af`. */
const hexPoly = (cx: number, cy: number, af: number): Pt[] => {
  const r = af / Math.sqrt(3); // circumradius from across-flats
  const pts: Pt[] = [];
  for (let i = 0; i < 6; i++) {
    const t = (Math.PI / 6) + (i * Math.PI) / 3;
    pts.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) });
  }
  return pts;
};

/** `count` interior lines evenly spaced across [0,span], excluding both ends (never duplicates ends). */
const evenLines = (span: number, count: number): number[] =>
  Array.from({ length: Math.max(0, count) }, (_, i) => (span * (i + 1)) / (count + 1));

/** `count` interior lines evenly spaced across [lo,hi], excluding both ends. */
const evenSpan = (lo: number, hi: number, count: number): number[] =>
  evenLines(hi - lo, count).map((v) => lo + v);

const uniqSorted = (xs: number[], eps = 1e-3): number[] => {
  const out: number[] = [];
  for (const x of [...xs].sort((a, b) => a - b)) {
    if (out.length === 0 || Math.abs(out[out.length - 1] - x) > eps) out.push(x);
  }
  return out;
};

/* ------------------------------------------------------------------ part factory ------------- */

class ModelSink {
  readonly parts: ColonyPart[] = [];
  readonly warnings: ModelWarning[] = [];
  private seq = 0;

  add(
    id: string,
    kind: ColonyPartKind,
    label: string,
    solid: PartSolid,
    opts: {
      boqLineId?: string;
      boqSource?: BoqSource;
      geomKey?: string;
      spec?: PartSpec;
      opacity?: number;
      explode?: Vec3;
      assemblyId?: string;
      connectionId?: string;
      partMark?: string;
      floor?: number;
      grid?: string;
      fabrication?: "shop" | "site" | "reference";
      colorHex?: string;
      /**
       * Override the family's default construction step. Connection hardware belongs to the member
       * it joins, not to its own kind: a truss's welds and splice bolts are erected WITH the truss
       * (step 17), even though `bolt`/`weld` default to the base-frame step. Without this the
       * exploded view and the assembly video would install truss hardware before the truss exists.
       */
      assemblyStep?: ColonyAssemblyStep;
    } = {},
  ): ColonyPart {
    const source: BoqSource =
      opts.boqSource ??
      (opts.boqLineId ? (LAYER_OF_KIND[kind] === "foundation" ? "civil" : "steel") : "none");
    const part: ColonyPart = {
      id: id || `${kind}:${this.seq++}`,
      kind,
      layer: LAYER_OF_KIND[kind],
      label,
      solid,
      colorHex: opts.colorHex ?? COLOR_OF_KIND[kind],
      opacity: opts.opacity,
      materialKey: undefined,
      boqLineId: opts.boqLineId,
      boqSource: source,
      geomKey: opts.geomKey,
      assemblyStep: opts.assemblyStep ?? STEP_OF_KIND[kind],
      explode: opts.explode ?? EXPLODE_OF_KIND[kind],
      spec: opts.spec ?? {},
      viewMask: viewMaskOf(kind),
      assemblyId: opts.assemblyId,
      connectionId: opts.connectionId,
      partMark: opts.partMark,
      floor: opts.floor,
      grid: opts.grid,
      fabrication: opts.fabrication,
    };
    this.parts.push(part);
    return part;
  }

  warn(w: ModelWarning): void {
    this.warnings.push(w);
  }
}

/* ------------------------------------------------------------------ inputs -------------------- */

export interface BuildColonyModelInput {
  /** The labour-colony calculation result (config + sections + civil-feeding geometry). */
  result: LabourColonyResult;
  /** The priced civil substructure (footings / pedestals / plinth beams). Optional. */
  civil?: CivilWorkResult | null;
  /** The structural column grid (buildColumnMarks output). Optional — derived from `civil` if absent. */
  columnGrid?: ColumnMark[] | null;
  /** BOQ norms the panel priced with — so the take-off frame matches the priced quantities. */
  norms?: BoqNorms | null;
  /** Raised-plinth height (m). Optional — derived from `civil` or defaults to 0.45. */
  plinthM?: number;
}

export interface BuildColonyModelOptions {
  /** Resolve a BOQ line id → its LIVE priced section (override / lock / DB aware). */
  resolveSection?: (boqLineId: string) => SectionDims | null;
  /** Resolve a BOQ line id → its LIVE priced piece count (override / lock aware). */
  resolveQty?: (boqLineId: string) => number | null;
  /** Include synthesized connection hardware (base plates, bolts, gussets, welds). Default true. */
  connectionDetail?: boolean;
}

/* ------------------------------------------------------------------ the builder -------------- */

export function buildColonyModel(input: BuildColonyModelInput, opts: BuildColonyModelOptions = {}): ColonyModel {
  const { result, civil } = input;
  const cfg = result.config;
  const fp = cfg.floorPlan;
  const floors = Math.max(1, cfg.floors ?? 1);
  const connDetail = opts.connectionDetail !== false;
  const s = new ModelSink();

  const norms: BoqNorms = input.norms ?? (cfg.materialBoq?.norms as BoqNorms | undefined) ?? DEFAULT_NORMS;
  const plinthM = input.plinthM ?? civil?.foundation?.section?.raisedPlinthHeightM ?? 0.45;

  /* ---- geometry sources (all metres) --------------------------------------------------- */
  const takeoff = buildColonyTakeoff(result, norms, { plinthM });
  const frame = takeoff.frame;
  const elev: Record<ElevationFace, ElevationGeom> = {
    front: buildElevation(result, fp, "front", { plinthM }),
    rear: buildElevation(result, fp, "rear", { plinthM }),
    left: buildElevation(result, fp, "left", { plinthM }),
    right: buildElevation(result, fp, "right", { plinthM }),
  };
  const floorHM = elev.front.floorHM;
  const roof = elev.front.roof;
  const geoms: RoomFloorPlanGeom[] = [];
  for (let f = 0; f < floors; f++) geoms.push(buildRoomFloorPlan(result, fp, f));
  const g0 = geoms[0];

  // Block footprint: length along x, depth along y. NOTE blockDM INCLUDES the peripheral verandas.
  const blockWM = g0.blockWM;   // x extent (length)
  const blockDM = g0.blockDM;   // y extent (depth, incl. top/bottom verandas)

  /**
   * The SOLID WALLED BODY — the room band only.
   *
   * `blockDM` includes the peripheral verandas, so building the external skin / studs / bracing on the
   * block edge would seal the open walkway shut AND leave every window floating `verandaDepth` inboard
   * of the nearest wall (a window is placed on `room.wallY`, the room's own external face). The
   * envelope therefore follows the ROOM BAND, and the verandas sit outside it — which is what the
   * elevation engine already models with its separate `bodyX0/bodyX1` ("solid walled extent") vs
   * `deckX0/deckX1` ("block incl. peripheral verandas").
   */
  const allRooms = geoms.flatMap((gm) => gm.rooms);
  const bodyX0 = allRooms.length ? Math.min(...allRooms.map((r) => r.x)) : 0;
  const bodyX1 = allRooms.length ? Math.max(...allRooms.map((r) => r.x + r.w)) : blockWM;
  const bodyY0 = allRooms.length ? Math.min(...allRooms.map((r) => r.y)) : 0;
  const bodyY1 = allRooms.length ? Math.max(...allRooms.map((r) => r.y + r.d)) : blockDM;
  const bodyWM = Math.max(0.1, bodyX1 - bodyX0);
  const bodyDM = Math.max(0.1, bodyY1 - bodyY0);

  /* ---- column grid (guarantees steel columns land on footings) ------------------------- */
  const grid: ColumnMark[] = (input.columnGrid && input.columnGrid.length)
    ? input.columnGrid
    : (civil?.foundation?.grid
        ? buildColumnMarks(civil.foundation.grid.xsM, civil.foundation.grid.ysM)
        : deriveGridFromBlock(blockWM, blockDM));
  const colXs = uniqSorted(grid.map((c) => c.xM));
  const rowYs = uniqSorted(grid.map((c) => c.yM));

  /* ---- section + quantity resolvers ---------------------------------------------------- */
  const roleKeyById = new Map<string, string>();
  const qtyById = new Map<string, number>();
  const cutById = new Map<string, number>();
  for (const it of takeoff.items) {
    roleKeyById.set(it.id, (it as { materialKey?: string }).materialKey ?? "");
    if (isSteel(it)) { qtyById.set(it.id, it.qty); cutById.set(it.id, it.cutLengthM); }
  }
  const secOf = cfg;
  const sectionForLine = (boqLineId: string | undefined, member: keyof MemberSections | null): SectionDims => {
    const live = boqLineId ? opts.resolveSection?.(boqLineId) ?? null : null;
    if (live) return clampDims(live);
    if (boqLineId) {
      const key = roleKeyById.get(boqLineId);
      const fromKey = key ? parseKeyDims(key) : null;
      if (fromKey) return clampDims(fromKey);
    }
    if (member) {
      const ms = (result.sections as MemberSections)[member] as MsSection | undefined;
      const d = msSectionToDims(ms);
      if (d) return clampDims(d);
    }
    return { widthMm: MIN_VIS * 1000, depthMm: MIN_VIS * 1000, thicknessMm: 0 };
  };
  const memberCount = (boqLineId: string): number => {
    const live = opts.resolveQty?.(boqLineId);
    if (live != null && Number.isFinite(live)) return Math.max(0, Math.round(live));
    return qtyById.get(boqLineId) ?? 0;
  };
  // sum priced pieces across every line whose id matches a prefix (studs / rails / braces are keyed)
  const countByPrefix = (prefix: string): number => {
    let n = 0;
    for (const id of qtyById.keys()) if (id.startsWith(prefix)) n += memberCount(id);
    return n;
  };
  const firstLineByPrefix = (prefix: string): string | undefined => {
    for (const id of qtyById.keys()) if (id.startsWith(prefix)) return id;
    return undefined;
  };
  /**
   * Pick the priced line a member of `lengthM` actually belongs to.
   *
   * The colony take-off deliberately emits ONE line per distinct CUT LENGTH — `floor:base-beam:3000`
   * AND `floor:base-beam:6000`, `floor:joist:${c}`, `${face}:brace:${mm}`, `veranda:beam:${c}` — so
   * binding every member to the first prefix match would leave the sibling lines with zero placements:
   * they would then vanish from the cutting list and the member list (which walk model parts), and one
   * line's weight would be smeared across the whole building. Matching on length keeps each modelled
   * member joined to the line that actually priced it. Falls back to the first match when no line
   * carries a cut length.
   */
  const lineForLength = (prefix: string, lengthM: number): string | undefined => {
    let best: string | undefined;
    let bestErr = Infinity;
    for (const id of qtyById.keys()) {
      if (!id.startsWith(prefix)) continue;
      const cut = cutById.get(id);
      const err = cut != null && cut > 0 ? Math.abs(cut - lengthM) : Infinity;
      if (best === undefined || err < bestErr) { best = id; bestErr = err; }
    }
    return best;
  };
  /**
   * Bind a member to its priced line AND surface the gap when the take-off prices no member of that
   * cut length (e.g. a corridor bay narrower than any priced run). The spec is explicit: never
   * silently drop or silently re-attribute a member — place it, attribute it to the nearest priced
   * line, and raise a deterministic engineering warning naming the member and the shortfall. Warnings
   * are de-duplicated per (prefix, length) so one unpriced bay does not emit hundreds of rows.
   */
  const lengthWarned = new Set<string>();
  const bindByLength = (prefix: string, lengthM: number, fallback: string): string => {
    const id = lineForLength(prefix, lengthM) ?? fallback;
    const cut = cutById.get(id);
    if (cut != null && cut > 0 && Math.abs(cut - lengthM) > 0.5) {
      const key = `${prefix}|${Math.round(lengthM * 100)}`;
      if (!lengthWarned.has(key)) {
        lengthWarned.add(key);
        s.warn({
          code: "member-length-unpriced",
          boqLineId: id,
          required: round(lengthM, 3),
          available: round(cut, 3),
          message:
            `${lengthM.toFixed(2)} m "${prefix}" member has no priced line of that cut length — ` +
            `attributed to ${id} (${cut.toFixed(2)} m). Check the take-off covers this bay.`,
        });
      }
    }
    return id;
  };

  /* ---- levels ------------------------------------------------------------------------- */
  const fflOf = (f: number) => plinthM + f * floorHM;          // finished floor level of floor f
  const ceilOf = (f: number) => plinthM + (f + 1) * floorHM;   // top of floor f
  const roofBaseZ = plinthM + floors * floorHM;                // eave / top-of-columns level

  /* ================================================================= SUBSTRUCTURE ======== */
  buildFoundation(s, grid, civil, plinthM);

  /* ================================================================= BASE PLATES + ANCHORS */
  if (connDetail) buildColumnBases(s, grid, plinthM);

  /* ================================================================= PUF PANEL BOTTOM LOCK */
  const pufLock = derivePufLock(cfg.pufLock, {
    grid: grid.map((c) => ({ grid: c.grid, xM: c.xM, yM: c.yM })),
    plinthTopZM: plinthM,
    plinthBeamWidthM: civil?.foundation?.section?.plinthBeamWidthM ?? 0.23,
    configPanelThicknessMm: cfg.panelThicknessMm,
    body: { x0: bodyX0, y0: bodyY0, x1: bodyX1, y1: bodyY1 },
    panelType: cfg.panelType,
  });
  buildPufLockAssemblies(s, pufLock, plinthM, cfg.panelType);

  /* ================================================================= COLUMNS (grid) ====== */
  const colDims = sectionForLine(firstLineByPrefix("front:column") ?? "front:column-corner", "columns");
  const cThruX = Math.max(MIN_VIS, colDims.widthMm / 1000);
  const cThruY = Math.max(MIN_VIS, colDims.depthMm / 1000);
  grid.forEach((cm) => {
    for (let f = 0; f < floors; f++) {
      const z0 = fflOf(f), z1 = ceilOf(f);
      const floorTag = f === 0 ? "gf" : `f${f}`;
      const lineId = cm.kind === "corner"
        ? (firstLineByPrefix(`${faceOfCorner(cm, colXs, rowYs)}:column-corner`) ?? "front:column-corner")
        : (firstLineByPrefix("front:column-post") ?? firstLineByPrefix("rear:column-post") ?? "front:column-post");
      const d = sectionForLine(lineId, "columns");
      const wx = Math.max(MIN_VIS, d.widthMm / 1000), wy = Math.max(MIN_VIS, d.depthMm / 1000);
      s.add(
        `${floorTag}:column:${cm.grid}`,
        "column",
        `Column ${cm.mark} (${cm.grid})`,
        box(cm.xM - wx / 2, cm.yM - wy / 2, z0, cm.xM + wx / 2, cm.yM + wy / 2, z1),
        {
          boqLineId: lineId, floor: f, grid: cm.grid, partMark: cm.mark, fabrication: "shop",
          assemblyId: `${floorTag}:col:${cm.grid}`,
          spec: dimsSpec(d, z1 - z0),
        },
      );
      // column splice at each upper floor
      if (f > 0 && connDetail) {
        s.add(`${floorTag}:splice:${cm.grid}`, "splice-plate", `Column splice ${cm.mark}`,
          box(cm.xM - wx / 2 - 0.02, cm.yM - wy / 2 - 0.02, z0 - 0.005, cm.xM + wx / 2 + 0.02, cm.yM + wy / 2 + 0.02, z0 + PLATE_T),
          { connectionId: `splice:${cm.grid}:${f}`, grid: cm.grid, floor: f, fabrication: "shop", partMark: `SP-${cm.mark}` });
      }
    }
  });

  /* ================================================================= BASE FRAME + FLOOR BEAMS */
  const baseLineId = firstLineByPrefix("floor:base-beam") ?? "floor:base-beam";
  const beamDims = sectionForLine(baseLineId, "baseFrame");
  const bw = Math.max(MIN_VIS, beamDims.widthMm / 1000), bh = Math.max(MIN_VIS, beamDims.depthMm / 1000);
  for (let f = 0; f < floors; f++) {
    const z = fflOf(f);
    const kind = f === 0 ? "base-beam" : "floor-beam";
    const step = f === 0 ? undefined : undefined;
    const floorTag = f === 0 ? "gf" : `f${f}`;
    // beams along X (each grid row) — each bound to the priced line of ITS OWN cut length
    rowYs.forEach((y, ri) => {
      for (let i = 0; i < colXs.length - 1; i++) {
        const x0 = colXs[i], x1 = colXs[i + 1];
        const span = x1 - x0;
        const lineId = bindByLength("floor:base-beam", span, baseLineId);
        const d = sectionForLine(lineId, "baseFrame");
        const w = Math.max(MIN_VIS, d.widthMm / 1000), h = Math.max(MIN_VIS, d.depthMm / 1000);
        s.add(`${floorTag}:beam-x:${ri}:${i}`, kind, `${f === 0 ? "Base" : "Floor"} beam (long.) row ${ri + 1}`,
          box(x0, y - w / 2, z - h, x1, y + w / 2, z),
          { boqLineId: lineId, floor: f, partMark: f === 0 ? "BB" : "FB", fabrication: "shop", spec: dimsSpec(d, span) });
      }
    });
    // beams along Y (each grid column)
    colXs.forEach((x, ci) => {
      for (let i = 0; i < rowYs.length - 1; i++) {
        const y0 = rowYs[i], y1 = rowYs[i + 1];
        const span = y1 - y0;
        const lineId = bindByLength("floor:base-beam", span, baseLineId);
        const d = sectionForLine(lineId, "baseFrame");
        const w = Math.max(MIN_VIS, d.widthMm / 1000), h = Math.max(MIN_VIS, d.depthMm / 1000);
        s.add(`${floorTag}:beam-y:${ci}:${i}`, kind, `${f === 0 ? "Base" : "Floor"} beam (trans.) col ${ci + 1}`,
          box(x - w / 2, y0, z - h, x + w / 2, y1, z),
          { boqLineId: lineId, floor: f, partMark: f === 0 ? "BB" : "FB", fabrication: "shop", spec: dimsSpec(d, span) });
      }
    });
    void step;
  }

  /* ================================================================= JOISTS + DECK ======== */
  const joistLineId = firstLineByPrefix("floor:joist") ?? "floor:joist";
  const jDims = sectionForLine(joistLineId, "baseFrame");
  const jw = Math.max(MIN_VIS, jDims.widthMm / 1000), jh = Math.max(MIN_VIS, jDims.depthMm / 1000);
  const joistLines = (frame?.joists ?? []).filter((x) => x > bodyX0 + 1e-3 && x < bodyX1 - 1e-3);
  const joistXs = joistLines.length
    ? joistLines
    : evenSpan(bodyX0, bodyX1, Math.max(1, Math.round(bodyWM / 0.6) - 1));
  /* A joist spans BAY to BAY (between the floor beams on adjacent grid lines) — not the full building
   * depth. That is both what is built and what is priced: the take-off keys `floor:joist:${c}` on the
   * ROOM depth, so a joist run across the whole body would match no priced line and orphan every one
   * of them from the cutting list. */
  const joistBayYs = uniqSorted([bodyY0, ...rowYs.filter((y) => y > bodyY0 + 1e-3 && y < bodyY1 - 1e-3), bodyY1]);
  void jDims;
  /* FLOOR RAFTERS ARE LATTICE TRUSSES (company rule, 2026-07-23, from the site photo): each priced
   * joist run is the TOP CHORD of a shop-welded open-web rafter — the bottom chord, end posts and
   * zig-zag web members are drawn with it, so the model shows the member that is actually craned in
   * rather than a plain bar. The lattice body is engineering detail (no BOQ line of its own): the
   * priced `floor:joist` line buys the WHOLE welded unit, so placement counts against that line stay
   * exactly one part per priced piece. The SITE joints are the bolted end cleats — a REMOVABLE
   * (demountable) system: undo the nut-bolts and the rafter lifts out for relocation, no cutting. */
  const RAFTER_WEB_GAP = 0.16;       // clear zig-zag zone between the chords (m)
  /* THE MS PIPE FRAME (company rule, 2026-07-23): the deck build-up is rafter FIRST, then a frame of
   * MS square tubes bolted OVER the rafter top chords, and only then the deck — so the whole floor
   * zone drops by the tube height and the board bears on the TUBES, exactly as built on site. The
   * tubes run PERPENDICULAR to the rafters at a sheet-modular 1220 mm, so every 8 ft sheet-end joint
   * lands on a tube centreline. Unpriced engineering detail — no BOQ line is touched. */
  const TUBE_SPEC = {
    sectionSize: "SHS 50 × 50 × 2 mm",
    role:
      "MS pipe — the SECONDARY floor member, a separate component from the rafter. Rests on seat "
      + "cleats clearly ABOVE the primary rafters, spread lengthwise at a sheet-modular 1220 mm, so "
      + "the deck (and every 8 ft sheet-end joint) bears on a tube centreline rather than mid-span.",
    loadPath: "Deck load → MS tube → seat cleats → PRIMARY rafter top chord → end plates / cleats → beam → column → footing.",
    note:
      "Priced on its own floor:tube line — never merged with the rafter. Site-bolted down at the "
      + "seat cleats: a removable joint, so the pipe frame unbolts when the building is relocated.",
  } as const;
  const RAFTER_SPEC = {
    role:
      "Web member of the lattice floor rafter. The open web gives the rafter its depth (and so its "
      + "stiffness) at a fraction of a solid beam's weight, and leaves routes for services through "
      + "the floor zone.",
    loadPath:
      "Deck load → top chord → web members (alternating tension / compression) → bottom chord → "
      + "end posts → bolted end cleats → beam → column → footing.",
    note:
      "Shop-welded as ONE unit with the top chord; the only SITE joints are the nut-bolted end "
      + "cleats, so the rafter is removable — unbolt and lift out, no site cutting or welding.",
  } as const;
  for (let f = 0; f < floors; f++) {
    const z = fflOf(f);
    const floorTag = f === 0 ? "gf" : `f${f}`;
    /* PRIMARY rafter chords sit one tube PLUS one seat cleat below the deck soffit: the pipe band
     * (z − tube … z) and the seat band (chordTop … tube soffit) stack above them, so rafter and
     * pipe are two visibly separate members with clear daylight between chord and tube. */
    const tubeSoffit = z - FLOOR_TUBE_H;
    const chordTop = tubeSoffit - RAFTER_SEAT_GAP;

    /* GROUND FLOOR (company rule, 2026-07-23): rafters along the SIDE WALLS ONLY, and nothing
     * spanning the width — the filled plinth and the priced base frame carry the floor, so a
     * transverse rafter field there would be steel without a job. The two side rafters run the FULL
     * LENGTH under the side walls (they take the panel base and edge loads), built as the same
     * shop-welded lattice as every other rafter, and are BOLTED DOWN to the base frame at every
     * grid line — the removable joints. Upper floors keep the full transverse rafter field. */
    if (f === 0) {
      ([bodyY0 + jw / 2, bodyY1 - jw / 2] as const).forEach((yc, si) => {
        const side = si === 0 ? "rear" : "front";
        /* THE SIDE RAFTER STANDS ABOVE THE PIPE LINE (user rule): nothing crosses it — the GF pipes
         * run PARALLEL — so it is NOT dropped by the tube height the way a field rafter is. Its top
         * chord sits at the DECK SOFFIT, proud of the MS pipe soffit line, carrying the deck edge
         * and the wall base directly. */
        const sideChordTop = z;
        const sideSpec = {
          role:
            "Ground-floor SIDE rafter — runs the full length under the side wall, its top chord AT "
            + "the deck soffit, standing ABOVE the MS pipe line (the pipes run parallel, never over "
            + "it). Takes the panel base and floor-edge loads; the floor field itself bears on the "
            + "filled plinth, which is why the ground floor has no transverse rafters.",
          loadPath: "Wall base + deck edge → side rafter → hold-down bolts at every grid line → base frame → plinth → footing.",
          note:
            "Shop-welded lattice unit, SITE-bolted down at every grid line — a removable joint: "
            + "undo the nut-bolts and the rafter lifts out for relocation.",
        } as const;
        s.add(`gf:side-rafter:${side}:chord`, "joist", `GF side rafter (${side}) — top chord`,
          box(bodyX0, yc - jw / 2, sideChordTop - jh, bodyX1, yc + jw / 2, sideChordTop),
          { floor: 0, partMark: "SR", fabrication: "shop", spec: { ...dimsSpec(jDims, bodyWM), ...sideSpec } });
        const gap = Math.min(RAFTER_WEB_GAP, sideChordTop - 2 * jh - 0.05);
        if (gap >= 0.05) {
          const topSoffit = sideChordTop - jh;
          const botTop = topSoffit - gap;
          const webT = Math.max(0.025, Math.min(jw, 0.04));
          s.add(`gf:side-rafter:${side}:bottom`, "joist-web", `GF side rafter (${side}) — bottom chord`,
            box(bodyX0, yc - jw / 2, botTop - jh, bodyX1, yc + jw / 2, botTop),
            { floor: 0, partMark: "SR", fabrication: "shop", spec: { ...sideSpec } });
          const panels = Math.max(2, Math.round(bodyWM / 0.35));
          for (let wseg = 0; wseg < panels; wseg++) {
            const xa = bodyX0 + (bodyWM * wseg) / panels;
            const xb = bodyX0 + (bodyWM * (wseg + 1)) / panels;
            const up = wseg % 2 === 0;
            s.add(`gf:side-rafter:${side}:web:${wseg}`, "joist-web", `GF side rafter (${side}) — web member`,
              braceQuad(true, yc, xa, up ? botTop : topSoffit, xb, up ? topSoffit : botTop, webT),
              { floor: 0, partMark: "SR", fabrication: "shop", spec: { ...sideSpec } });
          }
        }
        /* rafter ends on the END WALLS — the photographed connection: MS end plate SHOP-welded to
         * the rafter, SITE-bolted through the C wall purlin web at each end of the run. */
        if (connDetail) {
          ([[bodyX0, 1], [bodyX1, -1]] as const).forEach(([xEnd, dir], e) => {
            addRafterEndPlate(s, {
              idBase: `gf:conn:rend:${side}:${e === 0 ? "a" : "b"}`,
              connectionId: `rend:gf:${side}:${e === 0 ? "a" : "b"}`,
              assemblyId: "gf:deck",
              label: `GF side rafter (${side}) wall end`,
              axis: "x", at: xEnd, dir: dir as 1 | -1, cross: yc,
              z, memberWM: jw, memberHM: jh, floor: 0, flushTop: true,
            });
          });
        }

        /* hold-down plates — the removable side-rafter joints, one at every grid line */
        if (connDetail) {
          colXs
            .map((xg) => Math.min(bodyX1 - 0.06, Math.max(bodyX0 + 0.06, xg)))
            .filter((xg, gi, arr) => arr.indexOf(xg) === gi)
            .forEach((xg, gi) => {
              const cid = `srafter:${side}:${pad2(gi + 1)}`;
              const idBase = `gf:conn:srafter:${side}:${pad2(gi + 1)}`;
              const pT = 0.008, pHalf = 0.05;
              const chordBot = sideChordTop - jh;
              s.add(`${idBase}:plate`, "cleat", "Side-rafter hold-down plate",
                box(xg - pHalf, yc - pHalf, chordBot - pT, xg + pHalf, yc + pHalf, chordBot),
                { connectionId: cid, assemblyId: "gf:deck", partMark: "HD", floor: 0, fabrication: "shop", assemblyStep: 8,
                  spec: { widthMm: 100, heightMm: 100, thicknessMm: 8, boltCount: 1, boltSpec: "M12 gr 8.8",
                    role: "Holds the side rafter down to the base frame at this grid line.",
                    loadPath: "Side rafter → hold-down plate → bolt → base frame → plinth.",
                    note: "SITE-bolted — the removable joint of the ground-floor side rafter." } });
              s.add(`${idBase}:bolt`, "bolt", "Side-rafter hold-down bolt M12",
                box(xg - 0.006, yc - 0.006, chordBot - pT - 0.024, xg + 0.006, yc + 0.006, chordBot + 0.014),
                { connectionId: cid, assemblyId: "gf:deck", partMark: "HB", floor: 0, fabrication: "site", assemblyStep: 8,
                  spec: { boltSpec: "M12 × 50 gr 8.8" } });
              s.add(`${idBase}:washer`, "washer", "Hold-down washer",
                box(xg - 0.012, yc - 0.012, chordBot - pT - 0.027, xg + 0.012, yc + 0.012, chordBot - pT - 0.024),
                { connectionId: cid, assemblyId: "gf:deck", floor: 0, fabrication: "site", assemblyStep: 8 });
              s.add(`${idBase}:nut`, "nut", "Hold-down nut M12",
                box(xg - 0.0095, yc - 0.0095, chordBot - pT - 0.037, xg + 0.0095, yc + 0.0095, chordBot - pT - 0.027),
                { connectionId: cid, assemblyId: "gf:deck", floor: 0, fabrication: "site", assemblyStep: 8 });
            });
        }
      });
    }

    if (f > 0) joistXs.forEach((x, i) => {
      for (let b = 0; b < joistBayYs.length - 1; b++) {
        const y0 = joistBayYs[b], y1 = joistBayYs[b + 1];
        const span = y1 - y0;
        const lineId = bindByLength("floor:joist", span, joistLineId);
        const jd = sectionForLine(lineId, "baseFrame");
        const jw2 = Math.max(MIN_VIS, jd.widthMm / 1000), jh2 = Math.max(MIN_VIS, jd.depthMm / 1000);
        s.add(`${floorTag}:joist:${i}:${b}`, "joist", "Floor rafter (primary member) — top chord",
          box(x - jw2 / 2, y0, chordTop - jh2, x + jw2 / 2, y1, chordTop),
          {
            boqLineId: lineId, floor: f, partMark: "J", fabrication: "shop",
            spec: {
              ...dimsSpec(jd, span),
              note: "Top chord of the lattice floor rafter — the priced joist member. "
                + "The chords and webs ship as one shop-welded unit; the MS pipe frame bolts over "
                + "this chord, and the end cleats are the removable site joints.",
            },
          });

        /* ---- the lattice body. On the GROUND floor the web zone is clamped so the bottom chord
         * never digs below ground when the plinth is low; a plinth too shallow for any honest
         * lattice keeps the plain chord alone rather than drawing a buried truss. */
        const gap = f === 0 ? Math.min(RAFTER_WEB_GAP, chordTop - 2 * jh2 - 0.05) : RAFTER_WEB_GAP;
        if (gap >= 0.05) {
          const topSoffit = chordTop - jh2;
          const botTop = topSoffit - gap;
          const webT = Math.max(0.025, Math.min(jw2, 0.04));
          s.add(`${floorTag}:rafter:${i}:${b}:chord`, "joist-web", "Floor rafter — bottom chord",
            box(x - jw2 / 2, y0, botTop - jh2, x + jw2 / 2, y1, botTop),
            { floor: f, partMark: "FR", fabrication: "shop", spec: { ...dimsSpec(jd, span), ...RAFTER_SPEC } });
          ([y0 + jw2 / 2, y1 - jw2 / 2] as const).forEach((yp, pi) => {
            s.add(`${floorTag}:rafter:${i}:${b}:post:${pi}`, "joist-web", "Floor rafter — end post",
              box(x - jw2 / 2, yp - jw2 / 2, botTop, x + jw2 / 2, yp + jw2 / 2, topSoffit),
              { floor: f, partMark: "FR", fabrication: "shop", spec: { ...RAFTER_SPEC } });
          });
          const panels = Math.max(2, Math.round(span / 0.35));
          for (let wseg = 0; wseg < panels; wseg++) {
            const ya = y0 + (span * wseg) / panels;
            const yb = y0 + (span * (wseg + 1)) / panels;
            const up = wseg % 2 === 0;
            s.add(`${floorTag}:rafter:${i}:${b}:web:${wseg}`, "joist-web", "Floor rafter — web member",
              braceQuad(false, x, ya, up ? botTop : topSoffit, yb, up ? topSoffit : botTop, webT),
              { floor: f, partMark: "FR", fabrication: "shop", spec: { ...RAFTER_SPEC } });
          }
        }
      }
    });

    /* ---- MS PIPE FRAME — SHS tubes bolted OVER the rafters, carrying the deck ---------------- *
     * Erection order (and the order the assembly video installs): rafter FIRST, then this pipe
     * frame, then the deck. Tubes run across the rafters at a sheet-modular 1220 mm along the
     * depth, edge runs pulled in half a tube so nothing overhangs the body. */
    {
      const half = FLOOR_TUBE_H / 2;
      /* GROUND floor: the two EDGE runs are dropped — each would lie ON the side rafter that
       * already owns that line (the "pipe beside the rafter" defect); the interior module runs
       * are the whole pipe frame the GF needs. Upper floors keep their edge runs over the field. */
      const tubeYsAll = floorTubeLineYs(bodyY0, bodyY1);
      const tubeYs = f === 0 ? tubeYsAll.slice(1, -1) : tubeYsAll;
      tubeYs.forEach((yk, k) => {
        s.add(`${floorTag}:tube:${pad2(k + 1)}`, "floor-tube", "MS pipe (secondary member) — SHS floor tube",
          box(bodyX0, yk - half, z - FLOOR_TUBE_H, bodyX1, yk + half, z),
          { boqLineId: "floor:tube", floor: f, partMark: "FT", fabrication: "site", assemblyId: `${floorTag}:deck`, spec: { ...TUBE_SPEC, lengthM: round(bodyWM, 3) } });

        /* Bolted crossing plates — the removable tube joint, sampled on the GROUND and FIRST floor
         * (the same two-storey rule as the joist-end cleats; higher storeys repeat the identical
         * detail without multiplying the part count). On the FIRST floor the tubes bolt to the
         * rafter field; on the GROUND floor there is no transverse field — the longitudinal tubes
         * bolt DOWN to the transverse base beams at the grid lines instead. */
        if (connDetail && f <= 1) {
          const crossXs = f === 0
            ? colXs.filter((xg) => xg > bodyX0 + 0.06 && xg < bodyX1 - 0.06)
            : joistXs;
          crossXs.forEach((x, i) => {
            const cid = `ftube:${floorTag}:${pad2(i + 1)}:${pad2(k + 1)}`;
            const idBase = `${floorTag}:conn:tube:${pad2(i + 1)}:${pad2(k + 1)}`;
            const pHalf = 0.05;
            /* On a RAFTER crossing (floors 1+) the seat cleat is the 40 mm block that CREATES the
             * vertical separation — the tube rests on it, never on the chord. On the GROUND floor
             * the tube seats on the base beam through a thin packing plate (the beam top is already
             * at the tube soffit level there). */
            const seatBot = f === 0 ? tubeSoffit - 0.008 : chordTop;
            const seatH = Math.round((tubeSoffit - seatBot) * 1000);
            s.add(`${idBase}:plate`, "cleat",
              f === 0 ? "Tube packing plate on base beam" : "Tube seat cleat on rafter",
              box(x - pHalf, yk - pHalf, seatBot, x + pHalf, yk + pHalf, tubeSoffit),
              {
                connectionId: cid, assemblyId: `${floorTag}:deck`, partMark: "TP", floor: f,
                fabrication: "shop", assemblyStep: 8,
                spec: {
                  widthMm: 100, heightMm: 100, thicknessMm: seatH, boltCount: 1, boltSpec: "M12 gr 8.8",
                  role: f === 0
                    ? "Packs the MS tube level on the base beam and takes the holding-down bolt."
                    : "The SEAT CLEAT: keeps the secondary MS pipe clearly ABOVE the primary rafter "
                      + `(${seatH} mm clear separation) and takes the holding-down bolt.`,
                  loadPath: f === 0
                    ? "Tube → packing plate → base beam → column → footing."
                    : "Tube → seat cleat → rafter top chord → end plates / cleats → beam → column → footing.",
                  note: "SHOP-welded below; the tube is SITE-bolted through it — undo the nut and the tube lifts off.",
                },
              });
            s.add(`${idBase}:bolt`, "bolt", "Tube holding-down bolt M12",
              box(x - 0.006, yk - 0.006, seatBot - 0.03, x + 0.006, yk + 0.006, tubeSoffit + 0.014),
              { connectionId: cid, assemblyId: `${floorTag}:deck`, partMark: "TB", floor: f, fabrication: "site", assemblyStep: 8,
                spec: { boltSpec: "M12 gr 8.8", note: "Vertical bolt through tube bottom wall, seat and the member below." } });
            s.add(`${idBase}:washer`, "washer", "Tube bolt washer",
              box(x - 0.012, yk - 0.012, seatBot - 0.033, x + 0.012, yk + 0.012, seatBot - 0.03),
              { connectionId: cid, assemblyId: `${floorTag}:deck`, floor: f, fabrication: "site", assemblyStep: 8 });
            s.add(`${idBase}:nut`, "nut", "Tube bolt nut M12",
              box(x - 0.0095, yk - 0.0095, seatBot - 0.043, x + 0.0095, yk + 0.0095, seatBot - 0.033),
              { connectionId: cid, assemblyId: `${floorTag}:deck`, floor: f, fabrication: "site", assemblyStep: 8,
                spec: { note: "Nut + washer under the seat — the removable joint of the pipe frame." } });
          });
        }
      });
    }

    // deck: board + finish — over the walled body (the veranda gets its own chequered walkway plate)
    s.add(`${floorTag}:deck-board`, "floor-board", "Floor deck board",
      box(bodyX0, bodyY0, z, bodyX1, bodyY1, z + DECK_T), { boqLineId: "floor:board", floor: f });
    s.add(`${floorTag}:deck-finish`, "floor-finish", "Floor finish (vinyl)",
      box(bodyX0, bodyY0, z + DECK_T, bodyX1, bodyY1, z + DECK_T + 0.006), { boqLineId: "floor:vinyl", floor: f, opacity: 0.9 });
  }

  const body: Body = { x0: bodyX0, x1: bodyX1, y0: bodyY0, y1: bodyY1, w: bodyWM, d: bodyDM };

  /* ================================================================= DECK ENGINEERING DETAIL ===
   * The priced model above says WHAT steel is in the floor. This says whether that steel actually
   * carries an 8'×4' sheet: it sets the sheets out one by one, checks every joint lands on a member,
   * adds the perimeter C-channel edge member and any noggin the layout proves is missing, and bolts
   * the joists down. Everything it emits is engineering detail the take-off does not itemise, so it
   * carries `boqSource: "none"` and never invents a price. */
  const deck = buildDeckSystem(s, {
    body, floors, fflOf, joistXs, joistBayYs, colXs, rowYs,
    joistWM: jw, joistHM: jh, connDetail,
    gfSheetField: cfg.gfSheetField ?? false,
  });

  /* ================================================================= PANEL SEATING SYSTEM ======
   * How the PUF panels are actually held by the MS framework — base track, jamb / closing channels,
   * head restraint and the framed pockets at the columns, all sized from the configured panel
   * thickness so a 30 mm and a 70 mm panel each get a detail that fits. */
  const panelSpec = buildPanelSupportSpec(cfg.panelThicknessMm ?? 50);
  buildPanelSeating(s, { body, floors, fflOf, ceilOf, colXs, spec: panelSpec, connDetail });

  /* ================================================================= WALL STUDS + RAILS === */
  buildWallFraming(s, body, floors, fflOf, ceilOf, { countByPrefix, firstLineByPrefix, sectionForLine });

  /* ================================================================= BRACING ============== */
  buildBracing(s, elev, body, colXs, rowYs, { firstLineByPrefix, sectionForLine, lineForLength });

  /* ================================================================= RAFTER SUPPORT SYSTEM */
  /**
   * The bolted cleat → C-purlin → MS tube → covering system, resolved ONCE from the same building the
   * roof is built on, exactly as `derivePufLock` is resolved from the plinth grid. Resolved BEFORE
   * `buildRoof` because the roof builder has to know whether the generic roof-sheet slab is being
   * replaced by the real PUF panel layout (see the double-counting decision below).
   *
   * Everything the layout engine needs is taken STRUCTURALLY (the module is a zero-import leaf):
   *   • `rafterLines`  — the SAME `roofTrussXs` the roof steel was erected on, so a cleat always lands
   *                      on a rafter that really exists. Each truss runs along y (a fixed x ordinate),
   *                      which is what makes `runAxisFor` resolve the purlin / tube run to x — the
   *                      same direction `buildRoof` runs its own purlins in;
   *   • `floorCeilingZM` — `ceilOf(f)`, the ceiling framing level of every floor;
   *   • `roofBaseZM`   — `roofBaseZ`, the rafter top at the eave the roof assembly builds UP from;
   *   • `slope`        — the elevation engine's own roof form. A "hip" roof is handed over as a gable
   *                      because `buildRoof` already models it that way (`hasRidge = !flat && !mono`,
   *                      and `zApex` uses the gable rule), so the tube lines follow the planes the
   *                      model actually draws;
   *   • the rafter section, for the reference stub drawn inside the connection detail.
   */
  const rafterDims = sectionForLine(firstLineByPrefix("roof:rafter") ?? "roof:rafter", "roofFrame");
  const rsupTrussXs = roofTrussXs(colXs, body.x0, body.x0 + body.w);
  const rsupRafterLines: RafterSupportRafterLine[] = rsupTrussXs.map((x, i) => ({
    id: `roof:truss:t${i + 1}`,
    axis: "y",
    atM: x,
    fromM: body.y0,
    toM: body.y0 + body.d,
    mark: `T${i + 1}`,
  }));
  const rafterSupport = deriveRafterSupport(cfg.rafterSupport, {
    grid: grid.map((c) => ({ grid: c.grid, xM: c.xM, yM: c.yM })),
    body: { x0: body.x0, y0: body.y0, x1: body.x0 + body.w, y1: body.y0 + body.d },
    floors,
    floorCeilingZM: Array.from({ length: floors }, (_, f) => ceilOf(f)),
    roofBaseZM: roofBaseZ,
    slope: {
      type: roof.type === "flat" ? "flat" : roof.type === "mono" ? "mono" : "gable",
      riseM: roof.riseM,
      overhangM: roof.overhangM,
    },
    rafterLines: rsupRafterLines,
    rafterFlangeThicknessMm: rafterDims.thicknessMm > 0 ? rafterDims.thicknessMm : undefined,
    rafterDepthMm: rafterDims.depthMm,
    rafterWidthMm: rafterDims.widthMm,
  });

  /**
   * DOUBLE-COUNTING DECISION — option (i), scoped to exactly the covering the system replaces.
   *
   * The model already emits a generic `roof-sheet` slab and a generic `ceiling` slab. The
   * `rsup-puf-roof-panel` / `rsup-cement-sheet` parts are not an extra covering — they are the SAME
   * physical covering expressed as a real, laid-out sheet / panel run. Two rules resolve it:
   *
   *  1. ROOF — when the rafter-support roof level is enabled and has produced tube lines, the generic
   *     `roof-sheet` slab is NOT emitted and the rsup PUF roof panels are the covering. They HAVE to
   *     replace it rather than sit beside it: the generic slab lies in the rafter-top plane, which is
   *     precisely where the cleat and the C-purlin now are, so keeping both would put the slab
   *     THROUGH the support steel and leave two roof surfaces 108 mm apart. The panels carry the same
   *     `boqLineId: "roof:sheet"`, so the priced line still owns exactly ONE set of geometry and every
   *     BOQ↔drawing highlight, inspector lookup and placement count keeps resolving. Switch the system
   *     (or just its roof level) off and the generic slab comes straight back.
   *
   *  2. CEILING — nothing is suppressed, because there was never a duplicate. The generic `ceiling`
   *     part is the TOP-floor ceiling at `roofBaseZ`; `autoLevels` only ever gives the rafter-support
   *     system the INTERMEDIATE floor ceilings (`ceilOf(f)` for f ≤ floors−2), which no generic part
   *     covers. A G-only colony gets no rsup ceiling level at all.
   *
   * Quantities can therefore never be counted twice: each covering has exactly one geometry set, the
   * rsup board / panel counts live only in `model.rafterSupport.takeoff`, and no `rsup-*` kind is a
   * member of any existing schedule's kind set (STRUCTURAL_KINDS / PLATE_KINDS / BOLT_KINDS).
   */
  const rsupRoofLevel = rafterSupport.config.enabled
    ? rafterSupport.levels.find((lv) => lv.kind === "roof" && lv.enabled && lv.lines.length)
    : undefined;

  /* ================================================================= ROOF (trusses/rafters/purlins) */
  buildRoof(s, {
    colXs, rowYs, body, roofBaseZ, roof, frame, firstLineByPrefix, sectionForLine, connDetail,
    suppressRoofSheet: !!rsupRoofLevel,
  });

  buildRafterSupportAssemblies(
    s,
    rafterSupport,
    {
      flangeThicknessMm: rafterDims.thicknessMm > 0 ? rafterDims.thicknessMm : undefined,
      depthMm: rafterDims.depthMm,
      widthMm: rafterDims.widthMm,
    },
    connDetail,
  );

  /* ================================================================= ENVELOPE (skins) ===== */
  buildEnvelope(s, { body, plinthM, roofBaseZ, cfg });

  /* ================================================================= OPENINGS ============= */
  buildOpenings(s, geoms, floors, fflOf);

  /* ================================================================= PARTITIONS =========== */
  buildPartitions(s, geoms, floors, fflOf, ceilOf);

  /* ================================================================= STAIRCASE ============ */
  buildStairs(s, g0, floors, plinthM, floorHM, { firstLineByPrefix, sectionForLine });

  /* ================================================================= VERANDA + RAILINGS === */
  buildVeranda(s, geoms, floors, fflOf, ceilOf, { firstLineByPrefix, sectionForLine });

  /* ================================================================= MEP + FURNITURE ====== */
  buildServices(s, result, blockWM, blockDM, roofBaseZ, floors, fflOf, ceilOf);

  /* ---- assemble ------------------------------------------------------------------------ */
  const bounds = computeBounds(s.parts);
  return {
    parts: s.parts,
    assembly: ASSEMBLY_SEQUENCE,
    bounds,
    warnings: s.warnings,
    pufLock,
    rafterSupport,
    deck,
    panelSupport: panelSpec,
    meta: {
      projectName: cfg.projectName || result.config.projectName || "Labour Colony",
      title: `${cfg.projectName || "Labour Colony"} — G+${floors - 1}`,
      floors,
      totalLengthM: g0.totalLengthM,
      totalWidthM: g0.totalWidthM,
      totalHeightM: elev.front.totalHM,
      rooms: result.occupancy?.rooms ?? cfg.totalRooms ?? geoms.reduce((a, gm) => a + gm.rooms.length, 0),
      roofType: roof.type,
      sloped: roof.type !== "flat",
      plinthM,
      floorHM,
      gridRef: `${colXs.length}×${rowYs.length}`,
    },
  };

  /* helper closure — the face a corner column belongs to, for its column-corner BOQ line */
  function faceOfCorner(cm: ColumnMark, xs: number[], ys: number[]): string {
    const left = Math.abs(cm.xM - xs[0]) < 1e-3, right = Math.abs(cm.xM - xs[xs.length - 1]) < 1e-3;
    const rear = Math.abs(cm.yM - ys[0]) < 1e-3;
    if (rear) return "rear";
    if (left) return "left";
    if (right) return "right";
    return "front";
  }
}

/* ================================================================= sub-builders ============= */

/** The solid walled body (room band) in plan metres — walls, studs, bracing and skins follow this. */
export interface Body {
  x0: number; x1: number; y0: number; y1: number; w: number; d: number;
}

interface Resolvers {
  countByPrefix?: (prefix: string) => number;
  firstLineByPrefix: (prefix: string) => string | undefined;
  sectionForLine: (boqLineId: string | undefined, member: keyof MemberSections | null) => SectionDims;
  lineForLength?: (prefix: string, lengthM: number) => string | undefined;
}

function buildFoundation(s: ModelSink, grid: ColumnMark[], civil: CivilWorkResult | null | undefined, plinthM: number): void {
  const sec = civil?.foundation?.section;
  const footingDepth = sec?.footingDepthM ?? 0.3;
  const pedH = sec?.pedestalHeightM ?? Math.max(0.3, plinthM - 0.1);
  const pedSide = sec?.pedestalSizeM ?? 0.3;
  const pccT = (sec?.pccThicknessMm ?? 100) / 1000;
  const pbW = sec?.plinthBeamWidthM ?? 0.23;
  const pbD = sec?.plinthBeamDepthM ?? 0.3;

  // size each footing from its footing-type (F1/F2/F3) when the civil result differentiates them
  const sideByGrid = new Map<string, number>();
  const markByGrid = new Map<string, string>();
  for (const ft of civil?.foundation?.footingTypes ?? []) {
    for (const c of ft.columns) { sideByGrid.set(c.grid, ft.sideM); markByGrid.set(c.grid, ft.mark); }
  }
  const defSide = civil?.foundation?.footingTypes?.[0]?.sideM ?? sec?.footingLengthM ?? 1.0;

  const pedTop = plinthM - pbD;                       // pedestal rises to underside of plinth beam
  const pedBot = pedTop - pedH;
  const footTop = pedBot;
  const footBot = footTop - footingDepth;
  const pccTop = footBot;
  const pccBot = pccTop - pccT;

  grid.forEach((cm) => {
    const side = sideByGrid.get(cm.grid) ?? defSide;
    const mark = markByGrid.get(cm.grid) ?? "F1";
    // PCC bed
    s.add(`foundation:pcc:${cm.grid}`, "pcc", `PCC bed under ${cm.grid}`,
      box(cm.xM - side / 2 - 0.1, cm.yM - side / 2 - 0.1, pccBot, cm.xM + side / 2 + 0.1, cm.yM + side / 2 + 0.1, pccTop),
      { boqSource: "civil", grid: cm.grid, floor: -1, fabrication: "reference", partMark: "PCC" });
    // footing
    s.add(`foundation:footing:${cm.grid}`, "footing", `Footing ${mark} (${cm.grid})`,
      box(cm.xM - side / 2, cm.yM - side / 2, footBot, cm.xM + side / 2, cm.yM + side / 2, footTop),
      { boqSource: "civil", grid: cm.grid, floor: -1, partMark: mark, fabrication: "reference",
        spec: { widthMm: side * 1000, thicknessMm: (footTop - footBot) * 1000, note: "RCC isolated footing" } });
    // pedestal
    s.add(`foundation:pedestal:${cm.grid}`, "pedestal", `Pedestal ${cm.grid}`,
      box(cm.xM - pedSide / 2, cm.yM - pedSide / 2, pedBot, cm.xM + pedSide / 2, cm.yM + pedSide / 2, pedTop),
      { boqSource: "civil", grid: cm.grid, floor: -1, partMark: `PD-${cm.mark}`, fabrication: "reference" });
  });

  // plinth beams along each grid line between adjacent pedestals
  const xs = uniqSorted(grid.map((c) => c.xM)), ys = uniqSorted(grid.map((c) => c.yM));
  const z1 = plinthM, z0 = plinthM - pbD;
  ys.forEach((y, ri) => {
    for (let i = 0; i < xs.length - 1; i++) {
      s.add(`foundation:pb-x:${ri}:${i}`, "plinth-beam", `Plinth beam PB (row ${ri + 1})`,
        box(xs[i], y - pbW / 2, z0, xs[i + 1], y + pbW / 2, z1),
        { boqSource: "civil", floor: -1, partMark: ri === 0 || ri === ys.length - 1 ? "PB1" : "PB2", fabrication: "reference" });
    }
  });
  xs.forEach((x, ci) => {
    for (let i = 0; i < ys.length - 1; i++) {
      s.add(`foundation:pb-y:${ci}:${i}`, "plinth-beam", `Plinth beam PB (col ${ci + 1})`,
        box(x - pbW / 2, ys[i], z0, x + pbW / 2, ys[i + 1], z1),
        { boqSource: "civil", floor: -1, partMark: ci === 0 || ci === xs.length - 1 ? "PB1" : "PB2", fabrication: "reference" });
    }
  });
}

function buildColumnBases(s: ModelSink, grid: ColumnMark[], plinthM: number): void {
  const bolt = "M16 gr 8.8 anchor";
  grid.forEach((cm) => {
    const cid = `conn:base:${cm.grid}`;
    // levelling plate (thin, below base plate) + base plate
    s.add(`conn:levelling:${cm.grid}`, "levelling-plate", `Levelling plate ${cm.grid}`,
      box(cm.xM - BASE_PLATE / 2, cm.yM - BASE_PLATE / 2, plinthM - 0.004, cm.xM + BASE_PLATE / 2, cm.yM + BASE_PLATE / 2, plinthM),
      { connectionId: cid, grid: cm.grid, floor: 0, partMark: "LP", fabrication: "shop" });
    s.add(`conn:baseplate:${cm.grid}`, "base-plate", `Base plate ${cm.grid}`,
      box(cm.xM - BASE_PLATE / 2, cm.yM - BASE_PLATE / 2, plinthM, cm.xM + BASE_PLATE / 2, cm.yM + BASE_PLATE / 2, plinthM + BASE_PLATE_T),
      { connectionId: cid, grid: cm.grid, floor: 0, partMark: "BP", fabrication: "shop",
        spec: { widthMm: BASE_PLATE * 1000, thicknessMm: BASE_PLATE_T * 1000, boltSpec: bolt, boltCount: 4, holeDiaMm: 18, note: "Column base connection" } });
    // 4 anchor bolts + nuts + washers at the plate corners
    const off = BASE_PLATE / 2 - 0.05;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy], i) => {
      const bx = cm.xM + sx * off, by = cm.yM + sy * off;
      s.add(`conn:base:${cm.grid}:bolt:${i}`, "anchor-bolt", `Anchor bolt ${cm.grid}-${i + 1}`,
        box(bx - BOLT_D / 2, by - BOLT_D / 2, plinthM - 0.25, bx + BOLT_D / 2, by + BOLT_D / 2, plinthM + BASE_PLATE_T + 0.03),
        { connectionId: cid, grid: cm.grid, floor: 0, partMark: "AB", fabrication: "site",
          spec: { boltSpec: bolt, holeDiaMm: 18, note: "Holding-down bolt embedded in pedestal" } });
      // nuts + washers belong to the base-plate step (5), not the base-frame step their kinds default to
      s.add(`conn:base:${cm.grid}:washer:${i}`, "washer", `Washer ${cm.grid}-${i + 1}`,
        box(bx - BOLT_D, by - BOLT_D, plinthM + BASE_PLATE_T, bx + BOLT_D, by + BOLT_D, plinthM + BASE_PLATE_T + 0.004),
        { connectionId: cid, grid: cm.grid, floor: 0, fabrication: "site", assemblyStep: 5 });
      s.add(`conn:base:${cm.grid}:nut:${i}`, "nut", `Nut ${cm.grid}-${i + 1}`,
        prism(hexPoly(bx, by, BOLT_D * 1.6), plinthM + BASE_PLATE_T + 0.004, plinthM + BASE_PLATE_T + 0.02),
        { connectionId: cid, grid: cm.grid, floor: 0, fabrication: "site", assemblyStep: 5 });
    });
  });
}

/**
 * PUF PANEL BOTTOM LOCKING SYSTEM — position every fabricated assembly.
 *
 * Geometry, quantities, weights and validation all come from `pufLock.ts`; this function ONLY turns
 * the already-resolved assemblies into addressable model parts. It never computes a pocket width, a
 * piece count or a weight of its own, so the 3D model, the detail sheets and the schedules are
 * guaranteed to agree.
 *
 * Every part carries `connectionId = pufl:<plate mark>` so selecting any member of an assembly
 * highlights the whole assembly everywhere, and `assemblyId` so the exploded view flies the assembly
 * in as a unit. The two purlins additionally get a per-part explode vector along the pocket normal,
 * so exploding visibly OPENS the pocket instead of lifting both purlins together.
 */
function buildPufLockAssemblies(s: ModelSink, d: PufLockDerived, plinthM: number, panelType: string): void {
  if (!d.config.enabled || !d.positions.length) return;
  const { config: c, takeoff: t } = d;

  // surface every engineering issue as a deterministic model warning
  for (const issue of d.issues) {
    s.warn({
      code: `puf-lock-${issue.code}`,
      message: `PUF panel bottom lock — ${issue.message}`,
      memberId: issue.plateId,
    });
  }

  const solidOf = (b: { x0: number; y0: number; z0: number; x1: number; y1: number; z1: number }): PartSolid =>
    box(b.x0, b.y0, b.z0, b.x1, b.y1, b.z1);

  const purlinLabel = `${c.purlin.designation} (${c.purlin.grade})`;
  const boltSpec = `M${c.anchor.diameterMm} gr ${c.anchor.grade} × ${c.anchor.lengthMm}`;
  const weldSpec = `${c.purlin.weldSizeMm} mm ${c.purlin.weldType} · ${c.purlin.weldRunsPerPurlin} runs`;

  d.positions.forEach((pos, i) => {
    const g = platePocketGeometry(c, pos, plinthM);
    const id = `pufl:${pos.mark}`;
    const conn = `pufl:${pos.mark}`;
    const asm = `pufl-asm:${pos.mark}`;
    const asmMark = `PA-${String(i + 1).padStart(2, "0")}`;
    // the pocket normal, used so the two purlins fan APART when the model is exploded
    const nx = g.normal.x, ny = g.normal.y;

    /* ---- base / anchor plate ---- */
    s.add(`${id}:plate`, "puf-lock-base-plate", `PUF lock base plate ${pos.mark}`, solidOf(g.plate), {
      connectionId: conn, assemblyId: asm, grid: pos.gridRef, floor: 0, fabrication: "shop",
      partMark: `${c.plate.mark}-${pos.mark.slice(1)}`,
      spec: {
        material: c.plate.material,
        grade: c.plate.grade,
        sectionSize: `${c.plate.lengthMm} × ${c.plate.widthMm} × ${c.plate.thicknessMm} mm`,
        widthMm: c.plate.widthMm, heightMm: c.plate.lengthMm, thicknessMm: c.plate.thicknessMm,
        quantity: 1, unitWeightKg: t.plateUnitKg, totalWeightKg: t.plateUnitKg,
        boltSpec, boltCount: c.anchor.perPlate, holeDiaMm: c.plate.boltHoleDiaMm,
        note: `${asmMark} — bolted to plinth beam ${pos.beamId}. ${c.plate.finish}.`,
      },
    });

    /* ---- anchor bolts + washers + nuts ---- */
    g.bolts.forEach((b, bi) => {
      const bd = c.anchor.diameterMm / 2000;
      s.add(`${id}:bolt:${bi}`, "puf-lock-anchor-bolt", `PUF lock anchor bolt ${pos.mark}-${bi + 1}`,
        box(b.x - bd, b.y - bd, b.z0, b.x + bd, b.y + bd, b.z1), {
          connectionId: conn, assemblyId: asm, grid: pos.gridRef, floor: 0, fabrication: "site",
          partMark: "AB",
          spec: {
            grade: c.anchor.grade, boltSpec, holeDiaMm: c.plate.boltHoleDiaMm,
            quantity: 1, unitWeightKg: t.boltUnitKg, totalWeightKg: t.boltUnitKg,
            note: `${c.anchor.type} anchor · ${c.anchor.embedmentMm} mm embedment · ${c.anchor.projectionMm} mm projection`,
          },
        });
      s.add(`${id}:washer:${bi}`, "puf-lock-washer", `PUF lock washer ${pos.mark}-${bi + 1}`,
        box(b.x - bd * 2, b.y - bd * 2, b.z1 - c.anchor.projectionMm / 1000 - 0.004,
            b.x + bd * 2, b.y + bd * 2, b.z1 - c.anchor.projectionMm / 1000), {
          connectionId: conn, assemblyId: asm, grid: pos.gridRef, floor: 0, fabrication: "site",
          partMark: "WSR",
          spec: { quantity: 1, unitWeightKg: t.washerUnitKg, totalWeightKg: t.washerUnitKg, boltSpec },
        });
      s.add(`${id}:nut:${bi}`, "puf-lock-nut", `PUF lock nut ${pos.mark}-${bi + 1}`,
        prism(hexPoly(b.x, b.y, c.anchor.diameterMm * 1.5 / 1000),
              b.z1 - c.anchor.projectionMm / 1000, b.z1 - c.anchor.projectionMm / 1000 + c.anchor.diameterMm * 0.8 / 1000), {
          connectionId: conn, assemblyId: asm, grid: pos.gridRef, floor: 0, fabrication: "site",
          partMark: "NUT",
          spec: {
            quantity: 1, unitWeightKg: t.nutUnitKg, totalWeightKg: t.nutUnitKg, boltSpec,
            note: c.anchor.tighteningNote,
          },
        });
    });

    /* ---- the PAIR of C-purlins that forms the receiving pocket ---- */
    ([
      ["left", g.purlinLeft, -1] as const,
      ["right", g.purlinRight, 1] as const,
    ]).forEach(([side, solid, dir]) => {
      const kind: ColonyPartKind = side === "left" ? "puf-lock-c-purlin-left" : "puf-lock-c-purlin-right";
      s.add(`${id}:cpurlin-${side}`, kind, `PUF lock C-purlin (${side}) ${pos.mark}`, solidOf(solid), {
        connectionId: conn, assemblyId: asm, grid: pos.gridRef, floor: 0, fabrication: "shop",
        partMark: `${c.purlin.partMark}-${side === "left" ? "L" : "R"}`,
        // fan apart along the pocket normal so exploding OPENS the pocket
        explode: { x: nx * dir * 1.4, y: ny * dir * 1.4, z: 0.5 },
        spec: {
          material: "MS C-purlin", grade: c.purlin.grade, sectionSize: purlinLabel,
          thicknessMm: c.purlin.thicknessMm, lengthM: c.purlin.lengthMm / 1000,
          widthMm: c.purlin.flangeMm, heightMm: c.purlin.depthMm,
          quantity: 1,
          unitWeightKg: round(t.purlinKgPerM * (c.purlin.lengthMm / 1000), 3),
          totalWeightKg: round(t.purlinKgPerM * (c.purlin.lengthMm / 1000), 3),
          weldSpec, weldLengthMm: c.purlin.weldLengthMm,
          note:
            `Welded upright to plate ${pos.mark}. Web on the pocket line, flange turned away from the `
            + `panel. Clear pocket ${t.pocketClearGapMm} mm for a ${t.panelThicknessMm} mm ${panelType} panel.`,
        },
      });
    });

    /* ---- weld runs at the foot of each purlin web ---- */
    g.welds.forEach((w, wi) => {
      s.add(`${id}:weld:${wi}`, "puf-lock-weld", `PUF lock weld ${pos.mark}-${wi + 1}`, solidOf(w), {
        connectionId: conn, assemblyId: asm, grid: pos.gridRef, floor: 0, fabrication: "shop",
        partMark: "W",
        spec: {
          weldSpec, weldLengthMm: c.purlin.weldLengthMm,
          quantity: c.purlin.weldRunsPerPurlin,
          note: `${c.purlin.weldType} weld, ${c.purlin.weldSizeMm} mm leg, both sides of the seating flange.`,
        },
      });
    });

    /* ---- isolation strip + sealant bed inside the pocket ---- */
    if (c.iface.isolationStrip) {
      s.add(`${id}:strip`, "puf-lock-isolation-strip", `Isolation strip ${pos.mark}`, solidOf(g.bed), {
        connectionId: conn, assemblyId: asm, grid: pos.gridRef, floor: 0, fabrication: "site",
        partMark: "ISO", opacity: 0.9,
        spec: {
          material: c.iface.isolationStripMaterial,
          lengthM: c.purlin.lengthMm / 1000,
          note: "Isolation / de-bridging strip between the panel edge and the steel pocket.",
        },
      });
    }
    s.add(`${id}:sealant`, "puf-lock-sealant", `Sealant ${pos.mark}`,
      box(g.bed.x0, g.bed.y0, g.bed.z1, g.bed.x1, g.bed.y1, g.bed.z1 + 0.006), {
        connectionId: conn, assemblyId: asm, grid: pos.gridRef, floor: 0, fabrication: "site",
        partMark: "SL", opacity: 0.85,
        spec: {
          material: c.iface.sealantType,
          lengthM: c.purlin.lengthMm / 1000,
          note: "Sealant bead both faces after the panel is plumbed.",
        },
      });

    /* ---- the captured panel bottom edge, at the TRUE selected panel thickness ---- */
    s.add(`${id}:panel-seat`, "puf-lock-panel-seat", `PUF panel seating ${pos.mark}`, solidOf(g.panelSeat), {
      connectionId: conn, assemblyId: asm, grid: pos.gridRef, floor: 0, fabrication: "site",
      partMark: "PNL", opacity: 0.95,
      spec: {
        material: `${panelType} panel`,
        thicknessMm: t.panelThicknessMm,
        widthMm: t.panelThicknessMm,
        heightMm: c.iface.insertionDepthMm,
        lengthM: c.purlin.lengthMm / 1000,
        note:
          `Panel bottom edge captured in the paired C-purlin pocket. Pocket ${t.pocketClearGapMm} mm, `
          + `side gap ${t.sideGapMm} mm (max ${c.iface.maxSideGapMm} mm), insertion ${c.iface.insertionDepthMm} mm.`,
      },
    });
  });
}

/**
 * RAFTER SUPPORT SYSTEM — position every fabricated assembly.
 *
 * Geometry, quantities, weights, spacings and validation all come from `rafterSupport.ts`; this
 * function ONLY turns the already-resolved system into addressable model parts. It never computes a
 * spacing, a sheet count, a piece count or a weight of its own, so the 3D model, the assembly video,
 * the detail sheets and the schedules are guaranteed to agree — the same contract
 * `buildPufLockAssemblies` holds for the plinth-level locking system.
 *
 * WHAT IS EMITTED, AND WHY IT SPLITS THIS WAY
 *   • per TUBE LINE (`tubeRunGeometry`) — the CONTINUOUS C-purlin, the CONTINUOUS MS tube bolted to
 *     its web, and the covering strip that tube carries. These are the real, full-length members;
 *   • per CLEAT (`rafterCleatGeometry`) — the cleat plate and every solid of every nut-bolt: the
 *     head, both washers, the shank, the hex nut and the thread projecting beyond it, for BOTH the
 *     cleat bolts (vertical, into the rafter flange) and the web bolts (horizontal, through the
 *     purlin web and both walls of the tube). The visible nut-bolt IS the photographed detail, so
 *     every piece of it is its own selectable, inspectable solid.
 *   The per-cleat geometry ALSO returns a typical-detail segment of the purlin, tube and covering;
 *   those are deliberately NOT emitted here — the continuous run members above already occupy that
 *   space, and emitting both would put two solids in one place. The detail segment belongs to the
 *   enlarged 2D typical-detail sheet, not to the 3D building model.
 *
 * IDs — the join key shared with every other surface (drawings, video, inspector, schedules):
 *     part         rsup:<levelId>:<mark>:<partRole>      e.g. rsup:lvl-roof:RS-07:cleat
 *     connection   rsup:<levelId>:<cleatMark>            e.g. rsup:lvl-roof:RS-07
 *     assembly     rsup-asm:<levelId>:<cleatMark>
 * Every bolt, nut and washer carries the CLEAT's `connectionId`, so selecting any one of them
 * highlights the whole bolted connection everywhere, and the connection schedule rolls them up
 * without a single one being orphaned.
 *
 * The MS TUBE additionally gets a per-part explode vector with a SIDEWAYS component along the web
 * normal: it is bolted to the SIDE of the C-purlin web, so lifting it straight up (the default for
 * its kind) would drag it through the purlin and hide the very joint the exploded view exists to
 * show. Sliding it off sideways reveals the bolts, the washers and the flush bearing face.
 */
function buildRafterSupportAssemblies(
  s: ModelSink,
  d: RafterSupportDerived,
  rafterOpts: { flangeThicknessMm?: number; depthMm?: number; widthMm?: number },
  /**
   * Emit the individual nut-bolt solids (head / washers / shank / nut / thread). ON by default —
   * the visible nut-bolt IS the photographed detail, so the assembly video and the 3D scene both
   * need it — but it is by far the heaviest part of the system (six solids per bolt, six bolts per
   * cleat), so it honours the SAME `connectionDetail` switch that already gates the column base
   * plates and anchors. Switching it off still emits every cleat plate, C-purlin, MS tube and
   * covering, so the system never disappears; only the fastener detail is deferred.
   */
  connDetail: boolean,
): void {
  if (!d.config.enabled) return;

  /* Surface every engineering issue as a deterministic model warning, exactly as the PUF lock does —
   * a detail that cannot be built must never be silently drawn as if it could. */
  for (const issue of d.issues) {
    s.warn({
      code: `rafter-support-${issue.code}`,
      message: `Rafter support — ${issue.message}`,
      memberId: issue.memberId,
    });
  }

  const { config: c, takeoff: t } = d;
  const live = d.levels.filter((lv) => lv.enabled && lv.lines.length);
  if (!live.length && !d.positions.length) return;

  const solidOf = (b: RafterSupportBox): PartSolid => box(b.x0, b.y0, b.z0, b.x1, b.y1, b.z1);
  const levelById = new Map(d.levels.map((lv) => [lv.id, lv] as const));
  const levelTakeoffById = new Map(t.levels.map((lt) => [lt.levelId, lt] as const));

  const cleatBoltSpec = `M${c.bolt.diameterMm} × ${c.bolt.lengthMm} gr ${c.bolt.grade}`;
  const webBoltSpec = `M${c.bolt.diameterMm} × ${c.bolt.webLengthMm} gr ${c.bolt.grade}`;
  const afM = (c.bolt.acrossFlatsMm > 0 ? c.bolt.acrossFlatsMm : c.bolt.diameterMm * 1.5) / 1000;
  const nutsPerBolt = Math.max(0, Math.round(c.bolt.nutsPerBolt));
  const washersPerBolt = Math.max(0, Math.round(c.bolt.washersPerBolt));

  /**
   * Apportion a LEVEL total across that level's tube runs so the parts sum EXACTLY back to the
   * take-off: floor(total·(i+1)/n) − floor(total·i/n). This distributes a number the core already
   * computed; it never invents one, and Σ over the runs is identically the take-off's own count.
   */
  const shareOf = (total: number, i: number, n: number): number =>
    n <= 0 ? 0 : Math.floor((total * (i + 1)) / n) - Math.floor((total * i) / n);

  /* ============================================ the continuous run members, per tube line ==== */
  for (const lv of live) {
    const lt = levelTakeoffById.get(lv.id);
    const alongX = lv.runAxis === "x";
    /**
     * TRIBUTARY WIDTH of each covering strip.
     *
     * `tubeRunGeometry` returns the covering a tube carries as a strip ONE FULL BAY wide, centred on
     * the tube centreline — the right answer for a typical interior tube in isolation. Laid out across
     * a real building it is not a partition of the covering: the two outermost strips cantilever half
     * a bay past the walled body (driving a ceiling board out through the external wall), and where a
     * CLOSING line sits less than a full bay from its neighbour — the ordinary case whenever the span
     * is not a whole number of bays — the two strips overlap.
     *
     * Each strip is therefore clamped to the span it is really responsible for: half-way to the
     * neighbouring tube on each side, and the edge of the covered span at the two ends. The strips
     * then tile the covering exactly once — no gap, no overlap, nothing poking through a wall.
     *
     * This only ever SHRINKS the box the core returned; it never moves a tube, changes a spacing or
     * touches a quantity. Every area, board count, panel count and weight still comes from the
     * take-off, which was computed from the span itself and not from the drawn strip.
     */
    const acrossLo = Math.min(...lv.lines.map((l) => l.acrossM));
    const acrossHi = acrossLo + lv.spanAcrossM;
    const ordered = [...lv.lines].sort((p, q) => p.acrossM - q.acrossM);
    const tributary = new Map<string, { lo: number; hi: number }>();
    ordered.forEach((l, k) => {
      tributary.set(l.id, {
        lo: k === 0 ? acrossLo : (ordered[k - 1].acrossM + l.acrossM) / 2,
        hi: k === ordered.length - 1 ? acrossHi : (l.acrossM + ordered[k + 1].acrossM) / 2,
      });
    });
    const clipAcross = (b: RafterSupportBox, lineId: string): RafterSupportBox => {
      const trib = tributary.get(lineId) ?? { lo: acrossLo, hi: acrossHi };
      return alongX
        ? { ...b, y0: Math.max(b.y0, trib.lo), y1: Math.min(b.y1, trib.hi) }
        : { ...b, x0: Math.max(b.x0, trib.lo), x1: Math.min(b.x1, trib.hi) };
    };

    lv.lines.forEach((line: RafterSupportTubeLine, li) => {
      const g = tubeRunGeometry(c, line, lv);
      const runId = `rsup:${line.id}`;
      const asm = `rsup-asm:${line.id}`;
      const runNo = `${li + 1}/${lv.lines.length}`;
      const cleatsOnLine = d.positions.filter((p) => p.lineId === line.id).length;

      /* ---- the C-purlin bearing on the cleats ---- */
      s.add(`${runId}:purlin`, "rsup-c-purlin", `Rafter support C-purlin — ${lv.label} ${runNo}`,
        solidOf(g.purlin), {
          assemblyId: asm, geomKey: line.id, floor: lv.floorIndex, partMark: c.purlin.partMark,
          fabrication: "shop",
          spec: {
            material: "MS C-purlin", grade: c.purlin.grade, sectionSize: c.purlin.designation,
            lengthM: round(line.lengthM, 3),
            widthMm: c.purlin.flangeMm, heightMm: c.purlin.depthMm, thicknessMm: c.purlin.thicknessMm,
            quantity: 1,
            unitWeightKg: t.purlinKgPerM,
            totalWeightKg: round(line.lengthM * t.purlinKgPerM, 3),
            note:
              `Bears on ${cleatsOnLine} cleat${cleatsOnLine === 1 ? "" : "s"} at ${lv.spacingMm} mm c/c. `
              + `Flanges turned AWAY from the tube so the web face stays flat. Cut from `
              + `${c.purlin.lengthMm} mm stock (${c.purlin.finish}).`,
          },
        });

      /* ---- the MS tube bolted FLUSH to the purlin web ---- */
      const tubeAcross = alongX ? (g.tube.y0 + g.tube.y1) / 2 : (g.tube.x0 + g.tube.x1) / 2;
      // +1 / −1: which way the tube sits off the web face — read straight off the returned geometry
      const webSide = tubeAcross >= g.webFaceAtM ? 1 : -1;
      const tubeLift = EXPLODE_OF_KIND["rsup-ms-tube"].z;
      s.add(`${runId}:tube`, "rsup-ms-tube", `Rafter support MS tube — ${lv.label} ${runNo}`,
        solidOf(g.tube), {
          assemblyId: asm, geomKey: line.id, floor: lv.floorIndex, partMark: c.tube.partMark,
          fabrication: "shop",
          // slide the tube SIDEWAYS off the web so the exploded view reveals the bolted joint
          explode: alongX
            ? { x: 0, y: webSide * 2.4, z: tubeLift }
            : { x: webSide * 2.4, y: 0, z: tubeLift },
          spec: {
            material: "MS hollow section", grade: c.tube.grade, sectionSize: c.tube.designation,
            lengthM: round(line.lengthM, 3),
            widthMm: c.tube.widthMm, heightMm: c.tube.depthMm, thicknessMm: c.tube.wallThicknessMm,
            quantity: 1,
            unitWeightKg: t.tubeKgPerM,
            totalWeightKg: round(line.lengthM * t.tubeKgPerM, 3),
            boltSpec: webBoltSpec,
            boltCount: cleatsOnLine * Math.max(0, Math.round(c.tube.boltsPerConnection)),
            holeDiaMm: c.cleat.boltHoleDiaMm,
            note:
              `Side face FLUSH against the C-purlin web over a ${t.webLapMm} mm lap — no packing, no `
              + `gap. Every bolt passes through the ${c.purlin.thicknessMm} mm web and BOTH walls of `
              + `the tube (required grip ${t.requiredWebBoltLengthMm} mm). The tube CENTRELINE is the `
              + `covering module line.`,
          },
        });

      /* ---- the covering this tube carries ---- */
      const cover = clipAcross(g.covering, line.id);
      const coverW = alongX ? cover.y1 - cover.y0 : cover.x1 - cover.x0;
      if (coverW > 1e-6) {
        const ceilingLevel = lv.kind === "ceiling";
        const kind: ColonyPartKind = ceilingLevel ? "rsup-cement-sheet" : "rsup-puf-roof-panel";
        const qty = lt ? shareOf(ceilingLevel ? lt.sheets : lt.panels, li, lv.lines.length) : 0;
        s.add(`${runId}:${ceilingLevel ? "sheet" : "panel"}`, kind,
          ceilingLevel
            ? `Ceiling board run — ${lv.label} ${runNo}`
            : `PUF roof panel run — ${lv.label} ${runNo}`,
          solidOf(cover), {
            assemblyId: asm, geomKey: line.id, floor: lv.floorIndex,
            partMark: ceilingLevel ? "CB" : "RP",
            fabrication: "site",
            opacity: 0.95,
            /* The sloped roof covering inherits the priced `roof:sheet` line: it REPLACES the generic
             * roof-sheet slab (see the decision comment in buildColonyModel), so the priced line keeps
             * exactly one set of geometry and every BOQ↔drawing highlight still resolves. The ceiling
             * boards are an intermediate-floor covering the priced model does not carry a line for. */
            boqLineId: ceilingLevel ? undefined : "roof:sheet",
            spec: ceilingLevel
              ? {
                  material: c.ceilingSheet.material,
                  sectionSize: `${c.ceilingSheet.sheetLengthMm} × ${c.ceilingSheet.sheetWidthMm} × ${c.ceilingSheet.thicknessMm} mm`,
                  thicknessMm: c.ceilingSheet.thicknessMm,
                  widthMm: round(coverW * 1000),
                  lengthM: round(line.lengthM, 3),
                  quantity: qty,
                  unitWeightKg: t.ceilingSheetKgPerSqm,
                  totalWeightKg: round(coverW * line.lengthM * t.ceilingSheetKgPerSqm, 3),
                  note:
                    `${lt?.sheets ?? 0} board${(lt?.sheets ?? 0) === 1 ? "" : "s"} at this level `
                    + `(${lt?.sheetsWhole ?? 0} whole + ${lt?.sheetsCut ?? 0} cut, `
                    + `${(lt?.sheetAreaSqm ?? 0).toFixed(2)} m²). Screwed UNDER the tubes with `
                    + `${c.ceilingSheet.fixingSpec}. Every board edge lands on a tube — the `
                    + `${lv.spacingMm} mm spacing divides the ${c.ceilingSheet.sheetLengthMm} mm sheet exactly.`,
                }
              : {
                  material: c.roofPanel.panelType,
                  sectionSize: `${c.roofPanel.coverWidthMm} mm cover width × ${c.roofPanel.thicknessMm} mm`,
                  thicknessMm: c.roofPanel.thicknessMm,
                  widthMm: round(coverW * 1000),
                  lengthM: round(line.lengthM, 3),
                  quantity: qty,
                  unitWeightKg: t.roofPanelKgPerSqm,
                  totalWeightKg: round(coverW * line.lengthM * t.roofPanelKgPerSqm, 3),
                  note:
                    `${lt?.panels ?? 0} panel${(lt?.panels ?? 0) === 1 ? "" : "s"} at this level `
                    + `(${(lt?.panelAreaSqm ?? 0).toFixed(2)} m²), laid DOWN the slope one interlocking `
                    + `into the next. ${c.roofPanel.sideLapDetail}. Span between tubes ${lv.spacingMm} mm `
                    + `(limit ${c.roofPanel.maxSpanMm} mm). Fixed with ${c.roofPanel.fixingSpec}. `
                    + `${c.roofPanel.colour} · ${c.roofPanel.finish}.`,
                },
          });
      }
    });
  }

  /* ============================================ the bolted connection, per cleat ============= */
  for (const pos of d.positions) {
    const lv = levelById.get(pos.levelId);
    if (!lv || !lv.enabled) continue;
    const g = rafterCleatGeometry(c, pos, lv, rafterOpts);
    const id = `rsup:${pos.levelId}:${pos.mark}`;
    const conn = id;
    const asm = `rsup-asm:${pos.levelId}:${pos.mark}`;
    const common = {
      connectionId: conn,
      assemblyId: asm,
      grid: pos.gridRef,
      floor: pos.floorIndex,
    } as const;

    /* ---- the cleat / seat plate bolted to the rafter ---- */
    s.add(`${id}:cleat`, "rsup-cleat-plate", `Rafter cleat ${pos.mark} — ${lv.label}`, solidOf(g.cleat), {
      ...common, fabrication: "shop", partMark: pos.mark,
      spec: {
        material: c.cleat.material, grade: c.cleat.grade,
        sectionSize: `${c.cleat.lengthMm} × ${c.cleat.widthMm} × ${c.cleat.thicknessMm} mm`,
        widthMm: c.cleat.widthMm, heightMm: c.cleat.lengthMm, thicknessMm: c.cleat.thicknessMm,
        quantity: 1, unitWeightKg: t.cleatUnitKg, totalWeightKg: t.cleatUnitKg,
        boltSpec: cleatBoltSpec, boltCount: c.bolt.perCleat, holeDiaMm: c.cleat.boltHoleDiaMm,
        note:
          `${c.cleat.mark} · bolted to rafter ${pos.rafterId} where tube line ${pos.lineId} crosses it, `
          + `${pos.offsetMm} mm from gridline ${pos.gridRef}. ${c.cleat.holeCount} × Ø${c.cleat.boltHoleDiaMm} mm `
          + `holes on a ${c.cleat.holePitchMm} mm pitch × ${c.cleat.holeGaugeMm} mm gauge, `
          + `${c.cleat.edgeDistanceMm} mm edge distance. Centred on the web/tube interface so the bolt `
          + `heads clear both the purlin flange and the tube. ${c.cleat.finish}.`,
      },
    });

    /**
     * One complete nut-bolt, as separate solids in fitted order: head → washer → [the parts it
     * clamps] → washer → nut → projecting thread. A VERTICAL (cleat) bolt renders its head and nut as
     * true hexagon prisms — the prism primitive extrudes in z, which is exactly that bolt's axis — so
     * the hex flats an inspector actually looks for are visible; a HORIZONTAL (web) bolt keeps the
     * core's boxes, because a hexagon cannot be extruded sideways with this primitive. The across-
     * flats dimension is identical either way, so the two forms describe the same fastener.
     */
    const addBoltSolids = (
      b: (typeof g.cleatBolts)[number],
      role: string,
      boltSpec: string,
      boltLengthMm: number,
      unitKg: number,
      note: string,
    ): void => {
      const hexOrBox = (bx: RafterSupportBox): PartSolid =>
        b.axis === "z" ? prism(hexPoly(b.centre.x, b.centre.y, afM), bx.z0, bx.z1) : solidOf(bx);
      const boltSpecEntry: PartSpec = {
        grade: c.bolt.grade, boltSpec, thicknessMm: c.bolt.diameterMm,
        holeDiaMm: c.cleat.boltHoleDiaMm, lengthM: round(boltLengthMm / 1000, 4),
        quantity: 1, unitWeightKg: unitKg, totalWeightKg: unitKg, note,
      };
      s.add(`${id}:${role}-head`, "rsup-bolt", `Bolt head ${pos.mark} ${role}`, hexOrBox(b.head), {
        ...common, fabrication: "site", partMark: "BLT", spec: boltSpecEntry,
      });
      s.add(`${id}:${role}-shank`, "rsup-bolt", `Bolt ${pos.mark} ${role}`, solidOf(b.shank), {
        ...common, fabrication: "site", partMark: "BLT", spec: boltSpecEntry,
      });
      s.add(`${id}:${role}-thread`, "rsup-bolt", `Thread projection ${pos.mark} ${role}`,
        solidOf(b.projection), {
          ...common, fabrication: "site", partMark: "BLT",
          spec: {
            ...boltSpecEntry, quantity: 1, unitWeightKg: undefined, totalWeightKg: undefined,
            note:
              `${c.bolt.projectionMm} mm of thread must project beyond the tightened nut — this is the `
              + `check an inspector makes to confirm the bolt is fully engaged.`,
          },
        });
      b.washers.slice(0, washersPerBolt).forEach((w, wi) => {
        s.add(`${id}:${role}-washer-${wi + 1}`, "rsup-washer", `Washer ${pos.mark} ${role}-${wi + 1}`,
          solidOf(w), {
            ...common, fabrication: "site", partMark: "WSR",
            spec: {
              boltSpec, thicknessMm: c.bolt.washerThicknessMm, widthMm: c.bolt.washerOuterDiaMm,
              quantity: 1, unitWeightKg: t.washerUnitKg, totalWeightKg: t.washerUnitKg,
              note: wi === 0 ? "Plain washer under the bolt head." : "Plain washer under the nut.",
            },
          });
      });
      if (nutsPerBolt > 0) {
        s.add(`${id}:${role}-nut`, "rsup-nut", `Nut ${pos.mark} ${role}`, hexOrBox(b.nut), {
          ...common, fabrication: "site", partMark: "NUT",
          spec: {
            grade: c.bolt.grade, boltSpec, thicknessMm: c.bolt.nutHeightMm,
            widthMm: c.bolt.acrossFlatsMm,
            quantity: 1, unitWeightKg: t.nutUnitKg, totalWeightKg: t.nutUnitKg,
            note: c.bolt.tighteningNote,
          },
        });
      }
    };

    if (!connDetail) continue;

    /* ---- the cleat bolts: vertical, through the cleat and the rafter flange ---- */
    g.cleatBolts.forEach((b, bi) => {
      addBoltSolids(
        b, `cleat-bolt-${String(bi + 1).padStart(2, "0")}`, cleatBoltSpec, c.bolt.lengthMm,
        t.cleatBoltUnitKg,
        `Cleat-to-rafter bolt ${bi + 1} of ${g.cleatBolts.length}. Required grip `
        + `${t.requiredCleatBoltLengthMm} mm (washer + ${c.cleat.thicknessMm} mm cleat + rafter flange `
        + `+ washer + nut + ${c.bolt.projectionMm} mm projection). ${c.bolt.tighteningNote}`,
      );
    });

    /* ---- the web bolts: HORIZONTAL, through the web and BOTH walls of the tube ---- */
    g.webBolts.forEach((b, bi) => {
      addBoltSolids(
        b, `web-bolt-${String(bi + 1).padStart(2, "0")}`, webBoltSpec, c.bolt.webLengthMm,
        t.webBoltUnitKg,
        `Tube-to-web bolt ${bi + 1} of ${g.webBolts.length} at ${c.tube.boltPitchMm} mm pitch. Passes `
        + `through the ${c.purlin.thicknessMm} mm C-purlin web and BOTH walls of the `
        + `${c.tube.designation} — a bolt fixed into a single wall has nothing to bear against. `
        + `Required grip ${t.requiredWebBoltLengthMm} mm.`,
      );
    });
  }
}

function buildWallFraming(
  s: ModelSink, body: Body,
  floors: number, fflOf: (f: number) => number, ceilOf: (f: number) => number, r: Resolvers,
): void {
  // The external walls stand on the ROOM BAND (body), not the block edge — the verandas are outside.
  const faceWall: Record<ElevationFace, { horiz: boolean; at: number; lo: number }> = {
    rear: { horiz: true, at: body.y0, lo: body.x0 },
    front: { horiz: true, at: body.y1, lo: body.x0 },
    left: { horiz: false, at: body.x0, lo: body.y0 },
    right: { horiz: false, at: body.x1, lo: body.y0 },
  };
  const inward: Record<ElevationFace, number> = { rear: 1, front: -1, left: 1, right: -1 };
  FACES.forEach((face) => {
    const w = faceWall[face];
    const wallLen = w.horiz ? body.w : body.d;
    const studLine = r.firstLineByPrefix(`${face}:stud`) ?? `${face}:stud:0`;
    const railLine = r.firstLineByPrefix(`${face}:rail`) ?? `${face}:rail:0`;
    const studCount = r.countByPrefix?.(`${face}:stud`) ?? 0;
    const perFloor = Math.max(0, Math.round(studCount / floors));
    const sd = r.sectionForLine(studLine, "wallStud");
    const rd = r.sectionForLine(railLine, "wallStud");
    const sw = Math.max(MIN_VIS, Math.min(sd.widthMm, sd.depthMm) / 1000);
    const sthru = Math.max(MIN_VIS, Math.max(sd.widthMm, sd.depthMm) / 1000);
    const rw = Math.max(MIN_VIS, rd.depthMm / 1000);
    for (let f = 0; f < floors; f++) {
      const z0 = fflOf(f), z1 = ceilOf(f);
      const floorTag = f === 0 ? "gf" : `f${f}`;
      const dir = inward[face];
      evenSpan(w.lo, w.lo + wallLen, perFloor).forEach((a, i) => {
        // `at` is the wall face; members sit INBOARD of it (dir) so they never poke out of the skin.
        const t0 = w.at, t1 = w.at + dir * sthru;
        const solid = w.horiz
          ? box(a - sw / 2, Math.min(t0, t1), z0, a + sw / 2, Math.max(t0, t1), z1)
          : box(Math.min(t0, t1), a - sw / 2, z0, Math.max(t0, t1), a + sw / 2, z1);
        s.add(`${floorTag}:stud:${face}:${i}`, "stud", `Wall stud — ${face}`, solid,
          { boqLineId: studLine, floor: f, partMark: "S", fabrication: "shop", spec: dimsSpec(sd, z1 - z0) });
      });
      // top + bottom rails
      ([["bottom", z0, z0 + rw], ["top", z1 - rw, z1]] as const).forEach(([tag, rz0, rz1]) => {
        const t0 = w.at, t1 = w.at + dir * rw;
        const solid = w.horiz
          ? box(w.lo, Math.min(t0, t1), rz0, w.lo + wallLen, Math.max(t0, t1), rz1)
          : box(Math.min(t0, t1), w.lo, rz0, Math.max(t0, t1), w.lo + wallLen, rz1);
        s.add(`${floorTag}:rail:${face}:${tag}`, "rail", `Wall rail (${tag}) — ${face}`, solid,
          { boqLineId: railLine, floor: f, partMark: "R", fabrication: "shop" });
      });
    }
  });
}

/**
 * Vertical cross bracing, placed in REAL structural-grid bays.
 *
 * It is tempting to read the bay extents straight off `ElevationGeom.braces`, but those x-coordinates
 * live in the ELEVATION axis, which `buildElevation` mirrors for the rear and right faces and offsets
 * from the room bounding box — so `br.x0 - bodyX0` cancels the offset but NOT the mirror, silently
 * flipping the rear/right bracing and sliding the left/right bracing off its column lines. Instead we
 * span the bays between adjacent COLUMN GRID lines (which is where a brace physically goes, and
 * guarantees each end lands on a column) and take only the COUNT from the priced BOQ, so the model
 * still places exactly the braces that were bought.
 */
function buildBracing(
  s: ModelSink, elev: Record<ElevationFace, ElevationGeom>, body: Body,
  colXs: number[], rowYs: number[], r: Resolvers,
): void {
  const floorsN = Math.max(1, elev.front.floors);
  const plinth = elev.front.plinthM;
  const floorH = elev.front.floorHM;

  FACES.forEach((face) => {
    const horiz = face === "front" || face === "rear";
    const planAt = face === "rear" ? body.y0 : face === "front" ? body.y1 : face === "left" ? body.x0 : body.x1;
    const axis = horiz ? colXs : rowYs;
    const lo = horiz ? body.x0 : body.y0;
    const hi = horiz ? body.x1 : body.y1;
    // bays between adjacent grid lines, clipped to the walled body
    const lines = uniqSorted([lo, ...axis.filter((v) => v > lo + 1e-3 && v < hi - 1e-3), hi]);
    const bays: [number, number][] = [];
    for (let i = 0; i < lines.length - 1; i++) bays.push([lines[i], lines[i + 1]]);
    if (!bays.length) return;

    const priced = r.countByPrefix?.(`${face}:brace`) ?? 0;
    if (priced <= 0) return;

    const firstLine = r.firstLineByPrefix(`${face}:brace`);
    let placed = 0;
    outer:
    for (let f = 0; f < floorsN; f++) {
      const z0 = plinth + f * floorH;
      const z1 = z0 + floorH;
      for (let b = 0; b < bays.length; b++) {
        if (placed >= priced) break outer;
        const [p0, p1] = bays[b];
        // an X uses two members; fall back to a single diagonal for the last odd piece
        const pair = placed + 1 < priced;
        const diag = Math.hypot(p1 - p0, z1 - z0);
        const lineId = r.lineForLength?.(`${face}:brace`, diag) ?? firstLine;
        const d = r.sectionForLine(lineId, "bracing");
        const t = Math.max(MIN_VIS, Math.max(d.widthMm, d.depthMm) / 1000);
        const segs: [number, number, number, number][] = pair
          ? [[p0, z0, p1, z1], [p0, z1, p1, z0]]
          : [[p0, z0, p1, z1]];
        segs.forEach(([a0, za, a1, zb], k) => {
          s.add(`brace:${face}:${f}:${b}:${k}`, "brace", `Cross brace — ${face}`,
            braceQuad(horiz, planAt, a0, za, a1, zb, t),
            { boqLineId: lineId, floor: f, partMark: "BR", fabrication: "shop", spec: dimsSpec(d, diag) });
          placed++;
        });
      }
    }
  });
}

/** A diagonal brace drawn as a thin quad in the wall plane. */
function braceQuad(horiz: boolean, at: number, p0: number, z0: number, p1: number, z1: number, t: number): PartSolid {
  const w = t / 2;
  if (horiz) {
    return {
      kind: "quad", thicknessM: t,
      pts: [
        { x: p0, y: at - w, z: z0 }, { x: p1, y: at - w, z: z1 },
        { x: p1, y: at + w, z: z1 }, { x: p0, y: at + w, z: z0 },
      ],
    };
  }
  return {
    kind: "quad", thicknessM: t,
    pts: [
      { x: at - w, y: p0, z: z0 }, { x: at - w, y: p1, z: z1 },
      { x: at + w, y: p1, z: z1 }, { x: at + w, y: p0, z: z0 },
    ],
  };
}

interface RoofArgs {
  colXs: number[]; rowYs: number[]; body: Body; roofBaseZ: number;
  roof: ElevationGeom["roof"]; frame: { purlins: number[] } | undefined;
  firstLineByPrefix: (p: string) => string | undefined;
  sectionForLine: (id: string | undefined, m: keyof MemberSections | null) => SectionDims;
  connDetail: boolean;
  /**
   * True when the RAFTER SUPPORT system is covering the slope with a real PUF roof-panel layout, in
   * which case the generic schematic roof-sheet slab must NOT also be emitted — it is the same
   * physical covering, and the slab lies in the rafter-top plane the cleat and C-purlin now occupy.
   * The rsup panels inherit the `roof:sheet` BOQ line, so the priced line still owns exactly one set
   * of geometry. Defaults to false, so every other caller and every disabled-system build is
   * unchanged. See the decision comment in `buildColonyModel`.
   */
  suppressRoofSheet?: boolean;
}

function buildRoof(s: ModelSink, a: RoofArgs): void {
  const { body, roofBaseZ, roof } = a;
  const blockWM = body.w;
  const blockDM = body.d;
  const X0 = body.x0, Y0 = body.y0;
  const flat = roof.type === "flat";
  const mono = roof.type === "mono";
  /** A ridge exists only where two slopes MEET — a mono (single-slope) roof has none. */
  const hasRidge = !flat && !mono;
  const rise = roof.riseM;
  // Work in ABSOLUTE plan metres over the walled body (the roof spans the body + an eave overhang).
  const xLo = X0, xHi = X0 + blockWM;
  const yLo = Y0, yHi = Y0 + blockDM;
  const ridgeY = (yLo + yHi) / 2;
  const eave = roof.overhangM;
  const rafterLine = a.firstLineByPrefix("roof:rafter") ?? "roof:rafter";
  const purlinLine = a.firstLineByPrefix("roof:purlin") ?? "roof:purlin";
  const rd = a.sectionForLine(rafterLine, "roofFrame");
  const rt = Math.max(MIN_VIS, Math.max(rd.widthMm, rd.depthMm) / 1000);
  const pd = a.sectionForLine(purlinLine, "purlin");
  const pt = Math.max(MIN_VIS, Math.max(pd.widthMm, pd.depthMm) / 1000);

  // one truss at each grid column line that falls on the body (spaced along the length)
  const trussXs = roofTrussXs(a.colXs, xLo, xHi);
  const zApex = (y: number): number => {
    if (flat) return roofBaseZ + rise;
    if (mono) return roofBaseZ + (rise * (y - yLo)) / Math.max(1e-6, blockDM);
    return roofBaseZ + rise * (1 - Math.abs(y - ridgeY) / Math.max(1e-6, blockDM / 2));
  };
  trussXs.forEach((x, ti) => {
    const tag = `t${ti + 1}`;
    // bottom (tie) chord — horizontal across the width
    s.add(`roof:truss:${tag}:tie`, "rafter", `Truss ${tag} — bottom chord`,
      box(x - rt / 2, yLo, roofBaseZ - rt, x + rt / 2, yHi, roofBaseZ),
      { boqLineId: rafterLine, partMark: `T${ti + 1}`, fabrication: "shop", assemblyId: `truss:${tag}`, spec: dimsSpec(rd, blockDM) });
    // top chords
    if (flat) {
      s.add(`roof:truss:${tag}:top`, "rafter", `Truss ${tag} — top chord`,
        box(x - rt / 2, yLo, roofBaseZ + rise, x + rt / 2, yHi, roofBaseZ + rise + rt),
        { boqLineId: rafterLine, partMark: `T${ti + 1}`, fabrication: "shop", assemblyId: `truss:${tag}` });
    } else if (mono) {
      s.add(`roof:truss:${tag}:top`, "rafter", `Truss ${tag} — rafter`,
        slopeQuad(x, rt, yLo, roofBaseZ, yHi, roofBaseZ + rise, rt),
        { boqLineId: rafterLine, partMark: `T${ti + 1}`, fabrication: "shop", assemblyId: `truss:${tag}` });
    } else {
      s.add(`roof:truss:${tag}:top-a`, "rafter", `Truss ${tag} — rafter (rear)`,
        slopeQuad(x, rt, yLo, roofBaseZ, ridgeY, roofBaseZ + rise, rt),
        { boqLineId: rafterLine, partMark: `T${ti + 1}`, fabrication: "shop", assemblyId: `truss:${tag}` });
      s.add(`roof:truss:${tag}:top-b`, "rafter", `Truss ${tag} — rafter (front)`,
        slopeQuad(x, rt, ridgeY, roofBaseZ + rise, yHi, roofBaseZ, rt),
        { boqLineId: rafterLine, partMark: `T${ti + 1}`, fabrication: "shop", assemblyId: `truss:${tag}` });
      // king post + 2 diagonal web members (engineering-only synthesized)
      s.add(`roof:truss:${tag}:web:king`, "truss-web", `Truss ${tag} — king post`,
        box(x - rt / 2, ridgeY - rt / 2, roofBaseZ, x + rt / 2, ridgeY + rt / 2, roofBaseZ + rise),
        { partMark: `T${ti + 1}`, fabrication: "shop", assemblyId: `truss:${tag}` });
      // one web each side, from the ridge down to the quarter point of the tie chord
      [yLo + blockDM * 0.25, yHi - blockDM * 0.25].forEach((y1, wi) => {
        s.add(`roof:truss:${tag}:web:${wi}`, "truss-web", `Truss ${tag} — web ${wi + 1}`,
          braceQuad(false, x, ridgeY, roofBaseZ + rise, y1, roofBaseZ, rt),
          { partMark: `T${ti + 1}`, fabrication: "shop", assemblyId: `truss:${tag}` });
      });
      /* ---- FABRICATION DETAILING -------------------------------------------------------- *
       * The truss ships as ONE shop-welded unit: every internal panel point below is a fillet
       * weld (fabrication "shop"). The SITE joints are bolted — a pair of splice plates on BOTH
       * faces of the truss, drawn through with a real bolt group. Gated behind connDetail so the
       * default scene stays light; the exploded view / assembly video turn it on. */
      if (a.connDetail) {
        const asm = `truss:${tag}`;
        const apexZ = roofBaseZ + rise;
        const webFeet = [yLo + blockDM * 0.25, yHi - blockDM * 0.25];

        /* WELDS — all main joints of the ready-fabricated truss */
        const welds: { key: string; label: string; cy: number; cz: number; runY: number; runZ: number; len: number }[] = [
          { key: "apex", label: "Apex — rafter to rafter + king post", cy: ridgeY, cz: apexZ, runY: 0.16, runZ: 0.10, len: 320 },
          { key: "heel-a", label: "Heel — rafter to tie chord (rear)", cy: yLo + 0.06, cz: roofBaseZ, runY: 0.16, runZ: 0.08, len: 260 },
          { key: "heel-b", label: "Heel — rafter to tie chord (front)", cy: yHi - 0.06, cz: roofBaseZ, runY: 0.16, runZ: 0.08, len: 260 },
          { key: "king-foot", label: "King post foot to tie chord", cy: ridgeY, cz: roofBaseZ, runY: 0.12, runZ: 0.06, len: 200 },
          { key: "web-a", label: "Web to tie chord (rear)", cy: webFeet[0], cz: roofBaseZ, runY: 0.10, runZ: 0.06, len: 180 },
          { key: "web-b", label: "Web to tie chord (front)", cy: webFeet[1], cz: roofBaseZ, runY: 0.10, runZ: 0.06, len: 180 },
        ];
        for (const w of welds) {
          addWeld(s, {
            id: `roof:truss:${tag}:weld:${w.key}`,
            connectionId: `${asm}:${w.key}`,
            assemblyId: asm,
            label: `Truss ${tag} — ${w.label}`,
            cx: x, cy: w.cy, cz: w.cz, runY: w.runY, runZ: w.runZ,
            lengthMm: w.len,
            step: 17,   // erected WITH the truss, not at the default weld step
          });
        }

        /* APEX SITE SPLICE — paired plates + 4-bolt group joining the two shop-welded halves */
        addBoltedSidePlates(s, {
          idBase: `roof:truss:${tag}:conn:apex`,
          connectionId: `${asm}:apex-splice`,
          assemblyId: asm,
          label: `Truss ${tag} apex splice`,
          partMark: `SP-${ti + 1}`,
          x, memberT: rt,
          cy: ridgeY, cz: apexZ - 0.10,
          halfY: 0.13, halfZ: 0.11,
          bolts: [
            { dy: -0.06, dz: -0.05 }, { dy: 0.06, dz: -0.05 },
            { dy: -0.06, dz: 0.05 }, { dy: 0.06, dz: 0.05 },
          ],
          gaugeMm: 120, pitchMm: 100, edgeMm: 35,
          step: 17,
        });

        /* HEEL / EAVE SEATING — paired cleat plates + 4-bolt group onto each column head */
        ([[yLo + 0.10, "a"], [yHi - 0.10, "b"]] as const).forEach(([cy, key]) => {
          addBoltedSidePlates(s, {
            idBase: `roof:truss:${tag}:conn:heel-${key}`,
            connectionId: `${asm}:heel-${key}`,
            assemblyId: asm,
            label: `Truss ${tag} heel connection`,
            partMark: `CP-${ti + 1}`,
            x, memberT: rt,
            cy, cz: roofBaseZ - 0.09,
            halfY: 0.11, halfZ: 0.09,
            bolts: [
              { dy: -0.05, dz: -0.04 }, { dy: 0.05, dz: -0.04 },
              { dy: -0.05, dz: 0.04 }, { dy: 0.05, dz: 0.04 },
            ],
            gaugeMm: 100, pitchMm: 80, edgeMm: 30,
            step: 17,
          });
        });
      }
    }
  });

  // ridge member along the length — ONLY where two slopes meet (never on a mono or flat roof)
  if (hasRidge) {
    s.add("roof:ridge", "ridge", "Ridge member",
      box(xLo, ridgeY - rt / 2, roofBaseZ + rise - rt, xHi, ridgeY + rt / 2, roofBaseZ + rise),
      { boqLineId: rafterLine, partMark: "RG", fabrication: "shop" });
  }

  // purlins along the length, spaced across the width
  const nPurlin = Math.max(2, Math.round(blockDM / 1.2) + 1);
  evenSpanInclusive(yLo, yHi, nPurlin).forEach((y, i) => {
    const z = zApex(y);
    s.add(`roof:purlin:${i}`, "purlin", "Roof purlin",
      box(xLo, y - pt / 2, z, xHi, y + pt / 2, z + pt),
      { boqLineId: purlinLine, partMark: "P", fabrication: "shop", spec: dimsSpec(pd, blockWM) });
  });

  // roof sheets (quads) + ceiling — extended by the real eave overhang
  const sx0 = xLo - eave, sx1 = xHi + eave, sy0 = yLo - eave, sy1 = yHi + eave;
  if (a.suppressRoofSheet) {
    // the rafter-support system lays the real PUF roof panels — see `suppressRoofSheet`
  } else if (flat) {
    s.add("roof:sheet", "roof-sheet", "Roof sheet (flat)",
      box(sx0, sy0, roofBaseZ + rise + pt, sx1, sy1, roofBaseZ + rise + pt + 0.05), { boqLineId: "roof:sheet" });
  } else if (mono) {
    s.add("roof:sheet", "roof-sheet", "Roof sheet (mono-slope)",
      slopeQuadPlane(sx0, sx1, sy0, zApex(sy0), sy1, zApex(sy1), 0.05), { boqLineId: "roof:sheet", opacity: 0.95 });
  } else {
    s.add("roof:sheet:rear", "roof-sheet", "Roof sheet (rear slope)",
      slopeQuadPlane(sx0, sx1, sy0, zApex(sy0), ridgeY, roofBaseZ + rise, 0.05), { boqLineId: "roof:sheet", opacity: 0.95 });
    s.add("roof:sheet:front", "roof-sheet", "Roof sheet (front slope)",
      slopeQuadPlane(sx0, sx1, ridgeY, roofBaseZ + rise, sy1, zApex(sy1), 0.05), { boqLineId: "roof:sheet", opacity: 0.95 });
  }
  s.add("roof:ceiling", "ceiling", "Ceiling lining",
    box(xLo, yLo, roofBaseZ - 0.03, xHi, yHi, roofBaseZ), { boqLineId: "roof:ceiling", opacity: 0.85 });
}

/**
 * The TRUSS / RAFTER x-positions: one truss on every structural grid line that falls strictly INSIDE
 * the walled body, plus one on each body edge.
 *
 * Extracted so `buildRoof` and the rafter-support context read the SAME list. A cleat is placed where
 * a tube line crosses a rafter line, so the rafter lines handed to `deriveRafterSupport` must be the
 * rafters the model actually erects — otherwise a cleat would hang off a rafter that is not there.
 * This is the exact counterpart of the PUF-lock rule that a locking plate always lands on a real
 * plinth beam.
 */
function roofTrussXs(colXs: number[], xLo: number, xHi: number): number[] {
  const inner = colXs.filter((x) => x > xLo + 1e-3 && x < xHi - 1e-3);
  return uniqSorted([xLo, ...inner, xHi]);
}

/** A rafter as a sloped quad spanning y0..y1 at x (thin in x). */
function slopeQuad(x: number, t: number, y0: number, z0: number, y1: number, z1: number, thick: number): PartSolid {
  const w = t / 2;
  return {
    kind: "quad", thicknessM: thick,
    pts: [
      { x: x - w, y: y0, z: z0 }, { x: x - w, y: y1, z: z1 },
      { x: x + w, y: y1, z: z1 }, { x: x + w, y: y0, z: z0 },
    ],
  };
}

/** A full-width sloped roof plane from (y0,z0) to (y1,z1), spanning x0..x1. */
function slopeQuadPlane(x0: number, x1: number, y0: number, z0: number, y1: number, z1: number, thick: number): PartSolid {
  return {
    kind: "quad", thicknessM: thick,
    pts: [
      { x: x0, y: y0, z: z0 }, { x: x1, y: y0, z: z0 },
      { x: x1, y: y1, z: z1 }, { x: x0, y: y1, z: z1 },
    ],
  };
}

/* ============================================================ truss connection detailing ====
 * A roof truss is SHOP-FABRICATED: every internal panel point (apex, heels, king-post feet, web-to-
 * chord) is fully WELDED, and the finished truss is lifted in as one piece. The SITE joint is a
 * bolted one — a pair of splice / cleat plates sandwiching the truss on BOTH faces, drawn through
 * with a real bolt group (head · shank · washer · nut). That split is what these helpers model:
 * welds carry `fabrication: "shop"`, the bolted plates carry `fabrication: "site"`.
 *
 * The truss lies in a plane at constant x, so its two faces are the ±x faces and every bolt runs
 * along X. Bolt heads / nuts are drawn as across-flats boxes rather than hex prisms because
 * PartSolid's prism extrudes in Z — at this scale a box reads correctly, and the full hardware
 * specification travels in `spec` (grade, dia, grip, hole, gauge / edge / pitch) for the schedules.
 */

const TRUSS_PLATE_T = 0.010;  // 10 mm splice / gusset plate
const TRUSS_BOLT_D = 0.016;   // M16
const BOLT_HEAD_T = 0.010;
const NUT_T = 0.013;
const WASHER_T = 0.003;
const WELD_LEG = 0.006;       // 6 mm fillet leg

/** A simplified weld bead with the COMPLETE weld specification retained for the weld schedule. */
function addWeld(
  s: ModelSink,
  o: {
    id: string; connectionId: string; label: string; assemblyId: string;
    /** Bead centre + the run it follows. */
    cx: number; cy: number; cz: number; runY: number; runZ: number;
    lengthMm: number; site?: boolean; step?: ColonyAssemblyStep;
  },
): void {
  const half = WELD_LEG;
  const ly = Math.max(half, Math.abs(o.runY) / 2);
  const lz = Math.max(half, Math.abs(o.runZ) / 2);
  s.add(
    o.id, "weld", o.label,
    box(o.cx - half * 1.2, o.cy - ly, o.cz - lz, o.cx + half * 1.2, o.cy + ly, o.cz + lz),
    {
      connectionId: o.connectionId,
      assemblyId: o.assemblyId,
      partMark: "W1",
      assemblyStep: o.step,
      fabrication: o.site ? "site" : "shop",
      spec: {
        weldSpec: `${WELD_LEG * 1000} mm fillet · ${o.site ? "site" : "shop"} weld · continuous`,
        weldLengthMm: Math.round(o.lengthMm),
        note: "Fillet weld both sides at panel point",
      },
    },
  );
}

/** One complete bolt assembly — head · shank · washer · nut — through an X-axis sandwiched joint. */
function addBoltAssembly(
  s: ModelSink,
  o: {
    id: string; connectionId: string; assemblyId: string; label: string;
    /** Outer faces of the two side plates (the grip). */
    xOuter0: number; xOuter1: number;
    cy: number; cz: number;
    dia: number; boltSpec: string; holeDiaMm: number; floor?: number; step?: ColonyAssemblyStep;
  },
): void {
  const r = o.dia / 2;
  const af = o.dia * 1.6 / 2;          // half across-flats for head / nut
  const proj = 0.006;                  // thread projection past the nut
  const gripMm = Math.round((o.xOuter1 - o.xOuter0) * 1000);
  const common = {
    connectionId: o.connectionId,
    assemblyId: o.assemblyId,
    floor: o.floor,
    fabrication: "site" as const,
    assemblyStep: o.step,
  };
  const spec: PartSpec = {
    boltSpec: o.boltSpec,
    holeDiaMm: o.holeDiaMm,
    thicknessMm: gripMm,
    note: `Grip ${gripMm} mm · one washer + one nut per bolt`,
  };
  /* ONE part per physical fastener. The head is integral to the bolt, not a separate item — drawing
   * it as its own `bolt` part would make every schedule count two bolts per hole and then report a
   * false "nuts ≠ bolts" mismatch. The bolt therefore spans head-bearing face → thread projection,
   * and the washer + nut at the far end carry the visual hardware read. */
  s.add(`${o.id}:shank`, "bolt", o.label,
    box(o.xOuter0 - BOLT_HEAD_T, o.cy - r, o.cz - r, o.xOuter1 + WASHER_T + NUT_T + proj, o.cy + r, o.cz + r),
    {
      ...common,
      partMark: "B",
      spec: { ...spec, note: `${spec.note} · head bears on the near plate face` },
      explode: { x: 1.2, y: 0, z: 0.25 },
    });
  void af;
  // washer then nut on the far face (engineering order)
  s.add(`${o.id}:washer`, "washer", `${o.label} — washer`,
    box(o.xOuter1, o.cy - o.dia, o.cz - o.dia, o.xOuter1 + WASHER_T, o.cy + o.dia, o.cz + o.dia),
    { ...common, partMark: "W", spec, explode: { x: 1.9, y: 0, z: 0.25 } });
  s.add(`${o.id}:nut`, "nut", `${o.label} — nut`,
    box(o.xOuter1 + WASHER_T, o.cy - af, o.cz - af, o.xOuter1 + WASHER_T + NUT_T, o.cy + af, o.cz + af),
    { ...common, partMark: "N", spec, explode: { x: 2.3, y: 0, z: 0.25 } });
}

/**
 * A bolted connection: TWO side plates (one on each face of the truss) plus its bolt group. The
 * plates explode in OPPOSITE directions so the exploded view reads as a sandwich coming apart.
 */
function addBoltedSidePlates(
  s: ModelSink,
  o: {
    idBase: string; connectionId: string; assemblyId: string; label: string; partMark: string;
    /** Truss plane + member thickness (the plates clamp this). */
    x: number; memberT: number;
    cy: number; cz: number;
    halfY: number; halfZ: number;               // plate half-size
    bolts: { dy: number; dz: number }[];        // bolt offsets from the joint centre
    gaugeMm: number; pitchMm: number; edgeMm: number;
    floor?: number; step?: ColonyAssemblyStep;
  },
): void {
  const inner = o.memberT / 2;
  const nearOuter = o.x - inner - TRUSS_PLATE_T;
  const farOuter = o.x + inner + TRUSS_PLATE_T;
  const holeDiaMm = Math.round(TRUSS_BOLT_D * 1000) + 2;
  const boltSpec = `M${Math.round(TRUSS_BOLT_D * 1000)} gr 8.8`;
  const plateSpec: PartSpec = {
    widthMm: Math.round(o.halfY * 2000),
    heightMm: Math.round(o.halfZ * 2000),
    thicknessMm: Math.round(TRUSS_PLATE_T * 1000),
    boltCount: o.bolts.length,
    holeDiaMm,
    boltSpec,
    weldSpec: `${WELD_LEG * 1000} mm fillet · shop weld to member`,
    note: `Gauge ${o.gaugeMm} mm · pitch ${o.pitchMm} mm · edge distance ${o.edgeMm} mm`,
  };
  ([
    ["near", nearOuter, o.x - inner, -1],
    ["far", o.x + inner, farOuter, 1],
  ] as const).forEach(([side, x0, x1, dir]) => {
    s.add(`${o.idBase}:plate-${side}`, "splice-plate", `${o.label} — ${side} side plate`,
      box(x0, o.cy - o.halfY, o.cz - o.halfZ, x1, o.cy + o.halfY, o.cz + o.halfZ),
      {
        connectionId: o.connectionId,
        assemblyId: o.assemblyId,
        partMark: o.partMark,
        floor: o.floor,
        fabrication: "site",
        assemblyStep: o.step,
        spec: plateSpec,
        explode: { x: dir * 1.5, y: 0, z: 0.3 },
      });
  });
  o.bolts.forEach((b, i) => {
    addBoltAssembly(s, {
      id: `${o.idBase}:bolt:${i + 1}`,
      connectionId: o.connectionId,
      assemblyId: o.assemblyId,
      label: `${o.label} — bolt ${i + 1}`,
      xOuter0: nearOuter,
      xOuter1: farOuter,
      cy: o.cy + b.dy,
      cz: o.cz + b.dz,
      dia: TRUSS_BOLT_D,
      boltSpec,
      holeDiaMm,
      floor: o.floor,
      step: o.step,
    });
  });
}

/* ==================================================== DECK ENGINEERING DETAIL =================
 * The priced take-off puts joists in the floor and buys a deck area. What it cannot say is whether
 * that steel actually CARRIES an 8'×4' sheet — and a sheet whose edge lands mid-bay has no bearing,
 * so it deflects, the joint telegraphs through the finish and the fixings work loose. This section
 * closes that gap.
 *
 * WHERE THE SHEETS GO — upper decks (floors 1+) ONLY. The ground floor bears on the filled plinth,
 * so it needs no 8'×4' sheet field; the numbered setting-out, and the bearers that exist only to
 * support its joints, are laid on the first and second floor decks. The perimeter C-bend and the
 * joist-end connection detail stay on every deck including the ground floor, because the rim and
 * the joist bolting are real on every storey.
 *
 *   1. it measures the support the priced frame provides and sets the sheets out on it one by one;
 *   2. it adds the PERIMETER C-BEND, which is what gives the outer sheet edge something to sit on
 *      (a joist stops at the last grid line — the deck edge beyond it would otherwise cantilever);
 *   3. it adds a NOGGIN wherever the layout proves a cross joint has no member under it;
 *   4. it bolts the joists down through shop-welded cleats, so the load path from sheet to footing
 *      is complete and visible.
 *
 * Everything here is engineering detail the take-off does not itemise, so every part carries
 * `boqSource: "none"` — the priced `floor:board` line stays the single source of truth for cost.
 */

const CBEND_GAUGE = 0.003;      // 3 mm cold-formed C-bend
const CBEND_FLANGE = 0.04;      // 40 mm flange — the bearing ledge the outer sheet edge sits on
const CBEND_LIP = 0.015;        // 15 mm return lip — what makes it stiff in torsion
const CLEAT_T = 0.008;          // 8 mm joist-end cleat
const DECK_BOLT_D = 0.012;      // M12
const SHEET_JOINT = 0.003;      // 3 mm expansion gap between laid sheets

interface DeckArgs {
  body: Body;
  floors: number;
  fflOf: (f: number) => number;
  joistXs: number[];
  joistBayYs: number[];
  colXs: number[];
  rowYs: number[];
  joistWM: number;
  joistHM: number;
  connDetail: boolean;
  /** Per-project opt-in: lay the 8'×4' sheet field on the GROUND floor too (default false). */
  gfSheetField: boolean;
}

function buildDeckSystem(s: ModelSink, a: DeckArgs): SheetLayoutResult {
  const { body, joistWM, joistHM } = a;
  const inBodyX = (v: number) => v >= body.x0 - 1e-6 && v <= body.x1 + 1e-6;
  const inBodyY = (v: number) => v >= body.y0 - 1e-6 && v <= body.y1 + 1e-6;

  /* The support the frame ACTUALLY provides.
   *   xs — every member running across the deck (joists + transverse base beams) gives a support
   *        LINE at its own x, which is what a sheet edge parallel to y can land on;
   *   ys — every member running along the deck (longitudinal base beams on the grid rows). These
   *        are on the COLUMN GRID, metres apart, which is exactly why cross joints need noggins. */
  const supportXs = uniqSorted([body.x0, body.x1, ...a.joistXs.filter(inBodyX), ...a.colXs.filter(inBodyX)]);
  /* The MS pipe frame's tubes are real Y-direction support lines: they run across the rafters at a
   * sheet-modular 1220 mm on EVERY deck, so the 8 ft sheet-end joints land on tube centrelines and
   * most transverse bearers become unnecessary. Same derivation as the emitted tubes (floorTubeLineYs, shared with the priced take-off). */
  const supportYs = uniqSorted([
    body.y0, body.y1, ...a.rowYs.filter(inBodyY), ...a.joistBayYs.filter(inBodyY),
    ...floorTubeLineYs(body.y0, body.y1).filter(inBodyY),
  ]);

  const layout = buildSheetLayout({
    x0: body.x0, y0: body.y0, x1: body.x1, y1: body.y1,
    support: { xs: supportXs, ys: supportYs },
    memberWidthM: joistWM,
  });

  /* ---- deterministic engineering warnings (never silently "fix" the frame) ------------------ *
   * Gated on ANY deck actually carrying the sheet field: floors 1+ always do, the ground floor only
   * when the per-project `gfSheetField` opt-in is on (the company default is that the ground floor
   * bears on the filled plinth). A colony laying no field anywhere has nothing to defect against. */
  const anySheetedDeck = a.floors > 1 || a.gfSheetField;
  if (anySheetedDeck && !layout.spacing.modular) {
    s.warn({
      code: "sheet-spacing-not-modular",
      required: round(layout.spacing.recommendedMm, 1),
      available: round(layout.spacing.actualMm, 1),
      message:
        `Floor support members are at ${layout.spacing.actualMm.toFixed(0)} mm centres, which does not `
        + `divide the ${SHEET_LABEL} sheet. Sheet joints will not all land on steel. Re-space the joists `
        + `to ${layout.spacing.recommendedMm.toFixed(1)} mm centres (joistSpacingM in the BOQ norms) so `
        + `every joint bears. ${layout.bearers.length} bearer line(s) have been added as the interim `
        + `fix, of which ${layout.bearersAvoidableBySpacing} would be unnecessary at the recommended spacing.`,
    });
  }
  if (anySheetedDeck && layout.edgeBearingMm < MIN_EDGE_BEARING_MM) {
    s.warn({
      code: "sheet-edge-bearing-short",
      required: MIN_EDGE_BEARING_MM,
      available: round(layout.edgeBearingMm, 1),
      message:
        `A sheet joint landing on the ${Math.round(joistWM * 1000)} mm joist gives only `
        + `${layout.edgeBearingMm.toFixed(1)} mm bearing per sheet (minimum ${MIN_EDGE_BEARING_MM} mm). `
        + `Widen the joist to at least ${MIN_EDGE_BEARING_MM * 2} mm on the top face, or run a cover `
        + `cleat under every joint.`,
    });
  }

  const zTopOf = (z: number) => z + DECK_T;
  /* The floor zone now stacks rafter chord → MS tube → deck, so the deck edge member and the
   * joist-end connections sit one tube lower than the deck soffit. */
  const zBotOf = (z: number) => z - FLOOR_TUBE_H - RAFTER_SEAT_GAP - joistHM;

  for (let f = 0; f < a.floors; f++) {
    const z = a.fflOf(f);
    const tag = f === 0 ? "gf" : `f${f}`;
    const zBot = zBotOf(z), zTop = zTopOf(z);

    /* ---- 1. PERIMETER C-BEND — the edge member the whole deck edge depends on --------------- */
    addPerimeterCBend(s, { tag, floor: f, body, zBot, zTop });

    /* THE 8'×4' SHEET FIELD IS LAID ON THE UPPER DECKS by default. The ground floor bears on the
     * filled plinth, so it normally takes no sheet setting-out — and therefore none of the bearers
     * whose only job is to close that field's joints — unless the per-project `gfSheetField` opt-in
     * says this job wants it. The GF always keeps its C-bend (deck edge rim + panel seat) and its
     * priced board/finish; only the UNPRICED numbered setting-out is gated, so what the deck costs
     * (`floor:board`) is untouched either way. */
    if (f >= 1 || a.gfSheetField) {

    /* ---- 2. BEARERS under every sheet joint the priced frame does not already carry --------- *
     * Cut between the members either side of the joint, so each bearer is a real fabricable piece
     * with a real cut length rather than a line drawn across the whole deck. */
    layout.bearers.forEach((bearer, bi) => {
      const cross = bearer.axis === "x" ? supportYs : supportXs;
      for (let i = 0; i < cross.length - 1; i++) {
        const c0 = cross[i], c1 = cross[i + 1];
        if (c1 - c0 < 1e-3) continue;
        const half = joistWM / 2;
        const solid = bearer.axis === "x"
          /* fixed X, runs along Y — supports a sheet edge parallel to Y */
          ? box(bearer.atM - half, c0, zBot, bearer.atM + half, c1, z)
          /* fixed Y, runs along X — supports a sheet edge parallel to X */
          : box(c0, bearer.atM - half, zBot, c1, bearer.atM + half, z);
        s.add(
          `${tag}:noggin:${bearer.axis}:${pad2(bi + 1)}:${pad2(i + 1)}`,
          "noggin",
          `Sheet bearer — ${bearer.axis === "x" ? "longitudinal" : "transverse"} joint at ${bearer.atM.toFixed(3)} m`,
          solid,
          {
            floor: f,
            partMark: "NG",
            fabrication: "site",
            assemblyId: `${tag}:deck`,
            spec: {
              widthMm: Math.round(joistWM * 1000),
              heightMm: Math.round(joistHM * 1000),
              lengthM: round(c1 - c0, 3),
              bearingMm: round(layout.edgeBearingMm, 1),
              role:
                "Sheet-edge support. This sheet joint falls between two members of the priced frame, "
                + "so without this bearer both sheet edges at the joint are unsupported and will "
                + "deflect, telegraph through the finish and work their fixings loose.",
              loadPath:
                "Sheet edge load → bearer → welded/bolted to the two adjacent members → base beam → "
                + "column → base plate → footing.",
              note:
                `${bearer.reason}. ${layout.spacing.modular
                  ? ""
                  : `A ${layout.spacing.recommendedMm.toFixed(1)} mm joist spacing would remove `
                    + `${layout.bearersAvoidableBySpacing} bearer line(s) of this kind entirely.`}`,
            },
          },
        );
      }
    });

    /* ---- 3. THE SHEETS THEMSELVES, numbered in laying sequence ------------------------------ */
    for (const sh of layout.sheets) {
      const g = SHEET_JOINT / 2;
      s.add(
        `${tag}:floor-sheet:${pad2(sh.no)}`,
        "floor-sheet",
        `Deck sheet ${sh.mark}${sh.full ? "" : " (cut)"}`,
        box(sh.x0 + g, sh.y0 + g, z, sh.x1 - g, sh.y1 - g, zTop + 0.001),
        {
          floor: f,
          partMark: sh.mark,
          fabrication: "site",
          assemblyId: `${tag}:deck`,
          spec: {
            sheetMark: sh.mark,
            sheetFull: sh.full,
            widthMm: sh.widthMm,
            heightMm: sh.lengthMm,
            thicknessMm: Math.round(DECK_T * 1000),
            supportSpacingMm: round(layout.spacing.actualMm, 1),
            bearingMm: round(layout.edgeBearingMm, 1),
            role: sh.full
              ? `Full ${SHEET_LABEL} sheet, laid ${sh.supportedEdges}/4 edges on steel.`
              : `Cut sheet ${sh.widthMm} × ${sh.lengthMm} mm (cut on ${sh.cutOn}), `
                + `${sh.offcutM2.toFixed(2)} m² offcut.`,
            loadPath: "Sheet → joist / noggin top face → base beam → column → base plate → footing.",
            note:
              `Laying sequence ${sh.no} of ${layout.sheets.length}. `
              + `${SHEET_JOINT * 1000} mm expansion gap at every joint; fixings at 150 mm c/c on edges, `
              + `300 mm c/c at intermediate supports.`,
          },
        },
      );
    }

    } // end sheet field gate (floors 1+ always; GF only via gfSheetField)

    /* ---- 4. JOIST-END CONNECTIONS — shop-welded cleat, site-bolted joist -------------------- *
     * FIRST floor: the transverse rafter field lives on the upper decks, so this is where its
     * end-cleat detail is sampled. The GROUND floor no longer has a transverse field at all — its
     * removable joints are the side-rafter hold-downs and the tube-to-base-beam crossings, emitted
     * with the members themselves. Higher storeys repeat the identical detail, so they are not
     * multiplied out. */
    if (a.connDetail && f === 1) {
      a.joistXs.forEach((x, i) => {
        for (let b = 0; b < a.joistBayYs.length - 1; b++) {
          const ends: [number, number][] = [[a.joistBayYs[b], 1], [a.joistBayYs[b + 1], -1]];
          ends.forEach(([yEnd, dir], e) => {
            /* A rafter end ON THE WALL LINE gets the photographed site connection — MS end plate
             * bolted through the C wall purlin; interior ends (internal beam lines) keep the
             * shop-welded cleat + site-bolted joint. */
            const atWall = Math.abs(yEnd - body.y0) < 1e-3 || Math.abs(yEnd - body.y1) < 1e-3;
            if (atWall) {
              addRafterEndPlate(s, {
                idBase: `${tag}:conn:rend:${pad2(i + 1)}:${pad2(b + 1)}:${e === 0 ? "a" : "b"}`,
                connectionId: `rend:${tag}:${pad2(i + 1)}:${pad2(b + 1)}:${e === 0 ? "a" : "b"}`,
                assemblyId: `${tag}:deck`,
                label: `Floor ${f} rafter ${i + 1} wall end`,
                axis: "y", at: yEnd, dir: dir as 1 | -1, cross: x,
                z, memberWM: joistWM, memberHM: joistHM, floor: f,
              });
              return;
            }
            const idBase = `${tag}:conn:joist:${pad2(i + 1)}:${pad2(b + 1)}:${e === 0 ? "a" : "b"}`;
            /* Floor-tagged connection ids, so a first-floor cleat can never join another storey's
             * connection group. */
            const connectionId = `joist:${tag}:${pad2(i + 1)}:${pad2(b + 1)}:${e === 0 ? "a" : "b"}`;
            const cz = z - FLOOR_TUBE_H - RAFTER_SEAT_GAP - joistHM / 2;
            const cy = yEnd + dir * 0.05;
            addBoltedJoistCleat(s, {
              idBase, connectionId,
              assemblyId: `${tag}:deck`,
              label: `Floor ${f} joist ${i + 1} end cleat`,
              x, memberT: joistWM,
              cy, cz,
              halfY: 0.045, halfZ: Math.max(0.03, joistHM / 2 - 0.01),
              floor: f,
            });
          });
        }
      });
    }
  }

  return layout;
}

/**
 * The perimeter C-bend, modelled as the three folds it is actually made from — web, top flange (the
 * bearing ledge), bottom flange — plus the return lip that makes it stiff. Drawing it as one solid
 * box would hide the very thing the detail exists to show: that the sheet edge lands on a FLANGE,
 * not on the edge of a plate.
 *
 * The LEFT edge is called out separately because it is the one the erection sequence starts from and
 * the one the drawing set details — its spec carries the full "why it is here" text.
 */
function addPerimeterCBend(
  s: ModelSink,
  o: { tag: string; floor: number; body: Body; zBot: number; zTop: number },
): void {
  const { body, zBot, zTop } = o;
  const depth = Math.max(0.05, zTop - zBot);

  const EDGES = [
    { key: "left", axis: "y" as const, at: body.x0, inward: 1, mark: "CB1", first: true },
    { key: "right", axis: "y" as const, at: body.x1, inward: -1, mark: "CB2", first: false },
    { key: "rear", axis: "x" as const, at: body.y0, inward: 1, mark: "CB3", first: false },
    { key: "front", axis: "x" as const, at: body.y1, inward: -1, mark: "CB4", first: false },
  ];

  for (const e of EDGES) {
    const runM = e.axis === "y" ? body.d : body.w;
    const spec: PartSpec = {
      sectionSize: `MS C-bend ${Math.round(depth * 1000)} × ${CBEND_FLANGE * 1000} × ${CBEND_LIP * 1000} × ${CBEND_GAUGE * 1000} mm`,
      thicknessMm: CBEND_GAUGE * 1000,
      widthMm: CBEND_FLANGE * 1000,
      heightMm: Math.round(depth * 1000),
      lengthM: round(runM, 3),
      role:
        "EDGE SUPPORT + PERIMETER MEMBER + PANEL SEAT + STIFFENER — one section doing four jobs. "
        + "(1) Edge support: its top flange is a continuous bearing ledge for the outer sheet edge, "
        + "which has no joist beyond the last grid line. (2) Perimeter member: it closes the deck "
        + "edge and ties every joist end into one rim, so a point load is shared across several "
        + "joists instead of punching one. (3) Panel seat: its upstand carries the PUF base track, "
        + "so the wall lands on steel, not on the sheet edge. (4) Stiffener: the return lip raises "
        + "the section's torsional stiffness so the free edge cannot roll under the eccentric load "
        + "of the wall and handrail standing on it.",
      loadPath:
        "Sheet edge + wall base load → C-bend top flange (bearing) → C-bend web (acting as a rim "
        + "beam spanning column to column) → bolted end cleat → base beam → column → base plate → "
        + "anchor bolts → pedestal → footing.",
      note: e.first
        ? "FIRST C-BEND — the left-hand edge member. Erection starts here: it is set, levelled and "
          + "bolted before any joist, because every joist end and the whole sheet setting-out is "
          + "measured from this line."
        : `Perimeter edge member — ${e.key} edge.`,
    };

    /* The three folds. All share one assemblyId so they fly in together as the single section they
     * physically are, and one connectionId so selecting any fold highlights the whole member. */
    const folds: { part: string; solid: PartSolid; label: string }[] = [];
    if (e.axis === "y") {
      const xWeb0 = e.inward > 0 ? e.at - CBEND_GAUGE : e.at;
      const xWeb1 = xWeb0 + CBEND_GAUGE;
      const fx0 = e.inward > 0 ? xWeb0 : xWeb1 - CBEND_FLANGE;
      const fx1 = fx0 + CBEND_FLANGE;
      folds.push(
        { part: "web", label: "web", solid: box(xWeb0, body.y0, zBot, xWeb1, body.y1, zTop) },
        { part: "flange-top", label: "top flange (sheet bearing ledge)", solid: box(fx0, body.y0, zTop - CBEND_GAUGE, fx1, body.y1, zTop) },
        { part: "flange-bot", label: "bottom flange", solid: box(fx0, body.y0, zBot, fx1, body.y1, zBot + CBEND_GAUGE) },
      );
    } else {
      const yWeb0 = e.inward > 0 ? e.at - CBEND_GAUGE : e.at;
      const yWeb1 = yWeb0 + CBEND_GAUGE;
      const fy0 = e.inward > 0 ? yWeb0 : yWeb1 - CBEND_FLANGE;
      const fy1 = fy0 + CBEND_FLANGE;
      folds.push(
        { part: "web", label: "web", solid: box(body.x0, yWeb0, zBot, body.x1, yWeb1, zTop) },
        { part: "flange-top", label: "top flange (sheet bearing ledge)", solid: box(body.x0, fy0, zTop - CBEND_GAUGE, body.x1, fy1, zTop) },
        { part: "flange-bot", label: "bottom flange", solid: box(body.x0, fy0, zBot, body.x1, fy1, zBot + CBEND_GAUGE) },
      );
    }

    for (const fold of folds) {
      s.add(
        `${o.tag}:c-bend:${e.key}:${fold.part}`,
        "c-channel",
        `${e.first ? "First C-bend" : "Perimeter C-bend"} — ${e.key} ${fold.label}`,
        fold.solid,
        {
          floor: o.floor,
          partMark: e.mark,
          fabrication: "shop",
          assemblyId: `${o.tag}:c-bend:${e.key}`,
          connectionId: `${o.tag}:c-bend:${e.key}`,
          explode: e.axis === "y"
            ? { x: -e.inward * 1.4, y: 0, z: -0.2 }
            : { x: 0, y: -e.inward * 1.4, z: -0.2 },
          spec,
        },
      );
    }
  }
}

/**
 * A joist-end connection: ONE cleat plate shop-welded to the beam, with the joist site-bolted to it.
 *
 * That split is the point of the detail — the cleat is fabricated in the shop where a weld can be
 * made properly, and the only site operation is a bolt, which needs no power, no skill certificate
 * and can be inspected by eye. Every bolt is emitted through `addBoltAssembly` so the model keeps
 * exactly one nut and one washer per bolt (the schedules assert that parity globally).
 */
/**
 * RAFTER END → C WALL PURLIN connection (the photographed site detail): the rafter end is seated in
 * an MS END PLATE that is SHOP-welded to the rafter and SITE-bolted through the web of the perimeter
 * C member ("C wall purlin" — the deck's C-bend edge run). Two bolts, nuts and washers on the far
 * side of the web — a removable joint, like every site joint in this building.
 *
 * `axis` is the direction the rafter RUNS (the plate stands perpendicular to it at the wall line):
 * "y" for the transverse field rafters ending on the side walls, "x" for the ground-floor side
 * rafters ending on the end walls. `dir` points INTO the body from the wall line at `at`.
 */
function addRafterEndPlate(
  s: ModelSink,
  o: {
    idBase: string; connectionId: string; assemblyId: string; label: string;
    axis: "x" | "y"; at: number; dir: 1 | -1; cross: number;
    z: number; memberWM: number; memberHM: number; floor: number;
    /** True for the GF side rafters, whose top chord sits AT the deck soffit (above the pipe line)
     *  rather than one tube below it like a field rafter that carries pipes over it. */
    flushTop?: boolean;
  },
): void {
  const pT = 0.008;
  const pw = Math.max(0.1, o.memberWM + 0.05);
  const chordTop = o.z - (o.flushTop ? 0 : FLOOR_TUBE_H + RAFTER_SEAT_GAP);
  const zTop = chordTop + 0.01;
  const zBot = chordTop - o.memberHM - 0.03;
  const boltSpec = "M12 gr 8.8";

  /* An axis-aware box: `a0..a1` along the run axis, `c0..c1` across it. */
  const axBox = (a0: number, a1: number, c0: number, c1: number, zLo: number, zHi: number): PartSolid =>
    o.axis === "y"
      ? box(c0, Math.min(a0, a1), zLo, c1, Math.max(a0, a1), zHi)
      : box(Math.min(a0, a1), c0, zLo, Math.max(a0, a1), c1, zHi);

  /* end plate — hard against the inside face of the C purlin web */
  const p0 = o.at + o.dir * CBEND_GAUGE;
  const p1 = p0 + o.dir * pT;
  s.add(`${o.idBase}:plate`, "end-plate", `${o.label} — MS end plate to C wall purlin`,
    axBox(p0, p1, o.cross - pw / 2, o.cross + pw / 2, zBot, zTop),
    {
      connectionId: o.connectionId, assemblyId: o.assemblyId, partMark: "EP", floor: o.floor,
      fabrication: "shop", assemblyStep: 8,
      spec: {
        widthMm: Math.round(pw * 1000), heightMm: Math.round((zTop - zBot) * 1000), thicknessMm: 8,
        boltCount: 2, boltSpec,
        role: "Seats the rafter end and carries its reaction into the C wall purlin.",
        loadPath: "Rafter end → MS end plate → site bolts → C wall purlin web → beam → column → footing.",
        note: "SHOP-welded to the rafter end; SITE-bolted through the C wall purlin web — undo the "
          + "two nut-bolts and the rafter lifts out. The photographed site connection.",
      },
    });

  /* two site bolts through plate + C web, nut + washer on the FAR (outside) face of the web */
  ([-1, 1] as const).forEach((sgn, i) => {
    const cz = (zTop + zBot) / 2 + sgn * Math.min(0.035, o.memberHM * 0.3);
    const bOut = o.at - o.dir * 0.024;               // thread projection past the nut, outside the web
    const bIn = p1 + o.dir * 0.012;                  // into the rafter end
    s.add(`${o.idBase}:bolt:${i + 1}`, "bolt", `${o.label} — bolt ${i + 1} (${boltSpec})`,
      axBox(bOut, bIn, o.cross - 0.006, o.cross + 0.006, cz - 0.006, cz + 0.006),
      { connectionId: o.connectionId, assemblyId: o.assemblyId, floor: o.floor, fabrication: "site", assemblyStep: 8,
        spec: { boltSpec, note: "Through the end plate AND the C wall purlin web." } });
    s.add(`${o.idBase}:washer:${i + 1}`, "washer", `${o.label} — washer ${i + 1}`,
      axBox(o.at - o.dir * 0.003, o.at - o.dir * 0.006, o.cross - 0.012, o.cross + 0.012, cz - 0.012, cz + 0.012),
      { connectionId: o.connectionId, assemblyId: o.assemblyId, floor: o.floor, fabrication: "site", assemblyStep: 8 });
    s.add(`${o.idBase}:nut:${i + 1}`, "nut", `${o.label} — nut ${i + 1}`,
      axBox(o.at - o.dir * 0.006, o.at - o.dir * 0.016, o.cross - 0.0095, o.cross + 0.0095, cz - 0.0095, cz + 0.0095),
      { connectionId: o.connectionId, assemblyId: o.assemblyId, floor: o.floor, fabrication: "site", assemblyStep: 8 });
  });
}

function addBoltedJoistCleat(
  s: ModelSink,
  o: {
    idBase: string; connectionId: string; assemblyId: string; label: string;
    x: number; memberT: number;
    cy: number; cz: number;
    halfY: number; halfZ: number;
    floor: number;
  },
): void {
  const holeDiaMm = Math.round(DECK_BOLT_D * 1000) + 2;
  const boltSpec = `M${Math.round(DECK_BOLT_D * 1000)} gr 8.8`;
  const nearOuter = o.x - o.memberT / 2 - CLEAT_T;

  s.add(
    `${o.idBase}:cleat`, "cleat", `${o.label} — cleat plate`,
    box(nearOuter, o.cy - o.halfY, o.cz - o.halfZ, o.x - o.memberT / 2, o.cy + o.halfY, o.cz + o.halfZ),
    {
      connectionId: o.connectionId,
      assemblyId: o.assemblyId,
      partMark: "CL",
      floor: o.floor,
      fabrication: "shop",
      assemblyStep: 8,
      explode: { x: -1.3, y: 0, z: 0.2 },
      spec: {
        widthMm: Math.round(o.halfY * 2000),
        heightMm: Math.round(o.halfZ * 2000),
        thicknessMm: Math.round(CLEAT_T * 1000),
        boltCount: 2,
        holeDiaMm,
        boltSpec,
        weldSpec: `${WELD_LEG * 1000} mm fillet · shop weld to the beam web`,
        role: "Carries the joist end reaction into the supporting beam and holds the joist upright.",
        loadPath: "Joist end shear → bolts → cleat → shop weld → beam web → column.",
        note: "Cleat is SHOP-welded to the beam; the joist is SITE-bolted to the cleat.",
      },
    },
  );

  /* The shop weld that fixes the cleat to the beam. */
  addWeld(s, {
    id: `${o.idBase}:weld`,
    connectionId: o.connectionId,
    assemblyId: o.assemblyId,
    label: `${o.label} — cleat to beam fillet weld`,
    cx: nearOuter + CLEAT_T / 2,
    cy: o.cy,
    cz: o.cz,
    runY: o.halfY * 2,
    runZ: 0.01,
    lengthMm: Math.round(o.halfY * 2000),
    step: 8,
  });

  /* Two bolts, vertically pitched — one bolt would let the joist rotate about it. */
  ([-1, 1] as const).forEach((sgn, i) => {
    addBoltAssembly(s, {
      id: `${o.idBase}:bolt:${i + 1}`,
      connectionId: o.connectionId,
      assemblyId: o.assemblyId,
      label: `${o.label} — bolt ${i + 1}`,
      xOuter0: nearOuter,
      xOuter1: o.x + o.memberT / 2,
      cy: o.cy,
      cz: o.cz + sgn * Math.min(0.035, o.halfZ * 0.55),
      dia: DECK_BOLT_D,
      boltSpec,
      holeDiaMm,
      floor: o.floor,
      step: 8,
    });
  });
}

/* ==================================================== PUF PANEL SEATING SYSTEM ================
 * How the sandwich panels are HELD. See model/panelSupport.ts for the engineering rationale — this
 * only places the sections the spec derives, sized to whatever panel thickness the calculator is
 * configured with. Engineering detail, never priced: the panel itself is already bought as
 * `${face}:cladding`, and these are the MS sections that receive it.
 */

interface PanelSeatArgs {
  body: Body;
  floors: number;
  fflOf: (f: number) => number;
  ceilOf: (f: number) => number;
  colXs: number[];
  spec: PanelSupportSpec;
  connDetail: boolean;
}

function buildPanelSeating(s: ModelSink, a: PanelSeatArgs): void {
  const { body, spec } = a;
  const slot = spec.slotWidthMm / 1000;
  const baseLeg = spec.seats[0].legMm / 1000;
  const jambLeg = spec.seats[1].legMm / 1000;
  const headLeg = spec.seats[2].legMm / 1000;
  const gauge = spec.seats[0].gaugeMm / 1000;

  const FACES = [
    { key: "left", axis: "y" as const, at: body.x0, inward: 1 },
    { key: "right", axis: "y" as const, at: body.x1, inward: -1 },
    { key: "rear", axis: "x" as const, at: body.y0, inward: 1 },
    { key: "front", axis: "x" as const, at: body.y1, inward: -1 },
  ];

  for (let f = 0; f < a.floors; f++) {
    const z0 = a.fflOf(f) + DECK_T;   // the track sits ON the finished deck
    const z1 = a.ceilOf(f);
    const tag = f === 0 ? "gf" : `f${f}`;

    for (const face of FACES) {
      const common = {
        floor: f,
        fabrication: "shop" as const,
        assemblyId: `${tag}:panel-seat:${face.key}`,
      };

      /* ---- BASE TRACK (U-channel) — the panel is dropped into this first ------------------- */
      const seatBase = spec.seats[0];
      const uSolid = face.axis === "y"
        ? box(face.at, body.y0, z0, face.at + face.inward * slot, body.y1, z0 + baseLeg)
        : box(body.x0, face.at, z0, body.x1, face.at + face.inward * slot, z0 + baseLeg);
      s.add(
        `${tag}:u-track:${face.key}`, "u-channel",
        `PUF base track (U-channel) — ${face.key}`,
        normBox(uSolid),
        {
          ...common,
          partMark: "UT",
          explode: face.axis === "y"
            ? { x: -face.inward * 1.1, y: 0, z: -0.4 }
            : { x: 0, y: -face.inward * 1.1, z: -0.4 },
          spec: {
            sectionSize: seatBase.sectionCall,
            slotWidthMm: spec.slotWidthMm,
            minInsertionMm: seatBase.minInsertionMm,
            thicknessMm: seatBase.gaugeMm,
            lengthM: round(face.axis === "y" ? body.d : body.w, 3),
            role: seatBase.role,
            loadPath: seatBase.loadPath,
            note:
              `${spec.thicknessMm} mm panel → ${spec.slotWidthMm} mm slot `
              + `(${spec.clearanceMm} mm free play). Bolt down at ${spec.fixingPitchMm} mm c/c, `
              + `${spec.fixingPitchCornerMm} mm within 300 mm of a corner. STEP 1 of the lock sequence.`,
          },
        },
      );

      /* ---- HEAD RESTRAINT (angle) — fixed LAST so the panel is never wedged --------------- */
      const seatHead = spec.seats[2];
      const aSolid = face.axis === "y"
        ? box(face.at, body.y0, z1 - headLeg, face.at + face.inward * gauge, body.y1, z1)
        : box(body.x0, face.at, z1 - headLeg, body.x1, face.at + face.inward * gauge, z1);
      s.add(
        `${tag}:head-angle:${face.key}`, "angle-support",
        `PUF head restraint (angle) — ${face.key}`,
        normBox(aSolid),
        {
          ...common,
          partMark: "HA",
          explode: face.axis === "y"
            ? { x: -face.inward * 1.1, y: 0, z: 0.9 }
            : { x: 0, y: -face.inward * 1.1, z: 0.9 },
          spec: {
            sectionSize: seatHead.sectionCall,
            slotWidthMm: spec.slotWidthMm,
            minInsertionMm: seatHead.minInsertionMm,
            thicknessMm: seatHead.gaugeMm,
            lengthM: round(face.axis === "y" ? body.d : body.w, 3),
            role: seatHead.role,
            loadPath: seatHead.loadPath,
            note:
              "STEP 7 of the lock sequence — fixed LAST, after the panel is home in its track and "
              + "its joint. Leave the movement gap open; never pack it solid.",
          },
        },
      );
    }

    /* ---- JAMB / CLOSING CHANNELS at the corners ------------------------------------------- *
     * Modelled as a real C-shaped PRISM: a vertical member's cross-section lies in the xy plane, so
     * the extrusion can show the actual open channel the panel edge slides into. */
    const seatJamb = spec.seats[1];
    const CORNERS: { key: string; x: number; y: number; sx: number; sy: number }[] = [
      { key: "a", x: body.x0, y: body.y0, sx: 1, sy: 1 },
      { key: "b", x: body.x1, y: body.y0, sx: -1, sy: 1 },
      { key: "c", x: body.x0, y: body.y1, sx: 1, sy: -1 },
      { key: "d", x: body.x1, y: body.y1, sx: -1, sy: -1 },
    ];
    for (const c of CORNERS) {
      s.add(
        `${tag}:jamb-channel:${c.key}`, "c-channel",
        `PUF jamb / closing channel — corner ${c.key.toUpperCase()}`,
        prism(cChannelPoly(c.x, c.y, c.sx, c.sy, slot, jambLeg, gauge), z0, z1),
        {
          floor: f,
          partMark: "JC",
          fabrication: "shop",
          assemblyId: `${tag}:panel-seat:corner-${c.key}`,
          /* Jamb channels serve the WALL, not the deck, so they install with the wall framing —
           * overriding the c-channel family default (which is the base-frame perimeter member). */
          assemblyStep: 14,
          explode: { x: -c.sx * 1.2, y: -c.sy * 1.2, z: 0.3 },
          spec: {
            sectionSize: seatJamb.sectionCall,
            slotWidthMm: spec.slotWidthMm,
            minInsertionMm: seatJamb.minInsertionMm,
            thicknessMm: seatJamb.gaugeMm,
            lengthM: round(z1 - z0, 3),
            role: seatJamb.role,
            loadPath: seatJamb.loadPath,
            note:
              `STEP 2 of the lock sequence — plumbed and fixed BEFORE the first panel, because the `
              + `first panel is entered sideways into it and gains its second restrained edge from it.`,
          },
        },
      );
    }

    /* ---- FRAMED POCKETS at the intermediate columns ---------------------------------------- */
    if (a.connDetail) {
      const seatPocket = spec.seats[3];
      const inner = a.colXs.filter((x) => x > body.x0 + 1e-3 && x < body.x1 - 1e-3);
      inner.forEach((x, i) => {
        ([[body.y0, 1], [body.y1, -1]] as const).forEach(([yAt, sy], e) => {
          s.add(
            `${tag}:panel-pocket:${pad2(i + 1)}:${e === 0 ? "r" : "f"}`, "pocket-support",
            `Framed panel pocket at column — ${e === 0 ? "rear" : "front"}`,
            box(x - jambLeg / 2, yAt, z0, x + jambLeg / 2, yAt + sy * slot, z0 + Math.min(1.2, (z1 - z0) * 0.5)),
            {
              floor: f,
              partMark: "PP",
              fabrication: "shop",
              assemblyId: `${tag}:panel-seat:pocket`,
              assemblyStep: 14,
              explode: { x: 0, y: -sy * 1.2, z: 0.5 },
              spec: {
                sectionSize: seatPocket.sectionCall,
                slotWidthMm: spec.slotWidthMm,
                minInsertionMm: seatPocket.minInsertionMm,
                thicknessMm: seatPocket.gaugeMm,
                role: seatPocket.role,
                loadPath: seatPocket.loadPath,
                note:
                  "Captures the panel on THREE sides where the run dies into a column — the one place "
                  + "a panel edge would otherwise be a free cantilever.",
              },
            },
          );
        });
      });
    }
  }
}

/** A C-shaped plan polygon for a vertical channel, opening along (sx, sy). */
function cChannelPoly(
  x: number, y: number, sx: number, sy: number, slot: number, leg: number, gauge: number,
): Pt[] {
  /* Built in a local frame then mirrored by (sx, sy): the web runs along the local +y, the two legs
   * return along the local +x, leaving an open slot of `slot` between them. */
  const p = (dx: number, dy: number): Pt => ({ x: x + sx * dx, y: y + sy * dy });
  return [
    p(0, 0),
    p(leg, 0),
    p(leg, gauge),
    p(gauge, gauge),
    p(gauge, gauge + slot),
    p(leg, gauge + slot),
    p(leg, gauge * 2 + slot),
    p(0, gauge * 2 + slot),
  ];
}

/** Normalise a box whose min/max may be inverted by an inward direction of -1. */
function normBox(solid: PartSolid): PartSolid {
  if (solid.kind !== "box") return solid;
  const { min, max } = solid;
  return {
    kind: "box",
    min: { x: Math.min(min.x, max.x), y: Math.min(min.y, max.y), z: Math.min(min.z, max.z) },
    max: { x: Math.max(min.x, max.x), y: Math.max(min.y, max.y), z: Math.max(min.z, max.z) },
  };
}

const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

function buildEnvelope(
  s: ModelSink,
  a: { body: Body; plinthM: number; roofBaseZ: number; cfg: LabourColonyResult["config"] },
): void {
  const { body, plinthM: z0, roofBaseZ: z1, cfg } = a;
  const panel = cfg.panelType ? `${cfg.panelType} panel` : "wall panel";
  const gi = !cfg.panelType || String(cfg.panelType).toLowerCase() === "gi";
  // The skins clad the ROOM BAND. Anything outside it (verandas, walkways) stays open by design.
  const faces: { face: ElevationFace; horiz: boolean; at: number; lo: number; dir: number }[] = [
    { face: "rear", horiz: true, at: body.y0, lo: body.x0, dir: 1 },
    { face: "front", horiz: true, at: body.y1, lo: body.x0, dir: -1 },
    { face: "left", horiz: false, at: body.x0, lo: body.y0, dir: 1 },
    { face: "right", horiz: false, at: body.x1, lo: body.y0, dir: -1 },
  ];
  faces.forEach(({ face, horiz, at, lo, dir }) => {
    const wallLen = horiz ? body.w : body.d;
    const layers: { kind: ColonyPartKind; t: number; boq: string; on: boolean; label: string; op?: number }[] = [
      { kind: "ext-panel", t: SKIN_T, boq: `${face}:cladding`, on: true, label: `External ${panel} — ${face}`, op: 0.92 },
      { kind: "insulation", t: INS_T, boq: `${face}:insulation`, on: gi, label: `Wall insulation — ${face}` },
      { kind: "int-finish", t: LIN_T, boq: `${face}:lining`, on: gi, label: `Internal lining — ${face}` },
    ];
    let inset = 0;
    for (const layer of layers) {
      if (!layer.on) continue;
      // step each skin inboard (dir) from the wall face
      const t0 = at + dir * inset;
      const t1 = at + dir * (inset + layer.t);
      const lo0 = Math.min(t0, t1), hi0 = Math.max(t0, t1);
      const solid: PartSolid = horiz
        ? box(lo, lo0, z0, lo + wallLen, hi0, z1)
        : box(lo0, lo, z0, hi0, lo + wallLen, z1);
      s.add(`${face}:${layer.kind}`, layer.kind, layer.label, solid, { boqLineId: layer.boq, opacity: layer.op });
      inset += layer.t;
    }
  });
}

function buildOpenings(s: ModelSink, geoms: RoomFloorPlanGeom[], floors: number, fflOf: (f: number) => number): void {
  for (let f = 0; f < floors; f++) {
    const g = geoms[f];
    if (!g) continue;
    const z0 = fflOf(f);
    g.rooms.forEach((room: FPRoom) => {
      // window on the external (veranda-facing) wall
      if (room.winWM > 0) {
        const wx0 = room.x + room.winFromLeftM;
        const sill = z0 + 0.9, top = z0 + 0.9 + Math.max(0.6, room.winHM || 1.2);
        const yWall = room.wallY;
        s.add(`${f === 0 ? "gf" : `f${f}`}:window:r${room.no}`, "window", `Window — Room ${room.no}`,
          box(wx0, yWall - 0.03, sill, wx0 + room.winWM, yWall + 0.03, top),
          { floor: f, opacity: 0.5, spec: { widthMm: room.winWM * 1000, heightMm: (room.winHM || 1.2) * 1000 } });
      }
      // doors
      room.doors.forEach((d, di) => {
        const along = d.wall === "top" || d.wall === "bottom";
        const dh = z0 + Math.max(1.9, d.heightM || 2.0);
        let x0: number, y0: number, x1: number, y1: number;
        if (d.wall === "bottom") { x0 = room.x + d.posM; x1 = x0 + d.widthM; y0 = room.y - 0.03; y1 = room.y + 0.03; }
        else if (d.wall === "top") { x0 = room.x + d.posM; x1 = x0 + d.widthM; y0 = room.y + room.d - 0.03; y1 = room.y + room.d + 0.03; }
        else if (d.wall === "left") { y0 = room.y + d.posM; y1 = y0 + d.widthM; x0 = room.x - 0.03; x1 = room.x + 0.03; }
        else { y0 = room.y + d.posM; y1 = y0 + d.widthM; x0 = room.x + room.w - 0.03; x1 = room.x + room.w + 0.03; }
        void along;
        s.add(`${f === 0 ? "gf" : `f${f}`}:door:r${room.no}:${di}`, "door", `Door — Room ${room.no}`,
          box(x0, y0, z0, x1, y1, dh),
          { floor: f, spec: { widthMm: d.widthM * 1000, heightMm: (d.heightM || 2.0) * 1000 } });
      });
    });
  }
}

function buildPartitions(
  s: ModelSink, geoms: RoomFloorPlanGeom[], floors: number, fflOf: (f: number) => number, ceilOf: (f: number) => number,
): void {
  const T = 0.05;
  const EPS = 1e-3;
  for (let f = 0; f < floors; f++) {
    const g = geoms[f];
    if (!g) continue;
    const z0 = fflOf(f), z1 = ceilOf(f);
    const tag = f === 0 ? "gf" : `f${f}`;

    // 1. CROSS partitions between adjacent rooms in the same row. Only where a room actually abuts a
    //    NEIGHBOUR — the far edge of the last room in a row is the EXTERNAL wall, already clad by the
    //    envelope, so emitting a partition there duplicates it and z-fights in the 3D scene.
    (["top", "bottom"] as const).forEach((row) => {
      const inRow = g.rooms.filter((r: FPRoom) => r.row === row).sort((a, b) => a.x - b.x);
      for (let i = 0; i < inRow.length - 1; i++) {
        const room = inRow[i], next = inRow[i + 1];
        // adjacent only when the next room starts at this one's far edge (no room gap between them)
        if (Math.abs(next.x - (room.x + room.w)) > Math.max(EPS, g.roomGapM + EPS)) continue;
        const px = (room.x + room.w + next.x) / 2;
        s.add(`${tag}:partition:${row}:${room.no}`, "partition", `Partition — Room ${room.no}/${next.no}`,
          box(px - T / 2, room.y, z0, px + T / 2, room.y + room.d, z1), { floor: f });
      }
    });

    // 2. The LONGITUDINAL spine wall where the two back-to-back rows meet. Without it the two room
    //    rows are geometrically one open space.
    const top = g.rooms.filter((r: FPRoom) => r.row === "top");
    const bottom = g.rooms.filter((r: FPRoom) => r.row === "bottom");
    if (top.length && bottom.length) {
      const topFar = Math.max(...top.map((r) => r.y + r.d));
      const botNear = Math.min(...bottom.map((r) => r.y));
      const spineY = (topFar + botNear) / 2;
      const x0 = Math.min(...g.rooms.map((r: FPRoom) => r.x));
      const x1 = Math.max(...g.rooms.map((r: FPRoom) => r.x + r.w));
      s.add(`${tag}:partition:spine`, "partition", "Spine wall (back-to-back rooms)",
        box(x0, spineY - T / 2, z0, x1, spineY + T / 2, z1), { floor: f });
    }
  }
}

function buildStairs(
  s: ModelSink, g: RoomFloorPlanGeom, floors: number, plinthM: number, floorHM: number, r: Resolvers,
): void {
  if (floors < 2) return;
  const stringerLine = r.firstLineByPrefix("staircase:stringer");
  const sd = r.sectionForLine(stringerLine, "baseFrame");
  const st = Math.max(MIN_VIS, Math.max(sd.widthMm, sd.depthMm) / 1000);
  (g.stairs ?? []).forEach((stair: FPStair) => {
    const flights = floors - 1;
    for (let fl = 0; fl < flights; fl++) {
      const baseZ = plinthM + fl * floorHM;
      const topZ = baseZ + floorHM;
      const along = stair.orientation === "horizontal";
      const x0 = stair.x, y0 = stair.y, wById = stair.widthM;
      const runM = stair.runM;
      /**
       * `FPStair.stepEdges` are measured "along the run from the ENTRY end". When the entry is on the
       * RIGHT the flight climbs right-to-left, which `buildElevation` honours by flipping its drawn
       * profile. Measuring unconditionally from the low coordinate (as this builder used to) mirrored
       * the 3D flight and its landing relative to the 2D elevation and the fabrication sheet, so the
       * flight arrived on the wrong side of the stair well. `ascendsPositive` restores that agreement.
       */
      const ascendsPositive = stair.entry === "left";
      const lo = along ? x0 : y0;
      const s0 = ascendsPositive ? lo : lo + runM;   // the ENTRY (low) end
      const s1 = ascendsPositive ? lo + runM : lo;   // the ARRIVAL (high) end
      const dir = ascendsPositive ? 1 : -1;
      for (const [sideIdx, off] of [[0, 0], [1, wById]] as const) {
        const perp = along ? y0 + off : x0 + off;
        const pts: [Vec3, Vec3, Vec3, Vec3] = along
          ? [
              { x: s0, y: perp, z: baseZ }, { x: s1, y: perp, z: topZ },
              { x: s1, y: perp + st, z: topZ }, { x: s0, y: perp + st, z: baseZ },
            ]
          : [
              { x: perp, y: s0, z: baseZ }, { x: perp, y: s1, z: topZ },
              { x: perp + st, y: s1, z: topZ }, { x: perp + st, y: s0, z: baseZ },
            ];
        s.add(`stair:${stair.id}:f${fl}:stringer:${sideIdx}`, "stair-stringer", `Stair stringer — ${stair.label}`,
          { kind: "quad", pts, thicknessM: st }, { boqLineId: stringerLine, partMark: "ST", fabrication: "shop", assemblyId: `stair:${stair.id}` });
      }
      /* Treads. `resolveStair` guarantees treads = steps − 1 because the TOP riser lands on the floor
       * slab itself, so tread i must sit one FULL riser above the departure level:
       *     tread_i top = baseZ + (i + 1) × (floorHM / steps)
       * Distributing over `treads − 1` gaps (the old form) put tread 0 flat on the departure slab and
       * the last tread flat on the arrival slab, and produced a riser of floorHM/(steps−2) — visibly
       * contradicting the riser height the stair schedule and the 2D elevation both report. */
      const steps = Math.max(1, stair.steps);
      const riserM = floorHM / steps;
      stair.stepEdges.forEach((edge, si) => {
        const tz = baseZ + (si + 1) * riserM;
        const ta = s0 + dir * edge.a, tb = s0 + dir * edge.b;
        const solid = along
          ? box(Math.min(ta, tb), y0, tz - 0.03, Math.max(ta, tb), y0 + wById, tz)
          : box(x0, Math.min(ta, tb), tz - 0.03, x0 + wById, Math.max(ta, tb), tz);
        s.add(`stair:${stair.id}:f${fl}:tread:${si}`, "stair-tread", `Tread ${si + 1} — ${stair.label}`, solid,
          { boqLineId: r.firstLineByPrefix("staircase:tread-frame"), partMark: "TR", fabrication: "shop", assemblyId: `stair:${stair.id}` });
      });
      // landing — at the ARRIVAL end, beyond the top of the flight
      const lz0 = s1, lz1 = s1 + dir * stair.landingM;
      s.add(`stair:${stair.id}:f${fl}:landing`, "landing", `Landing — ${stair.label}`,
        along ? box(Math.min(lz0, lz1), y0, topZ - 0.05, Math.max(lz0, lz1), y0 + wById, topZ)
              : box(x0, Math.min(lz0, lz1), topZ - 0.05, x0 + wById, Math.max(lz0, lz1), topZ),
        { boqLineId: r.firstLineByPrefix("staircase:landing-cross"), partMark: "LND", fabrication: "shop", assemblyId: `stair:${stair.id}` });
      // handrail posts + rail along one side
      if (stair.handrail) {
        for (let hp = 0; hp <= 4; hp++) {
          const t = hp / 4;
          const hz = baseZ + t * floorHM;
          const ha = s0 + dir * t * runM;
          const hx = along ? ha : x0 + wById;
          const hy = along ? y0 + wById : ha;
          s.add(`stair:${stair.id}:f${fl}:rail-post:${hp}`, "handrail-post", `Handrail post — ${stair.label}`,
            box(hx - 0.025, hy - 0.025, hz, hx + 0.025, hy + 0.025, hz + RAIL_H),
            { boqLineId: r.firstLineByPrefix("staircase:rail-post"), fabrication: "shop", assemblyId: `stair:${stair.id}` });
        }
      }
    }
  });
}

function buildVeranda(
  s: ModelSink, geoms: RoomFloorPlanGeom[], floors: number, fflOf: (f: number) => number, ceilOf: (f: number) => number, r: Resolvers,
): void {
  const beamLine = r.firstLineByPrefix("veranda:beam");
  const postLine = r.firstLineByPrefix("veranda:rail-post");
  const bd = r.sectionForLine(beamLine, "baseFrame");
  const bt = Math.max(MIN_VIS, Math.max(bd.widthMm, bd.depthMm) / 1000);
  for (let f = 0; f < floors; f++) {
    const g = geoms[f];
    if (!g) continue;
    const z = fflOf(f);
    (g.verandas ?? []).forEach((v: FPVeranda, vi) => {
      const horiz = v.side === "top" || v.side === "bottom";
      // edge beam along the outer edge of the veranda
      s.add(`veranda:${f}:${vi}:beam`, "veranda-beam", `Veranda edge beam — ${v.label}`,
        horiz ? box(v.x, v.y + (v.side === "top" ? 0 : v.d) - bt / 2, z - bt, v.x + v.w, v.y + (v.side === "top" ? 0 : v.d) + bt / 2, z)
              : box(v.x + (v.side === "left" ? 0 : v.w) - bt / 2, v.y, z - bt, v.x + (v.side === "left" ? 0 : v.w) + bt / 2, v.y + v.d, z),
        { boqLineId: beamLine, floor: f, partMark: "VB", fabrication: "shop" });
      // chequered walkway plate over the veranda
      s.add(`veranda:${f}:${vi}:plate`, "walkway-plate", `Chequered walkway plate — ${v.label}`,
        box(v.x, v.y, z, v.x + v.w, v.y + v.d, z + 0.006), { boqLineId: r.firstLineByPrefix("veranda:plate"), floor: f, opacity: 0.95 });
      // railing along the outer edge
      if (v.railing) {
        const edgeAlong = horiz ? v.w : v.d;
        const posts = Math.max(2, Math.round(edgeAlong / 1.5) + 1);
        for (let p = 0; p < posts; p++) {
          const t = p / (posts - 1);
          const px = horiz ? v.x + t * v.w : v.x + (v.side === "left" ? 0 : v.w);
          const py = horiz ? v.y + (v.side === "top" ? 0 : v.d) : v.y + t * v.d;
          s.add(`veranda:${f}:${vi}:rail-post:${p}`, "handrail-post", `Handrail post — ${v.label}`,
            box(px - 0.025, py - 0.025, z, px + 0.025, py + 0.025, z + RAIL_H),
            { boqLineId: postLine, floor: f, fabrication: "shop" });
        }
        // top rail
        s.add(`veranda:${f}:${vi}:rail`, "handrail", `Handrail — ${v.label}`,
          horiz ? box(v.x, v.y + (v.side === "top" ? 0 : v.d) - 0.02, z + RAIL_H - 0.04, v.x + v.w, v.y + (v.side === "top" ? 0 : v.d) + 0.02, z + RAIL_H)
                : box(v.x + (v.side === "left" ? 0 : v.w) - 0.02, v.y, z + RAIL_H - 0.04, v.x + (v.side === "left" ? 0 : v.w) + 0.02, v.y + v.d, z + RAIL_H),
          { boqLineId: r.firstLineByPrefix("veranda:rail"), floor: f, fabrication: "shop" });
      }
    });
  }
}

function buildServices(
  s: ModelSink, result: LabourColonyResult, blockWM: number, blockDM: number, roofBaseZ: number,
  floors: number, fflOf: (f: number) => number, ceilOf?: (f: number) => number,
): void {
  const el = result.electrical;
  const lightsPerFloor = Math.max(0, Math.round((el?.lights ?? 0) / floors));
  const fansPerFloor = Math.max(0, Math.round((el?.fans ?? 0) / floors));
  for (let f = 0; f < floors; f++) {
    // Hang the fittings just under THIS floor's ceiling rather than at a fixed 2.6 m — `roomHeight` is
    // user-editable, and anything at or above the storey height ends up embedded in the deck above.
    const top = ceilOf ? ceilOf(f) : fflOf(f) + 2.6;
    const zc = Math.min(fflOf(f) + 2.6, top - 0.15);
    placeGrid(lightsPerFloor, blockWM, blockDM).forEach((p, i) => {
      s.add(`f${f}:light:${i}`, "light", "Ceiling light",
        box(p.x - 0.15, p.y - 0.15, zc - 0.04, p.x + 0.15, p.y + 0.15, zc), { boqLineId: "electrical:lights", floor: f });
    });
    placeGrid(fansPerFloor, blockWM, blockDM).forEach((p, i) => {
      s.add(`f${f}:fan:${i}`, "fan", "Ceiling fan",
        box(p.x - 0.2, p.y - 0.2, zc - 0.26, p.x + 0.2, p.y + 0.2, zc - 0.2), { boqLineId: "electrical:fans", floor: f });
    });
  }
  // distribution board on the ground floor
  s.add("gf:db", "db", "Distribution board",
    box(0.05, blockDM / 2 - 0.2, fflOf(0) + 1.2, 0.15, blockDM / 2 + 0.2, fflOf(0) + 1.6), { boqLineId: "electrical:db", floor: 0 });
}

/* ------------------------------------------------------------------ small helpers ------------ */

function isSteel(it: TakeoffItem): it is Extract<TakeoffItem, { kind: "steel" }> {
  return (it as { kind?: string }).kind === "steel";
}

function clampDims(d: SectionDims): SectionDims {
  return {
    widthMm: Math.max(MIN_VIS * 1000, d.widthMm),
    depthMm: Math.max(MIN_VIS * 1000, d.depthMm),
    thicknessMm: d.thicknessMm,
  };
}

/** Parse dims from a synthesized material key like "rhs-120x60x4" / "sqtube-40x40x2" / "pipe-od48x2". */
function parseKeyDims(key: string): SectionDims | null {
  const m = key.match(/(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)(?:x(\d+(?:\.\d+)?))?/i);
  if (m) return { widthMm: Number(m[1]), depthMm: Number(m[2]), thicknessMm: m[3] ? Number(m[3]) : 0 };
  const od = key.match(/od(\d+(?:\.\d+)?)(?:x(\d+(?:\.\d+)?))?/i);
  if (od) return { widthMm: Number(od[1]), depthMm: Number(od[1]), thicknessMm: od[2] ? Number(od[2]) : 0 };
  return parseSectionDims(key, null);
}

function dimsSpec(d: SectionDims, lengthM: number): PartSpec {
  return {
    sectionSize: `${round(d.widthMm)} × ${round(d.depthMm)} × ${round(d.thicknessMm)} mm`,
    lengthM: round(lengthM, 3),
    thicknessMm: d.thicknessMm,
  };
}

/** Evenly spaced INCLUSIVE lines across [lo,hi] (includes both ends). */
function evenSpanInclusive(lo: number, hi: number, count: number): number[] {
  if (count <= 1) return [lo];
  return Array.from({ length: count }, (_, i) => lo + ((hi - lo) * i) / (count - 1));
}

function placeGrid(n: number, L: number, D: number): { x: number; y: number }[] {
  if (n <= 0) return [];
  const cols = Math.ceil(Math.sqrt(n * (L / Math.max(1e-6, D))));
  const rows = Math.ceil(n / cols);
  const pts: { x: number; y: number }[] = [];
  let placed = 0;
  for (let r = 0; r < rows && placed < n; r++) {
    for (let c = 0; c < cols && placed < n; c++) {
      pts.push({ x: (L * (c + 0.5)) / cols, y: (D * (r + 0.5)) / rows });
      placed++;
    }
  }
  return pts;
}

function deriveGridFromBlock(L: number, D: number): ColumnMark[] {
  const nx = Math.max(2, Math.round(L / 3.5) + 1);
  const ny = Math.max(2, Math.round(D / 3.5) + 1);
  const xs = evenSpanInclusive(0, L, nx);
  const ys = evenSpanInclusive(0, D, ny);
  return buildColumnMarks(xs, ys);
}

function round(v: number, dp = 0): number {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

function computeBounds(parts: ColonyPart[]): ModelBounds {
  const min: Vec3 = { x: Infinity, y: Infinity, z: Infinity };
  const max: Vec3 = { x: -Infinity, y: -Infinity, z: -Infinity };
  const acc = (v: Vec3) => {
    min.x = Math.min(min.x, v.x); min.y = Math.min(min.y, v.y); min.z = Math.min(min.z, v.z);
    max.x = Math.max(max.x, v.x); max.y = Math.max(max.y, v.y); max.z = Math.max(max.z, v.z);
  };
  for (const p of parts) {
    const sd = p.solid;
    if (sd.kind === "box") { acc(sd.min); acc(sd.max); }
    else if (sd.kind === "prism") { for (const pt of sd.poly) { acc({ x: pt.x, y: pt.y, z: sd.z0 }); acc({ x: pt.x, y: pt.y, z: sd.z1 }); } }
    else { for (const pt of sd.pts) acc(pt); }
  }
  if (!Number.isFinite(min.x)) { return { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }; }
  return { min, max };
}
