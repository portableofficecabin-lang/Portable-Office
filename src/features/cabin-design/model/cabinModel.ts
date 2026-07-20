/**
 * SHARED CABIN DESIGN MODEL — the builder (spec §9: "one shared design model").
 *
 * buildCabinModel(config) → CabinModel: a flat, id'd list of every cabin component in cabin mm,
 * ready for the 2D engineering sheets, the 3D scene, the exploded animation, the inspector, the
 * BOQ highlighting and the export. It DERIVES, never re-invents:
 *
 *   • the INTERIOR (partitions, doors + swings, windows, fixtures, toilets, pantry, electrical
 *     board, add-on furniture) comes verbatim from cabinObstacles(config) — the same mm geometry
 *     the 2D plan and the collision checker already agree on;
 *   • the STRUCTURE (posts, studs, joists) comes from buildCabinTakeoff(config).frame — the exact
 *     members the BOQ prices;
 *   • the ENVELOPE + ROOF are extruded from the cabin dimensions using the SAME roof rule the
 *     elevations use (sloped = roof ≠ "flat" && not a container; 8″ ridge rise over the width);
 *   • the parametric FURNITURE comes from tableFootprint/tableWorldBbox.
 *
 * Pure: no React, no three.js, no DOM. Never statically import this from a public/homepage
 * component — it pulls in the BOQ take-off; it belongs behind the admin lazy islands.
 */

import type { CabinConfig } from "@/components/home/cabin-calculator/pricing";
import { isPufPanel, isStorageProduct, isToiletCabin, PRODUCTS } from "@/components/home/cabin-calculator/pricing";
import { buildCabinTakeoff } from "@/lib/boq/cabinTakeoff";
import { DEFAULT_NORMS, roofRiseFtOf } from "@/lib/boq/types";
import { indexMaterials, SEED_MATERIALS } from "@/lib/boq/materialMaster";
import { parseSectionDims, type SectionDims } from "./sectionDims";
import { buildFloorSheetSchedule, SHEET_LEN_FT, SHEET_WID_FT } from "./floorSheets";
import {
  cabinObstacles, cabinSizeMm, roomRangesMm, type Obstacle,
} from "@/features/cabin-design/furniture/tables/cabinObstacles";
import { tableWorldBbox, type Pt } from "@/features/cabin-design/furniture/tables/tableGeometry";
import type { CabinTable } from "@/features/cabin-design/furniture/tables/tableSchema";
import { MM_PER_FT } from "@/features/cabin-design/furniture/tables/tableUnits";
import { ASSEMBLY_SEQUENCE, EXPLODE_OF_KIND, STEP_OF_KIND } from "./assembly";
import type {
  CabinModel, CabinPart, ModelBounds, PartKind, PartLayer, PartSolid, PartSpec, Vec3, ViewMode,
} from "./types";

/* ------------------------------------------------------------------ constants + helpers ------ */

// Roof rise comes from CabinBoqOptions.roofRiseFt (default 8″) via roofRiseFtOf — matches the take-off.
const FLOOR_TOP = 0;                         // finished floor at z = 0
const BASE_Z0 = -170, BASE_Z1 = -20;         // base chassis sits just below the floor
const FLOOR_BOARD_Z1 = 25, FLOOR_FINISH_Z1 = 42;
const MEMBER_COL = 60, MEMBER_POST = 45, MEMBER_STUD = 32, MEMBER_JOIST = 45; // fallback draw widths (mm)
/** Smallest visible cross-section (mm) — a thin 40×2 section must never collapse to a hairline. */
const MIN_VIS_MM = 22;
/** Section fallback for standard keys: the seeded Material Master, mirroring the DB seed rows. */
const SEED_INDEX = indexMaterials(SEED_MATERIALS);
const WALL_T = 60, INT_T = 18, INS_T = 40;   // wall skin / lining / insulation draw thickness (mm)
const CEILING_T = 30, ROOF_T = 45;
const DOOR_H_DEFAULT_MM = 2032;              // 6'-8" leaf when a placement carries no size

const ft = (v: number): number => v * MM_PER_FT;

/** Which part families are engineering-only (hidden in the clean customer view, spec §6). */
const ENG_ONLY = new Set<PartKind>([
  "base-frame", "joist", "column", "stud", "rail", "mdf-support", "roof-frame", "lifting-hook", "insulation", "door-swing",
  "gusset-plate", "fastener",
]);

/** Broad layer each part family belongs to (drives the visibility toggles). */
const LAYER_OF_KIND: Record<PartKind, PartLayer> = {
  "base-frame": "structure", joist: "structure", column: "structure", stud: "structure",
  rail: "structure", "mdf-support": "structure", "roof-frame": "structure", "lifting-hook": "structure",
  "gusset-plate": "structure", fastener: "structure",
  "floor-board": "walls", "floor-finish": "walls", "ext-panel": "walls", insulation: "walls",
  "int-finish": "walls", "roof-sheet": "roof", ceiling: "roof",
  partition: "walls", door: "openings", "door-swing": "openings", window: "openings",
  light: "electrical", fan: "electrical", socket: "electrical", switch: "electrical",
  "electrical-panel": "electrical", "plumbing-fixture": "plumbing", pipe: "plumbing",
  furniture: "furniture", toilet: "plumbing", pantry: "furniture",
};

const COLOR_OF_KIND: Record<PartKind, string> = {
  "base-frame": "#64748b", joist: "#94a3b8", column: "#475569", stud: "#94a3b8",
  rail: "#64748b", "mdf-support": "#a3855b", "roof-frame": "#64748b", "lifting-hook": "#334155",
  "gusset-plate": "#0f766e", fastener: "#b45309",
  "floor-board": "#b98a52", "floor-finish": "#d9bb8f", "ext-panel": "#cbd5e1",
  insulation: "#facc15", "int-finish": "#e7ecf2", "roof-sheet": "#9aa7b4", ceiling: "#eef2f7",
  partition: "#c7b299", door: "#8b5a2b", "door-swing": "#cbd5e1", window: "#a8c8e0",
  light: "#fde68a", fan: "#94a3b8", socket: "#475569", switch: "#64748b",
  "electrical-panel": "#334155", "plumbing-fixture": "#bae6fd", pipe: "#7dd3fc",
  furniture: "#d9bb8f", toilet: "#e0f2fe", pantry: "#e7d3b3",
};

function viewMaskOf(kind: PartKind): ViewMode[] {
  return ENG_ONLY.has(kind) ? ["engineering"] : ["engineering", "customer"];
}

const rectPoly = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
  { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 },
];

/* ------------------------------------------------------------------ part factory ------------- */

class ModelSink {
  readonly parts: CabinPart[] = [];
  private seq = 0;

  add(
    id: string, kind: PartKind, label: string, solid: PartSolid,
    opts: { boqLineId?: string; geomKey?: string; spec?: PartSpec; opacity?: number; explode?: Vec3 } = {},
  ): CabinPart {
    const part: CabinPart = {
      id: id || `${kind}:${this.seq++}`,
      kind,
      layer: LAYER_OF_KIND[kind],
      label,
      solid,
      colorHex: COLOR_OF_KIND[kind],
      opacity: opts.opacity,
      boqLineId: opts.boqLineId,
      geomKey: opts.geomKey,
      assemblyStep: STEP_OF_KIND[kind],
      explode: opts.explode ?? EXPLODE_OF_KIND[kind],
      spec: opts.spec ?? {},
      viewMask: viewMaskOf(kind),
    };
    this.parts.push(part);
    return part;
  }
}

const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): PartSolid => ({
  kind: "box",
  min: { x: Math.min(x0, x1), y: Math.min(y0, y1), z: Math.min(z0, z1) },
  max: { x: Math.max(x0, x1), y: Math.max(y0, y1), z: Math.max(z0, z1) },
});
const prism = (poly: Pt[], z0: number, z1: number): PartSolid => ({ kind: "prism", poly, z0, z1 });

/* ------------------------------------------------------------------ the builder -------------- */

/** How a member's real cross-section (mm) maps onto its two drawn axes. */
export interface MemberXsec {
  /** The narrower profile dimension — drawn across the run, in-plane (min-clamped). */
  across: number;
  /** The larger profile dimension — drawn as the member's depth/height (min-clamped). */
  through: number;
}

export interface BuildCabinModelOptions {
  /**
   * Resolve a BOQ line id → its real section dimensions. The studio passes a resolver reading the
   * LIVE priced BOQ (so overrides, DB edits and custom sections all flow through). When it returns
   * null (or is absent), buildCabinModel falls back to the effective key from config.boq against the
   * seeded Material Master — so a Frame Config section swap scales the 3D even before the BOQ reprices.
   */
  resolveSection?: (boqLineId: string) => SectionDims | null;
  /**
   * Resolve a BOQ line id → its PRICED piece count. The studio passes a resolver reading the LIVE
   * priced BOQ, so a manual quantity override or lock on a member (e.g. the base-frame cross-stiffeners
   * or the MDF support battens) is reflected in the 3D member count — never independently recomputed.
   * Absent / null ⇒ falls back to the take-off's own auto count (which equals the BOQ's auto count).
   */
  resolveQty?: (boqLineId: string) => number | null;
}

export function buildCabinModel(config: CabinConfig, opts: BuildCabinModelOptions = {}): CabinModel {
  const s = new ModelSink();

  const { lengthMm: L, widthMm: W } = cabinSizeMm(config);
  const Htop = ft(Math.max(6, config.height || 8));           // eave (wall-top) height
  const container = isStorageProduct(config.productId);
  const puf = !container && isPufPanel(config.structureId);
  const sloped = config.roofId !== "flat" && !container;      // same rule the elevations use
  const insulated = !puf && config.insulationId !== "none";
  const lined = !(puf && config.wallId === "none");
  const riseMm = ft(roofRiseFtOf(config.boqOptions));
  const ridgeZ = Htop + riseMm;
  const product = PRODUCTS.find((p) => p.id === config.productId) ?? PRODUCTS[0];
  const rooms = roomRangesMm(config);

  /* ---- structure + roof member lines from the SAME frame the BOQ prices ----------------- *
   * Built first so member cross-sections can be sized from the section each line is priced with. */
  const takeoff = buildCabinTakeoff(config, config.boq?.norms ?? DEFAULT_NORMS, config.boqOptions ?? {});
  const frame = takeoff.frame;

  /* ---- SECTION SIZING: real Material Master dims → scaled member cross-sections ---------- *
   * Single source of truth: the section each frame line is priced against. The studio's resolver
   * reads the live BOQ; the fallback resolves the effective key (role default → materialMap →
   * per-line override) from config.boq and reads the seeded catalogue. Unknown → cosmetic default. */
  const roleKeyById = new Map(takeoff.items.map((it) => [it.id, it.materialKey]));
  const sectionForLine = (id: string): SectionDims | null => {
    const live = opts.resolveSection?.(id);
    if (live) return live;
    const roleKey = roleKeyById.get(id);
    if (!roleKey) return null;
    const key = config.boq?.overrides?.[id]?.materialKey ?? config.boq?.materialMap?.[roleKey] ?? roleKey;
    const m = SEED_INDEX[key];
    return m ? parseSectionDims(m.sectionSize, m.thicknessMm) : null;
  };
  const xsec = (id: string, fallback: number): MemberXsec => {
    const d = sectionForLine(id);
    if (!d) return { across: fallback, through: fallback };
    return {
      across: Math.max(MIN_VIS_MM, Math.min(d.widthMm, d.depthMm)),
      through: Math.max(MIN_VIS_MM, Math.max(d.widthMm, d.depthMm)),
    };
  };

  /* ---- MEMBER COUNT: straight from the priced BOQ, never recomputed here (spec: single source of
   * truth). The live resolver returns the priced pieces (with any manual override / lock); the
   * fallback is the take-off's own auto count for that line, which equals the BOQ's auto count. */
  const qtyById = new Map<string, number>();
  for (const it of takeoff.items) if (it.kind === "steel") qtyById.set(it.id, it.qty);
  const memberCount = (id: string): number => {
    const live = opts.resolveQty?.(id);
    if (live != null && Number.isFinite(live)) return Math.max(0, Math.round(live));
    return qtyById.get(id) ?? 0;
  };
  /** `count` interior lines evenly spaced across a span, excluding both ends (mirrors the take-off's
   *  evenLines) — so the first/last member never duplicates the perimeter frame at 0 or `span`. */
  const evenLines = (span: number, count: number): number[] =>
    Array.from({ length: Math.max(0, count) }, (_, i) => (span * (i + 1)) / (count + 1));

  /* ---- 1. bottom structural frame (chassis) — cross-section from the base-frame section --- */
  const bfl = xsec("floor:base-frame-long", MEMBER_COL);
  const bfc = xsec("floor:base-frame-cross", MEMBER_COL);
  s.add("floor:base-frame-long-a", "base-frame", "Base frame — longitudinal",
    box(0, 0, BASE_Z1 - bfl.through, L, bfl.across, BASE_Z1), { boqLineId: "floor:base-frame-long" });
  s.add("floor:base-frame-long-b", "base-frame", "Base frame — longitudinal",
    box(0, W - bfl.across, BASE_Z1 - bfl.through, L, W, BASE_Z1), { boqLineId: "floor:base-frame-long" });
  s.add("floor:base-frame-cross-a", "base-frame", "Base frame — cross",
    box(0, 0, BASE_Z1 - bfc.through, bfc.across, W, BASE_Z1), { boqLineId: "floor:base-frame-cross" });
  s.add("floor:base-frame-cross-b", "base-frame", "Base frame — cross",
    box(L - bfc.across, 0, BASE_Z1 - bfc.through, L, W, BASE_Z1), { boqLineId: "floor:base-frame-cross" });

  /* ---- 2. base-frame cross-stiffeners (transverse floor members) — spec §4 -----------------
   * COUNT + section come straight from the priced BOQ line "floor:joists" (so a spacing change,
   * a manual qty override and a section swap all flow through — nothing is recomputed here). Each
   * stiffener runs TRANSVERSELY between the two longitudinal base members, at the base-frame level,
   * across the CLEAR internal width; interior positions never duplicate the front/rear perimeter. */
  const js = xsec("floor:joists", MEMBER_JOIST);
  const yClearLo = bfl.across;        // inner face of the rear longitudinal side member
  const yClearHi = W - bfl.across;    // inner face of the front longitudinal side member
  evenLines(L, memberCount("floor:joists")).forEach((x, i) => {
    s.add(`floor:joist:${i}`, "joist", "Base-frame cross-stiffener",
      box(x - js.across / 2, yClearLo, BASE_Z1 - js.through, x + js.across / 2, yClearHi, BASE_Z1),
      { boqLineId: "floor:joists" });
  });

  /* ---- 3. floor board + finish ---------------------------------------------------------- */
  s.add("floor:board", "floor-board", "Flooring board (deck)",
    box(0, 0, FLOOR_TOP, L, W, FLOOR_BOARD_Z1), { boqLineId: "floor:board" });
  s.add("floor:finish", "floor-finish", "Floor finish",
    box(0, 0, FLOOR_BOARD_Z1, L, W, FLOOR_FINISH_Z1), { boqLineId: "floor:finish" });

  /* ---- 3b. the 8 ft × 4 ft decking laid out SHEET BY SHEET (spec: flooring-sheet calculation).
   * The whole-slab `floor:board` above stays exactly as it is (the inspector, boqLink, the 2D sheets
   * and the assembly timeline all key off that id). These tiles are the physical CUTTING + PLACEMENT
   * layout drawn over it — each carries its sheet mark, cut size and full/cut status, and a per-sheet
   * explode stagger so the exploded view fans them out in installation order. */
  {
    const sched = buildFloorSheetSchedule(config, null, 1);
    const JOINT = 5;                                   // visible joint between sheets (mm)
    for (const sh of sched.rows) {
      const lenFt = sh.cutLengthMm / MM_PER_FT, widFt = sh.cutWidthMm / MM_PER_FT;
      s.add(`floor:board:sheet:${sh.no}`, "floor-board",
        `Floor sheet ${sh.mark} — ${lenFt.toFixed(2)} × ${widFt.toFixed(2)} ft${sh.full ? " (full 8×4)" : " (cut to fit)"}`,
        box(sh.x0 + JOINT / 2, sh.y0 + JOINT / 2, FLOOR_TOP, sh.x1 - JOINT / 2, sh.y1 - JOINT / 2, FLOOR_BOARD_Z1 + 1),
        {
          boqLineId: "floor:board",
          explode: { x: 0, y: 0, z: -0.5 - sh.no * 0.05 },   // stagger so every sheet reads separately
          spec: {
            partMark: sh.mark,
            lengthMm: sh.cutLengthMm, widthMm: sh.cutWidthMm,
            note: sh.full
              ? `Full ${SHEET_LEN_FT} ft × ${SHEET_WID_FT} ft sheet · laid ${sh.orientation} · install order ${sh.no}`
              : `Cut to ${lenFt.toFixed(2)} ft × ${widFt.toFixed(2)} ft from a full ${SHEET_LEN_FT}×${SHEET_WID_FT} sheet · install order ${sh.no}`,
          },
        });
    }
  }

  /* ---- 4. corner columns (the 4 real corners; BOQ attributes one per face) -------------- */
  const corners: { x: number; y: number; face: string }[] = [
    { x: 0, y: 0, face: "rear" }, { x: L, y: 0, face: "right" },
    { x: L, y: W, face: "front" }, { x: 0, y: W, face: "left" },
  ];
  corners.forEach((c, i) => {
    const cc = xsec(`${c.face}:corner-post`, MEMBER_COL);
    const cx = c.x === 0 ? 0 : L - cc.across;
    const cy = c.y === 0 ? 0 : W - cc.through;
    s.add(`column:corner:${i}`, "column", "Corner column",
      box(cx, cy, FLOOR_TOP, cx + cc.across, cy + cc.through, Htop),
      { boqLineId: `${c.face}:corner-post` });
  });

  /* ---- 5. wall framing: intermediate posts + studs (from frame.posts) ------------------- *
   * Each member's cross-section comes from its own priced section: `across` runs parallel to the
   * wall (centred on the frame line), `through` runs into the cabin (anchored to the wall face). */
  (frame?.posts ?? []).forEach((p, i) => {
    if (p.kind === "corner") return; // corners handled above
    const isStud = p.kind === "stud";
    const lineId = `${p.face}:${isStud ? "studs" : "posts"}`;
    const sec = xsec(lineId, isStud ? MEMBER_STUD : MEMBER_POST);
    const a = p.xM * 1000;                          // centreline along the wall
    const half = sec.across / 2;
    const thru = sec.through;
    let solid: PartSolid;
    if (p.face === "rear") solid = box(a - half, 0, FLOOR_TOP, a + half, thru, Htop);
    else if (p.face === "front") solid = box(a - half, W - thru, FLOOR_TOP, a + half, W, Htop);
    else if (p.face === "left") solid = box(0, a - half, FLOOR_TOP, thru, a + half, Htop);
    else solid = box(L - thru, a - half, FLOOR_TOP, L, a + half, Htop);
    s.add(`${p.face}:${p.kind}:${i}`, isStud ? "stud" : "column",
      isStud ? "Wall stud" : "Intermediate post", solid, { boqLineId: lineId });
  });

  /* ---- framing rails (top + bottom of each wall) ---------------------------------------- */
  const wallFaces: { face: string; horiz: boolean }[] = [
    { face: "rear", horiz: true }, { face: "front", horiz: true },
    { face: "left", horiz: false }, { face: "right", horiz: false },
  ];
  wallFaces.forEach(({ face, horiz }) => {
    const yBase = face === "rear" ? 0 : face === "front" ? W - MEMBER_POST : 0;
    const xBase = face === "left" ? 0 : face === "right" ? L - MEMBER_POST : 0;
    for (const [tag, z0, z1] of [["bottom", FLOOR_TOP, FLOOR_TOP + MEMBER_POST], ["top", Htop - MEMBER_POST, Htop]] as const) {
      const solid = horiz
        ? box(0, yBase, z0, L, yBase + MEMBER_POST, z1)
        : box(xBase, 0, z0, xBase + MEMBER_POST, W, z1);
      s.add(`${face}:rail:${tag}`, "rail", `Wall rail — ${face}`, solid, { boqLineId: `${face}:rails` });
    }
  });

  /* ---- internal MDF-lining support battens (spec §7) — rendered ONLY when the BOQ took them off.
   * COUNT + section per face come straight from the priced BOQ (front/rear/left/right :mdf-support-v/-h),
   * never recomputed here. Each batten is CLIPPED against the door/window openings on its wall — read
   * from the SAME obstacles the interior draws — so no member ever passes through a door or window.
   * Interior positions never duplicate the corner columns. */
  const mdfInset = WALL_T + (insulated ? INS_T : 0) + (lined ? INT_T : 0);
  const faceOpenings: Record<string, { aLo: number; aHi: number; zLo: number; zHi: number }[]> = {
    front: [], rear: [], left: [], right: [],
  };
  for (const ob of cabinObstacles(config)) {
    if (ob.kind !== "door" && ob.kind !== "window") continue;
    const xs = ob.poly.map((p) => p.x), ys = ob.poly.map((p) => p.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const dRear = y0, dFront = W - y1, dLeft = x0, dRight = L - x1;
    const m = Math.min(dRear, dFront, dLeft, dRight);
    if (m > 250) continue; // an interior / partition door — not on an external wall
    const pad = 20;                                  // small clear margin so a batten never grazes an edge
    const zLo = (ob.fromHeightMm ?? FLOOR_TOP) - pad;
    const zHi = (ob.toHeightMm ?? Htop) + pad;
    const rectX = { aLo: x0 - pad, aHi: x1 + pad, zLo, zHi };
    const rectY = { aLo: y0 - pad, aHi: y1 + pad, zLo, zHi };
    if (m === dRear) faceOpenings.rear.push(rectX);
    else if (m === dFront) faceOpenings.front.push(rectX);
    else if (m === dLeft) faceOpenings.left.push(rectY);
    else faceOpenings.right.push(rectY);
  }
  /** The sub-segments of [lo,hi] left after removing every hole interval (drops hairline slivers). */
  const carve = (lo: number, hi: number, holes: [number, number][]): [number, number][] => {
    let segs: [number, number][] = [[lo, hi]];
    for (const [h0, h1] of holes) {
      const next: [number, number][] = [];
      for (const [s0, s1] of segs) {
        if (h1 <= s0 || h0 >= s1) { next.push([s0, s1]); continue; }
        if (h0 > s0) next.push([s0, Math.min(h0, s1)]);
        if (h1 < s1) next.push([Math.max(h1, s0), s1]);
      }
      segs = next;
    }
    return segs.filter(([a, b]) => b - a > 30);
  };

  wallFaces.forEach(({ face, horiz }) => {
    const wallLen = horiz ? L : W;
    const nV = memberCount(`${face}:mdf-support-v`);
    const nH = memberCount(`${face}:mdf-support-h`);
    if (nV + nH === 0) return;
    const ops = faceOpenings[face];
    const inward: Vec3 =
      face === "rear" ? { x: 0, y: 1, z: 0.25 } : face === "front" ? { x: 0, y: -1, z: 0.25 }
      : face === "left" ? { x: 1, y: 0, z: 0.25 } : { x: -1, y: 0, z: 0.25 };

    // place a batten box on the room face: [aLo,aHi] along the wall, [zLo,zHi] in height, depth `t`.
    const battenSolid = (aLo: number, aHi: number, zLo: number, zHi: number, t: number): PartSolid =>
      face === "rear" ? box(aLo, mdfInset, zLo, aHi, mdfInset + t, zHi)
      : face === "front" ? box(aLo, W - mdfInset - t, zLo, aHi, W - mdfInset, zHi)
      : face === "left" ? box(mdfInset, aLo, zLo, mdfInset + t, aHi, zHi)
      : box(L - mdfInset - t, aLo, zLo, L - mdfInset, aHi, zHi);

    // vertical battens — floor to eave at each position, carved around openings in the HEIGHT axis
    const sv = xsec(`${face}:mdf-support-v`, MEMBER_STUD);
    evenLines(wallLen, nV).forEach((a, i) => {
      const w = sv.across / 2;
      const holes = ops.filter((o) => a >= o.aLo && a <= o.aHi).map((o) => [o.zLo, o.zHi] as [number, number]);
      carve(FLOOR_TOP, Htop, holes).forEach(([z0, z1], k) => {
        s.add(`${face}:mdf-support-v:${i}-${k}`, "mdf-support", `Internal MDF support batten — ${face}`,
          battenSolid(a - w, a + w, z0, z1, sv.through), { boqLineId: `${face}:mdf-support-v`, explode: inward });
      });
    });
    // horizontal battens — along the wall at each height, carved around openings in the ALONG axis
    const sh = xsec(`${face}:mdf-support-h`, MEMBER_STUD);
    evenLines(Htop, nH).forEach((z, i) => {
      const w = sh.across / 2;
      const holes = ops.filter((o) => z >= o.zLo && z <= o.zHi).map((o) => [o.aLo, o.aHi] as [number, number]);
      carve(0, wallLen, holes).forEach(([a0, a1], k) => {
        s.add(`${face}:mdf-support-h:${i}-${k}`, "mdf-support", `Internal MDF support batten — ${face}`,
          battenSolid(a0, a1, z - w, z + w, sh.through), { boqLineId: `${face}:mdf-support-h`, explode: inward });
      });
    });
  });

  /* ---- 6/7/8. wall skins: external panel, insulation, internal lining -------------------- */
  wallFaces.forEach(({ face, horiz }) => {
    // The skin noun already reads as the material; the "External" prefix is added once here, so the
    // noun must NOT itself start with "external" or the caption doubles up ("External external sheet").
    const panelKey = puf ? "PUF panel" : "sheet";
    // outer skin, then insulation, then lining, each stepped one thickness inward.
    const layers: { kind: PartKind; t: number; boq: string; on: boolean; label: string }[] = [
      { kind: "ext-panel", t: WALL_T, boq: `${face}:ext-sheet`, on: true, label: `External ${panelKey} — ${face}` },
      { kind: "insulation", t: INS_T, boq: `${face}:insulation`, on: insulated, label: `Wall insulation — ${face}` },
      { kind: "int-finish", t: INT_T, boq: `${face}:int-sheet`, on: lined, label: `Internal lining — ${face}` },
    ];
    let inset = 0;
    for (const layer of layers) {
      if (!layer.on) { inset += 0; continue; }
      const off = inset;
      let solid: PartSolid;
      if (face === "rear") solid = box(0, off, FLOOR_TOP, L, off + layer.t, Htop);
      else if (face === "front") solid = box(0, W - off - layer.t, FLOOR_TOP, L, W - off, Htop);
      else if (face === "left") solid = box(off, 0, FLOOR_TOP, off + layer.t, W, Htop);
      else solid = box(L - off - layer.t, 0, FLOOR_TOP, L - off, W, Htop);
      s.add(`${face}:${layer.kind}`, layer.kind, layer.label, solid, {
        boqLineId: layer.boq,
        opacity: layer.kind === "ext-panel" ? 0.9 : undefined,
      });
      inset += layer.t;
    }
  });

  /* ---- 11. roof frame — top perimeter + ridge, cross-section from their sections --------- */
  const tfl = xsec("roof:top-frame-long", MEMBER_COL);
  const tfc = xsec("roof:top-frame-cross", MEMBER_COL);
  s.add("roof:top-frame-a", "roof-frame", "Top frame — longitudinal",
    box(0, 0, Htop, L, tfl.across, Htop + tfl.through), { boqLineId: "roof:top-frame-long" });
  s.add("roof:top-frame-b", "roof-frame", "Top frame — longitudinal",
    box(0, W - tfl.across, Htop, L, W, Htop + tfl.through), { boqLineId: "roof:top-frame-long" });
  s.add("roof:top-frame-c", "roof-frame", "Top frame — cross",
    box(0, 0, Htop, tfc.across, W, Htop + tfc.through), { boqLineId: "roof:top-frame-cross" });
  s.add("roof:top-frame-d", "roof-frame", "Top frame — cross",
    box(L - tfc.across, 0, Htop, L, W, Htop + tfc.through), { boqLineId: "roof:top-frame-cross" });

  if (sloped) {
    const rg = xsec("roof:ridge", MEMBER_COL);
    s.add("roof:ridge", "roof-frame", "Ridge member",
      box(0, W / 2 - rg.across / 2, ridgeZ - rg.through, L, W / 2 + rg.across / 2, ridgeZ),
      { boqLineId: "roof:ridge" });

    /* ---- 11b. THE ROOF TRUSS as a fabricated unit — rafters + bottom tie + purlins.
     * Every COUNT is read from the priced BOQ (memberCount) and every SECTION from the priced
     * material (xsec); nothing here is recomputed. The truss LINE POSITIONS come from the take-off's
     * own frame geometry (frame.purlins == endToEndLines(Lm, nTruss) on a sloped roof), so the drawn
     * trusses land exactly where the BOQ priced them — first and last flush with the end walls. */
    const ra = xsec("roof:truss-rafter", MEMBER_COL);
    const tie = xsec("roof:truss-tie", MEMBER_COL);
    const pu = xsec("roof:purlins", MEMBER_JOIST);

    const nTie = memberCount("roof:truss-tie");
    const nRafter = memberCount("roof:truss-rafter");           // 2 rafters per truss
    const nTruss = nTie > 0 ? nTie : Math.round(nRafter / 2);

    const framePurlins = frame?.purlins ?? [];
    const trussXs: number[] =
      framePurlins.length === nTruss
        ? framePurlins.map((mM) => mM * 1000)
        : nTruss <= 1
          ? [0]
          : Array.from({ length: nTruss }, (_, i) => (L * i) / (nTruss - 1));

    // bottom ties — horizontal chord across the full width, seated on the top frame (priced cut = Wm)
    trussXs.forEach((x, i) => {
      s.add(`roof:truss-tie:${i}`, "roof-frame", `Roof truss bottom tie — T${i + 1}`,
        box(x - tie.across / 2, 0, Htop, x + tie.across / 2, W, Htop + tie.through),
        { boqLineId: "roof:truss-tie", spec: { partMark: `T${i + 1}`, note: "Shop-welded to both rafters" } });
    });

    // rafter pairs — eave → ridge. The chord length is √((W/2)² + rise²), i.e. the SAME number the
    // take-off priced as rafterLenM, because ridgeZ = Htop + riseMm uses the identical rise.
    let drawn = 0;
    for (let i = 0; i < trussXs.length && drawn < nRafter; i++) {
      const x = trussXs[i];
      for (const [yE, yR, side] of [[0, W / 2, "rear"], [W, W / 2, "front"]] as [number, number, string][]) {
        if (drawn >= nRafter) break;
        s.add(`roof:truss-rafter:${i}:${side}`, "roof-frame", `Roof truss rafter — T${i + 1} ${side}`, {
          kind: "quad",
          thicknessMm: ra.across,
          pts: [
            { x, y: yE, z: Htop }, { x, y: yR, z: ridgeZ },
            { x, y: yR, z: ridgeZ - ra.through }, { x, y: yE, z: Htop - ra.through },
          ],
        }, { boqLineId: "roof:truss-rafter", spec: { partMark: `T${i + 1}`, note: "Fully welded to the tie at the heel and to its pair at the apex" } });
        drawn++;
      }
    }

    /* ---- 11c. CONNECTION DETAILING (presentation only — never priced, never in the take-off).
     * Shop practice: every INTERNAL truss joint (apex + both eave heels) is FULLY WELDED, so the truss
     * arrives as one ready-fabricated unit. The truss is then BOLTED down to the top frame through a
     * pair of connection plates — one each side of the rafter web — at each eave bearing. */
    const PLATE_T = 8;                       // connection plate thickness (mm)
    const PLATE_L = 200, PLATE_H = 150;      // plate size (mm)
    const BOLT_D = 12, HOLE_D = 14;          // M12 bolt in a 14 mm drilled hole (2 mm clearance)
    const BOLTS_PER_JOINT = 2;
    const TORQUE_NM = 80;                    // M12 property class 8.8
    const WELD_MM = 6;                       // 6 mm fillet, all round
    const boltSpec = `M${BOLT_D} × 40 property class 8.8`;
    const plateSize = `${PLATE_L} × ${PLATE_H} × ${PLATE_T} mm`;

    trussXs.forEach((x, i) => {
      const mark = `T${i + 1}`;
      // --- the two eave BEARINGS: plates both sides + a bolt group through them ---
      for (const [yE, side] of [[0, "rear"], [W, "front"]] as [number, string][]) {
        const cid = `C${i + 1}-${side}`;
        const yLo = yE === 0 ? 0 : W - PLATE_L;
        const detail = {
          partMark: mark, connectionId: cid,
          plateThkMm: PLATE_T, plateSizeMm: plateSize,
          boltSpec, boltCount: BOLTS_PER_JOINT, holeDiaMm: HOLE_D, torqueNm: TORQUE_NM,
          note: `Truss ${mark} bearing — plates BOTH sides, ${BOLTS_PER_JOINT} × M${BOLT_D} bolts, nut + spring washer + flat washer, tighten to ${TORQUE_NM} Nm`,
        };
        // one plate on each face of the rafter web
        for (const [nSide, xPlate] of [["near", x - ra.across / 2 - PLATE_T], ["far", x + ra.across / 2]] as [string, number][]) {
          s.add(`roof:truss-plate:${i}:${side}:${nSide}`, "gusset-plate",
            `Connection plate ${cid} (${nSide} face) — ${plateSize}`,
            box(xPlate, yLo, Htop - PLATE_H / 2, xPlate + PLATE_T, yLo + PLATE_L, Htop + PLATE_H / 2),
            { spec: detail });
        }
        // the bolt group — bolts pass through BOTH plates and the member between them
        for (let b = 0; b < BOLTS_PER_JOINT; b++) {
          const yB = yLo + PLATE_L * (b === 0 ? 0.25 : 0.75);
          s.add(`roof:truss-bolt:${i}:${side}:${b}`, "fastener",
            `${boltSpec} — ${cid} bolt ${b + 1}/${BOLTS_PER_JOINT} (⌀${HOLE_D} mm hole)`,
            box(x - ra.across / 2 - PLATE_T - 6, yB - BOLT_D / 2, Htop - BOLT_D / 2,
                x + ra.across / 2 + PLATE_T + 6, yB + BOLT_D / 2, Htop + BOLT_D / 2),
            { spec: detail });
        }
      }
      // --- the fully-welded INTERNAL joints: 2 heels + 1 apex, marked for the fabricator ---
      const weld = (tag: string, wx: number, wy: number, wz: number, joint: string) =>
        s.add(`roof:truss-weld:${i}:${tag}`, "fastener",
          `Weld ${joint} — ${WELD_MM} mm fillet, all round (shop)`,
          box(wx - ra.across / 2, wy - 40, wz - 40, wx + ra.across / 2, wy + 40, wz + 40),
          { spec: {
              partMark: mark, connectionId: `W${i + 1}-${tag}`,
              weldType: `${WELD_MM} mm fillet weld, all round`, weldSizeMm: WELD_MM, weldLengthMm: 2 * (ra.across + ra.through),
              note: `Shop weld — ${joint}. Fully welded before dispatch; no site welding required.`,
            } });
      weld("heel-rear", x, 0 + 40, Htop, "rafter → bottom tie (rear heel)");
      weld("heel-front", x, W - 40, Htop, "rafter → bottom tie (front heel)");
      weld("apex", x, W / 2, ridgeZ - 40, "rafter → rafter (apex)");
    });

    // purlins — run along the LENGTH (priced cut = Lm), riding the same rafter chord as the roof sheet
    const nPurlin = memberCount("roof:purlins");
    const nPerSlope = Math.max(1, Math.round(nPurlin / 2));
    let pDrawn = 0;
    for (let k = 0; k < nPerSlope && pDrawn < nPurlin; k++) {
      const tk = nPerSlope <= 1 ? 0 : k / (nPerSlope - 1);
      const z = Htop + tk * riseMm;
      for (const y of [tk * (W / 2), W - tk * (W / 2)]) {
        if (pDrawn >= nPurlin) break;
        s.add(`roof:purlin:${pDrawn}`, "roof-frame", "Roof purlin",
          box(0, y - pu.across / 2, z, L, y + pu.across / 2, z + pu.through),
          { boqLineId: "roof:purlins" });
        pDrawn++;
      }
    }
  }

  /* ---- 12. roof sheets ------------------------------------------------------------------ */
  if (sloped) {
    // ridge along the length at the width centre; sheds to both width sides.
    s.add("roof:sheet:rear", "roof-sheet", "Roof sheet (rear slope)", {
      kind: "quad", thicknessMm: ROOF_T,
      pts: [
        { x: 0, y: 0, z: Htop }, { x: L, y: 0, z: Htop },
        { x: L, y: W / 2, z: ridgeZ }, { x: 0, y: W / 2, z: ridgeZ },
      ],
    }, { boqLineId: "roof:sheet" });
    s.add("roof:sheet:front", "roof-sheet", "Roof sheet (front slope)", {
      kind: "quad", thicknessMm: ROOF_T,
      pts: [
        { x: 0, y: W / 2, z: ridgeZ }, { x: L, y: W / 2, z: ridgeZ },
        { x: L, y: W, z: Htop }, { x: 0, y: W, z: Htop },
      ],
    }, { boqLineId: "roof:sheet" });
  } else {
    s.add("roof:sheet", "roof-sheet", "Roof sheet (flat)",
      box(0, 0, Htop + MEMBER_COL, L, W, Htop + MEMBER_COL + ROOF_T), { boqLineId: "roof:sheet" });
  }

  /* ---- 13. ceiling ---------------------------------------------------------------------- */
  s.add("roof:ceiling", "ceiling", "Ceiling lining",
    box(0, 0, Htop - CEILING_T, L, W, Htop), { boqLineId: "roof:ceiling", opacity: 0.85 });
  if (insulated) {
    s.add("roof:insulation", "insulation", "Roof / ceiling insulation",
      box(0, 0, Htop - CEILING_T - INS_T, L, W, Htop - CEILING_T), { boqLineId: "roof:insulation" });
  }

  /* ---- lifting hooks -------------------------------------------------------------------- */
  const nHooks = (config.length || 0) * (config.width || 0) > 100 ? 4 : 2;
  const hookPts = nHooks === 4
    ? [[MEMBER_COL, MEMBER_COL], [L - MEMBER_COL, MEMBER_COL], [L - MEMBER_COL, W - MEMBER_COL], [MEMBER_COL, W - MEMBER_COL]]
    : [[MEMBER_COL, W / 2], [L - MEMBER_COL, W / 2]];
  hookPts.forEach(([hx, hy], i) => {
    s.add(`roof:hook:${i}`, "lifting-hook", "Lifting hook",
      box(hx - 30, hy - 30, Htop + MEMBER_COL, hx + 30, hy + 30, Htop + MEMBER_COL + 90),
      { boqLineId: "roof:lifting-hooks" });
  });

  /* ---- 9/10/14/15/16. interior — verbatim from cabinObstacles(config) ------------------- */
  addInterior(s, config, Htop);

  /* ---- electrical points (lights / fans / sockets) derived from the real counts --------- */
  addElectrical(s, config, rooms, Htop);

  /* ---- 16. parametric furniture tables -------------------------------------------------- */
  (config.tables ?? []).forEach((t) => addTable(s, t));

  /* ---- assemble ------------------------------------------------------------------------- */
  const bounds = computeBounds(s.parts, L, W, sloped ? ridgeZ + ROOF_T : Htop + MEMBER_COL + ROOF_T);
  return {
    parts: s.parts,
    assembly: ASSEMBLY_SEQUENCE,
    bounds,
    meta: {
      productId: config.productId,
      title: `${product?.label ?? "Cabin"} ${config.length}×${config.width}`,
      lengthFt: config.length,
      widthFt: config.width,
      heightFt: config.height,
      roofType: sloped ? "sloped" : "flat",
      sloped,
      rooms: rooms.length,
    },
  };
}

/* ------------------------------------------------------------------ interior from obstacles --- */

const OBSTACLE_KIND: Record<string, PartKind> = {
  partition: "partition", door: "door", "door-swing": "door-swing", window: "window",
  fixture: "plumbing-fixture", toilet: "toilet", pantry: "pantry",
  "electrical-panel": "electrical-panel", furniture: "furniture",
  staircase: "furniture", veranda: "furniture",
};

/** Nominal extrusion height (mm) per obstacle family — floor-standing objects rise to these. */
function obstacleHeights(o: Obstacle, Htop: number): { z0: number; z1: number } {
  if (typeof o.fromHeightMm === "number" && typeof o.toHeightMm === "number") {
    return { z0: o.fromHeightMm, z1: o.toHeightMm };          // windows carry their own sill band
  }
  switch (o.kind) {
    case "partition": return { z0: FLOOR_TOP, z1: Htop };
    case "door": return { z0: FLOOR_TOP, z1: Math.min(DOOR_H_DEFAULT_MM, Htop) };
    case "door-swing": return { z0: FLOOR_TOP, z1: FLOOR_TOP + 12 };
    case "toilet": return { z0: FLOOR_TOP, z1: Htop };
    case "electrical-panel": return { z0: FLOOR_TOP + 900, z1: FLOOR_TOP + 1500 };
    case "pantry": return { z0: FLOOR_TOP, z1: FLOOR_TOP + 850 };
    case "fixture": return { z0: FLOOR_TOP, z1: FLOOR_TOP + 800 };
    default: return { z0: FLOOR_TOP, z1: FLOOR_TOP + 750 };   // loose furniture bounding boxes
  }
}

function addInterior(s: ModelSink, config: CabinConfig, Htop: number): void {
  for (const o of cabinObstacles(config)) {
    const kind = OBSTACLE_KIND[o.kind] ?? "furniture";
    const { z0, z1 } = obstacleHeights(o, Htop);
    s.add(o.id, kind, o.label, prism(o.poly, z0, z1), {
      opacity: kind === "door-swing" ? 0.25 : kind === "window" ? 0.55 : undefined,
      spec: { note: o.hard ? undefined : "advisory clearance" },
    });
  }
}

/* ------------------------------------------------------------------ electrical points --------- */

function addElectrical(
  s: ModelSink, config: CabinConfig,
  rooms: { index: number; x0: number; x1: number }[], Htop: number,
): void {
  if (isToiletCabin(config.productId)) {
    // toilet cabins use an exhaust fan instead of ceiling lights/room fans
    const ex = Math.round(config.electrical?.exhaust ?? config.ventilation?.exhaust ?? 0);
    for (let i = 0; i < ex; i++) {
      s.add(`fan:exhaust:${i}`, "fan", "Exhaust fan",
        box(config.length * MM_PER_FT / 2 - 150, 40, Htop - 350, config.length * MM_PER_FT / 2 + 150, 200, Htop - 50));
    }
    return;
  }

  const { widthMm: W } = cabinSizeMm(config);
  const lights = Math.round((config.electrical?.led ?? 0) + (config.electrical?.tube ?? 0));
  const fans = Math.round(config.electrical?.fan ?? 0);

  // spread lights + fans across the ceiling, proportionally per room (by room x-span)
  const spanTotal = rooms.reduce((a, r) => a + (r.x1 - r.x0), 0) || 1;
  const alloc = (total: number): { x: number; y: number }[] => {
    const pts: { x: number; y: number }[] = [];
    let placed = 0;
    rooms.forEach((r, ri) => {
      const share = ri === rooms.length - 1 ? total - placed : Math.round((total * (r.x1 - r.x0)) / spanTotal);
      placed += share;
      for (let k = 0; k < share; k++) {
        pts.push({ x: r.x0 + ((k + 0.5) / Math.max(1, share)) * (r.x1 - r.x0), y: W / 2 });
      }
    });
    return pts;
  };

  alloc(lights).forEach((p, i) => {
    s.add(`light:${i}`, "light", "Ceiling light",
      box(p.x - 150, p.y - 150, Htop - 60, p.x + 150, p.y + 150, Htop - 20));
  });
  alloc(fans).forEach((p, i) => {
    s.add(`fan:${i}`, "fan", "Ceiling fan",
      box(p.x - 200, p.y - 200, Htop - 260, p.x + 200, p.y + 200, Htop - 200));
  });

  // sockets + switches from the room-wise socket plan (wall + pos 0..1 along the wall)
  const plan = config.socketPlan ?? [];
  const { lengthMm: L } = cabinSizeMm(config);
  plan.forEach((groups, ri) => {
    const room = rooms[ri];
    if (!room) return;
    groups.forEach((g, gi) => {
      const wall = g.wall;
      const horiz = wall === "top" || wall === "bottom";
      const along = horiz ? room.x0 + g.pos * (room.x1 - room.x0) : g.pos * W;
      const put = (kind: PartKind, label: string, zc: number, idx: number) => {
        let x0: number, y0: number, x1: number, y1: number;
        if (wall === "top") { x0 = along - 60; x1 = along + 60; y0 = 0; y1 = 40; }
        else if (wall === "bottom") { x0 = along - 60; x1 = along + 60; y0 = W - 40; y1 = W; }
        else if (wall === "left") { x0 = 0; x1 = 40; y0 = along - 60; y1 = along + 60; }
        else { x0 = L - 40; x1 = L; y0 = along - 60; y1 = along + 60; }
        s.add(`${kind}:r${ri}:${gi}:${idx}`, kind, label, box(x0, y0, zc - 60, x1, y1, zc + 60));
      };
      // each plug point ≈ 2 sockets (300 mm) + 2 switches (1200 mm), per pricing.ts §14 note
      const n = Math.max(1, g.plugCount);
      for (let k = 0; k < n; k++) put("socket", "Socket", 300, k);
      put("switch", "Switch board", 1200, 0);
    });
  });
}

/* ------------------------------------------------------------------ furniture tables ---------- */

function addTable(s: ModelSink, t: CabinTable): void {
  const b = tableWorldBbox(t);
  const h = Math.max(300, t.dimensions?.heightMm ?? 750);
  const poly = rectPoly(b.minX, b.minY, b.maxX, b.maxY);
  s.add(`table:${t.id}`, "furniture", t.name || "Furniture", prism(poly, FLOOR_TOP, FLOOR_TOP + h), {
    spec: {
      lengthMm: t.dimensions?.lengthMm, widthMm: t.dimensions?.depthMm, heightMm: t.dimensions?.heightMm,
      quantity: t.quantity, material: t.material?.materialKey,
    },
  });
}

/* ------------------------------------------------------------------ bounds --------------------- */

function computeBounds(parts: CabinPart[], L: number, W: number, zTop: number): ModelBounds {
  const min: Vec3 = { x: 0, y: 0, z: BASE_Z0 };
  const max: Vec3 = { x: L, y: W, z: zTop };
  for (const p of parts) {
    const s = p.solid;
    if (s.kind === "box") {
      min.x = Math.min(min.x, s.min.x); min.y = Math.min(min.y, s.min.y); min.z = Math.min(min.z, s.min.z);
      max.x = Math.max(max.x, s.max.x); max.y = Math.max(max.y, s.max.y); max.z = Math.max(max.z, s.max.z);
    } else if (s.kind === "prism") {
      for (const pt of s.poly) { min.x = Math.min(min.x, pt.x); min.y = Math.min(min.y, pt.y); max.x = Math.max(max.x, pt.x); max.y = Math.max(max.y, pt.y); }
      min.z = Math.min(min.z, s.z0); max.z = Math.max(max.z, s.z1);
    } else {
      for (const pt of s.pts) { min.x = Math.min(min.x, pt.x); min.y = Math.min(min.y, pt.y); min.z = Math.min(min.z, pt.z); max.x = Math.max(max.x, pt.x); max.y = Math.max(max.y, pt.y); max.z = Math.max(max.z, pt.z); }
    }
  }
  return { min, max };
}
