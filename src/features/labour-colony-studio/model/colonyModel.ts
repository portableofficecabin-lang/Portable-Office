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

import { buildColonyTakeoff } from "@/lib/boq/colonyTakeoff";
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
import type {
  BoqSource, ColonyModel, ColonyPart, ColonyPartKind, ModelBounds, ModelWarning, PartSolid, PartSpec, Pt, Vec3,
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
      assemblyStep: STEP_OF_KIND[kind],
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
  void jw; void jh; void jDims;
  for (let f = 0; f < floors; f++) {
    const z = fflOf(f);
    const floorTag = f === 0 ? "gf" : `f${f}`;
    joistXs.forEach((x, i) => {
      for (let b = 0; b < joistBayYs.length - 1; b++) {
        const y0 = joistBayYs[b], y1 = joistBayYs[b + 1];
        const span = y1 - y0;
        const lineId = bindByLength("floor:joist", span, joistLineId);
        const jd = sectionForLine(lineId, "baseFrame");
        const jw2 = Math.max(MIN_VIS, jd.widthMm / 1000), jh2 = Math.max(MIN_VIS, jd.depthMm / 1000);
        s.add(`${floorTag}:joist:${i}:${b}`, "joist", "Floor joist",
          box(x - jw2 / 2, y0, z - jh2, x + jw2 / 2, y1, z),
          { boqLineId: lineId, floor: f, partMark: "J", fabrication: "shop", spec: dimsSpec(jd, span) });
      }
    });
    // deck: board + finish — over the walled body (the veranda gets its own chequered walkway plate)
    s.add(`${floorTag}:deck-board`, "floor-board", "Floor deck board",
      box(bodyX0, bodyY0, z, bodyX1, bodyY1, z + DECK_T), { boqLineId: "floor:board", floor: f });
    s.add(`${floorTag}:deck-finish`, "floor-finish", "Floor finish (vinyl)",
      box(bodyX0, bodyY0, z + DECK_T, bodyX1, bodyY1, z + DECK_T + 0.006), { boqLineId: "floor:vinyl", floor: f, opacity: 0.9 });
  }

  const body: Body = { x0: bodyX0, x1: bodyX1, y0: bodyY0, y1: bodyY1, w: bodyWM, d: bodyDM };

  /* ================================================================= WALL STUDS + RAILS === */
  buildWallFraming(s, body, floors, fflOf, ceilOf, { countByPrefix, firstLineByPrefix, sectionForLine });

  /* ================================================================= BRACING ============== */
  buildBracing(s, elev, body, colXs, rowYs, { firstLineByPrefix, sectionForLine, lineForLength });

  /* ================================================================= ROOF (trusses/rafters/purlins) */
  buildRoof(s, { colXs, rowYs, body, roofBaseZ, roof, frame, firstLineByPrefix, sectionForLine, connDetail });

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
      s.add(`conn:base:${cm.grid}:washer:${i}`, "washer", `Washer ${cm.grid}-${i + 1}`,
        box(bx - BOLT_D, by - BOLT_D, plinthM + BASE_PLATE_T, bx + BOLT_D, by + BOLT_D, plinthM + BASE_PLATE_T + 0.004),
        { connectionId: cid, grid: cm.grid, floor: 0, fabrication: "site" });
      s.add(`conn:base:${cm.grid}:nut:${i}`, "nut", `Nut ${cm.grid}-${i + 1}`,
        prism(hexPoly(bx, by, BOLT_D * 1.6), plinthM + BASE_PLATE_T + 0.004, plinthM + BASE_PLATE_T + 0.02),
        { connectionId: cid, grid: cm.grid, floor: 0, fabrication: "site" });
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
  const inner = a.colXs.filter((x) => x > xLo + 1e-3 && x < xHi - 1e-3);
  const trussXs = uniqSorted([xLo, ...inner, xHi]);
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
      if (a.connDetail) {
        s.add(`roof:truss:${tag}:gusset:ridge`, "gusset", `Ridge gusset ${tag}`,
          box(x - rt / 2 - 0.02, ridgeY - 0.12, roofBaseZ + rise - 0.12, x + rt / 2 + 0.02, ridgeY + 0.12, roofBaseZ + rise + PLATE_T),
          { connectionId: `truss:${tag}:ridge`, fabrication: "shop", partMark: "GP" });
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
  if (flat) {
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
