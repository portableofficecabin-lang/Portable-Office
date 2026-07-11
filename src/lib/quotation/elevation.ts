/**
 * ELEVATION geometry for the Labour Colony calculator (pure, framework-free).
 *
 * Every face (front / rear / left / right) is DERIVED from the same buildRoomFloorPlan()
 * output the 2D floor plan renders — one source of truth, so the plan and the elevations
 * can never disagree on dimensions or positions. All values are METRES; the React drawing
 * scales to pixels and formats labels through the selected length unit.
 *
 * Face conventions (plan is drawn north-up):
 *   front = viewed from the BOTTOM (south) side — plan x axis, unmirrored
 *   rear  = viewed from the TOP (north) side    — plan x axis, MIRRORED
 *   left  = viewed from the LEFT (west) side    — plan y axis, unmirrored
 *   right = viewed from the RIGHT (east) side   — plan y axis, MIRRORED
 *
 * What each face shows, all straight from the plan geometry per floor:
 *   • the walled room-block body (width = the block span on that axis)
 *   • every WINDOW / DOOR whose wall faces the viewer, at its true position/width/height
 *   • veranda bands on that side, with SAFETY RAILING (posts) on every floor when railed
 *   • staircases on that side — side faces get the true stepped flight profile
 *     (steps × riser / going, landing, handrail); front/rear get end silhouettes
 *   • plinth band, per-floor lines, and the roof profile (type / rise / overhang)
 */

import type { LabourColonyResult, RoomFloorPlanConfig } from "./labourColony";
import { buildRoomFloorPlan, type RoomFloorPlanGeom, type FPStair } from "./roomFloorPlan";

export type ElevationFace = "front" | "rear" | "left" | "right";

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const round = (n: number, d = 3) => { const f = Math.pow(10, d); return Math.round((n + Number.EPSILON) * f) / f; };

export interface ElevOpening {
  kind: "door" | "window";
  x0: number;        // elevation-axis position of the opening's left edge (m)
  wM: number;        // opening width (m)
  sillM: number;     // bottom of the opening above the floor level (m); doors = 0
  hM: number;        // opening height (m)
  floor: number;     // 0-based floor index
  roomNo: number;
}

export interface ElevRail {
  x0: number; x1: number; // extent along the elevation axis (m)
  floor: number;          // railing drawn at this floor's level
}

export interface ElevStairShape {
  x0: number; wM: number;     // extent along the elevation axis (m)
  riseM: number;              // total rise of the flight (steps × riser)
  lowAtStart: boolean;        // flight's LOW end is at x0 (profile faces only)
  profile: boolean;           // true = true stepped profile (side faces); false = end silhouette
  steps: number; goingM: number; riserM: number; landingM: number;
  handrail: boolean;
  label: string;
}

export interface ElevationGeom {
  face: ElevationFace;
  x0: number; x1: number;         // full horizontal extent incl. verandas + stairs (m)
  bodyX0: number; bodyX1: number; // walled room-block extent (m)
  plinthM: number;
  floorHM: number;
  floors: number;
  bodyHM: number;                 // floors × floorH (above plinth)
  roof: { type: "gable" | "hip" | "flat" | "mono"; riseM: number; overhangM: number };
  totalHM: number;                // plinth + body + roof rise
  totalWidthM: number;            // x1 - x0 (must equal the plan's total on this axis)
  openings: ElevOpening[];
  rails: ElevRail[];
  stairs: ElevStairShape[];
}

/** Resolve the roof config with defaults. */
export function resolveRoof(fp: RoomFloorPlanConfig | undefined) {
  const r = fp?.roof ?? {};
  const type = r.type === "hip" || r.type === "flat" || r.type === "mono" ? r.type : "gable";
  const riseM = type === "flat" ? 0.15 : Math.max(0.2, r.riseM ?? 0.7);
  const overhangM = Math.max(0, r.overhangM ?? 0.3);
  return { type, riseM, overhangM } as ElevationGeom["roof"];
}

/** Default window sill: lintel ~0.3 m below the ceiling, sill ≥ 0.15 m. */
function sillFor(floorH: number, winH: number): number {
  return Math.max(0.15, floorH - 0.3 - winH);
}

export function buildElevation(
  result: LabourColonyResult,
  fp: RoomFloorPlanConfig | undefined,
  face: ElevationFace,
  opts?: { plinthM?: number },
): ElevationGeom {
  const cfg = result.config;
  const floors = Math.max(1, cfg.floors);
  const floorH = Math.max(2.0, cfg.roomHeight || 2.7);
  const plinthM = Math.max(0, opts?.plinthM ?? 0.45);
  const roof = resolveRoof(fp);

  // Ground floor defines the envelope; per-floor geometry supplies each floor's openings.
  const g0 = buildRoomFloorPlan(result, fp, 0);
  const alongX = face === "front" || face === "rear";          // elevation axis = plan x?
  const span0 = alongX ? g0.bounds.minX : g0.bounds.minY;
  const span1 = alongX ? g0.bounds.maxX : g0.bounds.maxY;
  const mirrored = face === "rear" || face === "right";
  // plan coordinate → elevation axis (mirror around the span for rear/right views)
  const T = (a: number, len = 0) => (mirrored ? span1 - (a + len) + span0 : a);

  const bodyLo = alongX ? 0 : 0;
  const bodyHi = alongX ? g0.blockWM : g0.blockDM;
  const [bodyX0, bodyX1] = [T(bodyLo, bodyHi - bodyLo), T(bodyLo, bodyHi - bodyLo) + (bodyHi - bodyLo)];

  /* ---------- openings: walk every floor's plan geometry ---------- */
  // Which plan wall faces the viewer:
  const viewerWall = face === "front" ? "bottom" : face === "rear" ? "top" : face; // left/right map 1:1
  const openings: ElevOpening[] = [];
  const geoms: RoomFloorPlanGeom[] = [];
  for (let f = 0; f < floors; f++) geoms.push(f === 0 ? g0 : buildRoomFloorPlan(result, fp, f));

  for (let f = 0; f < floors; f++) {
    const g = geoms[f];
    for (const room of g.rooms) {
      // WINDOW — always on the veranda-facing (external) wall: "top" for the top row, "bottom" for the bottom row.
      const winWall = room.into === 1 ? "top" : "bottom";
      if (winWall === viewerWall) {
        openings.push({
          kind: "window", floor: f, roomNo: room.no,
          x0: T(room.x + room.winFromLeftM, room.winWM), wM: room.winWM,
          sillM: sillFor(floorH, room.winHM), hM: Math.min(room.winHM, floorH - 0.3),
        });
      }
      // DOORS — any wall; visible when on the viewer's wall AND on the building boundary for side faces.
      for (const d of room.doors) {
        if (d.wall !== viewerWall) continue;
        if ((face === "left" && room.x > 1e-6) || (face === "right" && room.x + room.w < g.blockWM - 1e-6)) continue;
        if ((face === "front" && room.into !== -1 && g.hasBottom) || (face === "rear" && room.into !== 1 && g.hasBottom)) continue;
        const alongStart = d.wall === "top" || d.wall === "bottom" ? room.x : room.y;
        openings.push({
          kind: "door", floor: f, roomNo: room.no,
          x0: T(alongStart + d.posM, d.widthM), wM: d.widthM,
          sillM: 0, hM: Math.min(d.heightM, floorH - 0.15),
        });
      }
    }
  }

  /* ---------- verandas on this side → railing bands on every floor ---------- */
  const rails: ElevRail[] = [];
  const sideOfFace = face === "front" ? "bottom" : face === "rear" ? "top" : face;
  for (const v of g0.verandas) {
    if (v.side !== sideOfFace || !v.railing) continue;
    const a0 = alongX ? v.x : v.y;
    const len = alongX ? v.w : v.d;
    for (let f = 0; f < floors; f++) rails.push({ x0: T(a0, len), x1: T(a0, len) + len, floor: f });
  }

  /* ---------- staircases ---------- */
  const stairs: ElevStairShape[] = [];
  for (const s of g0.stairs) {
    const riseM = (s.steps * s.riserMm) / 1000;
    if ((face === "left" || face === "right") && s.side === face) {
      // true stepped profile: the flight runs along plan y (vertical stair) → along this face's axis
      const a0 = s.y, len = s.d;
      const lowPlanEnd = s.entry === "left" ? a0 : a0 + len;              // entry end = low end
      const e0 = T(a0, len);
      const lowAtStart = mirrored ? !(lowPlanEnd === a0) : lowPlanEnd === a0;
      stairs.push({
        x0: e0, wM: len, riseM: Math.min(riseM, plinthM + floorH), lowAtStart,
        profile: true, steps: s.steps, goingM: s.goingM, riserM: s.riserMm / 1000,
        landingM: s.landingM, handrail: s.handrail, label: s.label,
      });
    } else if (alongX && (s.side === "left" || s.side === "right")) {
      // end silhouette on the long faces — true position + width from the plan
      const a0 = s.x, len = s.w;
      stairs.push({
        x0: T(a0, len), wM: len, riseM: Math.min(riseM, plinthM + floorH), lowAtStart: true,
        profile: false, steps: s.steps, goingM: s.goingM, riserM: s.riserMm / 1000,
        landingM: s.landingM, handrail: s.handrail, label: s.label,
      });
    } else if (!alongX && (s.side === "top" || s.side === "bottom")) {
      const a0 = s.y, len = s.d;
      stairs.push({
        x0: T(a0, len), wM: len, riseM: Math.min(riseM, plinthM + floorH), lowAtStart: true,
        profile: false, steps: s.steps, goingM: s.goingM, riserM: s.riserMm / 1000,
        landingM: s.landingM, handrail: s.handrail, label: s.label,
      });
    } else if (alongX && (s.side === "top" || s.side === "bottom") && s.side === sideOfFace) {
      // stair directly on the viewed side → stepped profile seen end-on; show as profile along x
      const a0 = s.x, len = s.w;
      stairs.push({
        x0: T(a0, len), wM: len, riseM: Math.min(riseM, plinthM + floorH), lowAtStart: true,
        profile: false, steps: s.steps, goingM: s.goingM, riserM: s.riserMm / 1000,
        landingM: s.landingM, handrail: s.handrail, label: s.label,
      });
    }
  }

  /* ---------- extents ---------- */
  const x0 = round(Math.min(span0, ...stairs.map((s) => s.x0), bodyX0));
  const x1 = round(Math.max(span1, ...stairs.map((s) => s.x0 + s.wM), bodyX1));
  const bodyHM = floors * floorH;
  const totalHM = round(plinthM + bodyHM + roof.riseM);

  return {
    face, x0, x1, bodyX0: round(bodyX0), bodyX1: round(bodyX1),
    plinthM, floorHM: floorH, floors, bodyHM: round(bodyHM), roof,
    totalHM, totalWidthM: round(x1 - x0),
    openings, rails, stairs,
  };
}
