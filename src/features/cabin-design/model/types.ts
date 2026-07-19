/**
 * SHARED CABIN DESIGN MODEL — types (spec: drawing/3D upgrade).
 *
 * ONE typed, id'd component graph that drives every new surface: the 2D engineering sheets, the
 * interactive 3D model, the exploded assembly animation, the component-click inspector, the
 * BOQ↔drawing highlighting and the drawing-set export. Nothing here re-derives geometry — the
 * builder (cabinModel.ts) aggregates the EXISTING producers:
 *
 *   • cabinObstacles(config)           → the whole interior in cabin mm (partitions, doors + swings,
 *                                         windows w/ sill heights, fixtures, toilets, board, furniture)
 *   • buildCabinTakeoff(config).frame  → the priced structural members (posts / joists / purlins)
 *   • tableFootprint(table) + toWorld  → parametric furniture parts
 *
 * so the drawings, the 3D model and the BOQ can never disagree — the same rule the furniture +
 * BOQ subsystems already hold.
 *
 * COORDINATES — cabin MILLIMETRES, right-handed. Origin = the cabin's INNER top-left corner (the
 * SAME origin as TablePosition.xMm/yMm, ModulePlan's (ox,oy) and cabinObstacles):
 *   +x runs along the cabin LENGTH  (left → right)
 *   +y runs along the cabin WIDTH   (rear/"top" wall → front/"door" wall)
 *   +z runs UP                      (0 = finished floor level, increasing toward the roof)
 * mm = feet × 304.8. This is pure data — no React, no three.js, no DOM — so it stays server-safe,
 * unit-testable and out of the public bundle.
 */

import type { Pt } from "@/features/cabin-design/furniture/tables/tableGeometry";

/** A point in cabin 3D space (mm). */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * The geometry of one part, in cabin mm. Three shapes cover every cabin component:
 *  • `box`   — an axis-aligned box (slabs, columns, wall panels, most parts).
 *  • `prism` — an xy footprint polygon extruded between z0..z1 (partitions, doors, furniture — the
 *              polys that arrive from cabinObstacles / tableFootprint are already this shape).
 *  • `quad`  — an arbitrary planar slab given by 4 corner points + a thickness (the SLOPED roof
 *              planes, which no axis-aligned box can represent).
 */
export type PartSolid =
  | { kind: "box"; min: Vec3; max: Vec3 }
  | { kind: "prism"; poly: Pt[]; z0: number; z1: number }
  | { kind: "quad"; pts: [Vec3, Vec3, Vec3, Vec3]; thicknessMm: number };

/**
 * The construction-sequence layer a part belongs to. The number IS the exploded-assembly step
 * (spec §3) — parts appear in this order and separate along their explode vector. Kept as a plain
 * union of the 17 canonical steps so the animation timeline and the layer legend read off one enum.
 */
export type AssemblyStep =
  | 1  // bottom structural frame (base chassis)
  | 2  // flooring support members (joists)
  | 3  // floor board + final flooring
  | 4  // corner columns
  | 5  // wall framing + stiffeners (posts/studs/rails)
  | 6  // external wall sheets / panels
  | 7  // insulation
  | 8  // internal wall finish
  | 9  // partition walls
  | 10 // doors + windows
  | 11 // roof frame
  | 12 // roof sheets / PUF roof panels
  | 13 // ceiling
  | 14 // electrical fittings
  | 15 // plumbing fittings
  | 16 // furniture + accessories
  | 17; // final completed cabin (never assigned to a part; the collapsed state)

/**
 * The broad family a part belongs to. Drives the 3D material/colour, the visibility toggles
 * (structure / walls / roof / furniture / electrical / plumbing) and the customer/engineering view
 * masks. Kept deliberately close to the BOQ's own vocabulary so a part maps cleanly to a BoqLine.
 */
export type PartKind =
  // structure
  | "base-frame" | "joist" | "column" | "stud" | "rail" | "mdf-support" | "roof-frame" | "lifting-hook"
  // envelope
  | "floor-board" | "floor-finish" | "ext-panel" | "insulation" | "int-finish"
  | "roof-sheet" | "ceiling"
  // openings + partitions
  | "partition" | "door" | "door-swing" | "window"
  // MEP
  | "light" | "fan" | "socket" | "switch" | "electrical-panel" | "plumbing-fixture" | "pipe"
  // fit-out
  | "furniture" | "toilet" | "pantry";

/** Which visibility layer a toggle controls. */
export type PartLayer = "structure" | "walls" | "roof" | "openings" | "electrical" | "plumbing" | "furniture";

/** The two viewing modes (spec §6). A part visible in customer mode is also visible in engineering. */
export type ViewMode = "engineering" | "customer";

/** Human-facing spec pulled straight from the design + BOQ — surfaced by the component inspector. */
export interface PartSpec {
  material?: string;      // resolved material name (Material Master), e.g. "MS Square Tube 40×40"
  sectionSize?: string;   // e.g. "40 x 40 x 2 mm"
  lengthMm?: number;
  widthMm?: number;
  heightMm?: number;
  thicknessMm?: number;
  quantity?: number;
  unitWeightKg?: number;
  totalWeightKg?: number;
  rate?: number;          // ₹ per unit (from the Material Master)
  amount?: number;        // ₹ line total
  note?: string;
}

/**
 * One addressable cabin component. `id` is the stable join key shared across the 2D sheets, the 3D
 * meshes, the exploded animation, the inspector and the BOQ — clicking a part anywhere highlights
 * it everywhere. Where several parts roll up into one aggregated BOQ line (e.g. all "front" posts →
 * `front:posts`), they share `boqLineId`, so selecting the line highlights every member it priced.
 */
export interface CabinPart {
  id: string;
  kind: PartKind;
  layer: PartLayer;
  label: string;
  solid: PartSolid;
  /** three.js material colour (LITERAL HEX — export-safe, never an oklch/CSS-var token). */
  colorHex: string;
  /** Opacity 0..1; walls default translucent-capable via the renderer's transparent-wall mode. */
  opacity?: number;
  materialKey?: string;   // → Material Master
  boqLineId?: string;     // → BoqLine.id (may be shared by sibling parts)
  geomKey?: string;       // existing wall-segment identity where the BOQ already emits one
  assemblyStep: AssemblyStep;
  /** Unit direction the part travels in the exploded view (renderer scales it by the explode gap). */
  explode: Vec3;
  spec: PartSpec;
  /** Modes this part shows in. Engineering-only parts (frame, studs, dimensions) omit "customer". */
  viewMask: ViewMode[];
}

/** One entry in the exploded-assembly timeline (spec §3). */
export interface AssemblyStepInfo {
  step: AssemblyStep;
  title: string;
  description: string;
}

/** Axis-aligned bounds of the whole model (mm). */
export interface ModelBounds {
  min: Vec3;
  max: Vec3;
}

/** Title-block / drawing-register metadata for the exported drawing set (spec §8). */
export interface CabinDrawingMeta {
  projectName: string;
  customerName?: string;
  drawingNumber?: string;
  revision?: string;
  date?: string;
  scale?: string;
  drawnBy?: string;
  checkedBy?: string;
  approvedBy?: string;
}

/** The whole shared model — the single object every new surface consumes. */
export interface CabinModel {
  parts: CabinPart[];
  assembly: AssemblyStepInfo[];
  bounds: ModelBounds;
  /** Convenience header echoed from the config (feet), for titles/labels. */
  meta: {
    productId: string;
    title: string;
    lengthFt: number;
    widthFt: number;
    heightFt: number;
    roofType: string;
    sloped: boolean;
    rooms: number;
  };
}
