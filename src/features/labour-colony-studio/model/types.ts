/**
 * LABOUR COLONY ENGINEERING STUDIO — shared structural model types.
 *
 * ONE typed, id'd component graph that drives every studio surface: the 2D fabrication sheets, the
 * interactive Tekla-style 3D model, the exploded assembly, the assembly-video, the component
 * inspector, the BOQ↔drawing highlighting and the drawing-set / report export. Nothing here
 * re-derives priced quantities — the builder (colonyModel.ts) POSITIONS the members the two priced
 * BOQs already took off:
 *
 *   • the SUPERSTRUCTURE steel / envelope / openings come from `buildColonyTakeoff(result).frame`
 *     + per-face `buildElevation()` + per-floor `buildRoomFloorPlan()`, priced by the Material BOQ
 *     (`boqResult`, ids like `${section}:column-corner`, `floor:joist:${c}`, `${face}:brace:${mm}`);
 *   • the SUBSTRUCTURE (footings, pedestals, PCC, plinth beams) comes from the civil engine
 *     (`civilResult` / `FoundationResult`), positioned on the SAME column grid (`buildColumnMarks`);
 *   • connection hardware the priced take-off does NOT itemise (base plates, gussets, cleats, bolts,
 *     nuts, washers, welds) is SYNTHESIZED as engineering-only detail, never invented into a price.
 *
 * so the fabrication drawings, the 3D model and the BOQ can never disagree — the same "the drawing
 * is the BOQ" rule the colony take-off already holds.
 *
 * COORDINATES — colony METRES (NOT cabin mm), right-handed. Origin = plan origin (the room module's
 * top-left, the SAME origin `buildRoomFloorPlan` / `buildElevation` / `buildColumnMarks` use):
 *   +x runs along the building LENGTH   (front/rear elevations measure this)
 *   +y runs across the building WIDTH    (left/right elevations measure this)
 *   +z runs UP                           (0 = natural ground level; ground-floor FFL = plinthM;
 *                                          foundation members sit below z = 0)
 * Pure data — no React, no three.js, no DOM — so it stays server-safe, unit-testable and out of the
 * public bundle.
 */

import type { SheetLayoutResult } from "./sheetLayout";
import type { PanelSupportSpec } from "./panelSupport";

/** A 2-D point in plan metres (footprint polygons). */
export interface Pt {
  x: number;
  y: number;
}

/** A point in colony 3D space (metres). */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * The geometry of one part, in colony metres. Three shapes cover every structural component:
 *  • `box`   — an axis-aligned box (columns, beams, joists, plates, panels, bolts, most parts).
 *  • `prism` — an xy footprint polygon extruded between z0..z1 (foot-prints, hex bolt heads/nuts,
 *              partitions, doors, furniture).
 *  • `quad`  — an arbitrary planar slab given by 4 corners + a thickness (SLOPED roof / rafter
 *              planes and stair-flight soffits, which no axis-aligned box can represent).
 */
export type PartSolid =
  | { kind: "box"; min: Vec3; max: Vec3 }
  | { kind: "prism"; poly: Pt[]; z0: number; z1: number }
  | { kind: "quad"; pts: [Vec3, Vec3, Vec3, Vec3]; thicknessM: number };

/**
 * The construction-sequence step a part belongs to. The number IS the exploded-assembly + video
 * step — parts appear in this order and separate along their explode vector. A civil-led erection
 * sequence: substructure → base frame → columns → floors → framing → skins → roof → fit-out.
 * 24 = the collapsed, completed colony (never assigned to a part).
 */
export type ColonyAssemblyStep =
  | 1  // PCC / lean concrete bed
  | 2  // isolated footings
  | 3  // pedestals / columns starter
  | 4  // plinth beams
  | 5  // base plates + anchor bolts (steel-to-foundation)
  | 6  // ground-floor base frame (longitudinal + transverse beams)
  | 7  // ground-floor columns
  | 8  // ground-floor floor joists + deck
  | 9  // ground-floor bracing
  | 10 // ground-floor / transfer trusses
  | 11 // first-floor beams
  | 12 // first-floor columns + splices
  | 13 // first-floor joists + deck
  | 14 // wall studs + rails (framing)
  | 15 // staircase
  | 16 // corridor + veranda framing + walkway plate
  | 17 // roof trusses + rafters
  | 18 // roof purlins + bracing
  | 19 // roof sheeting + ceiling
  | 20 // wall panels / cladding / lining / insulation + partitions
  | 21 // doors + windows
  | 22 // railings + toe plates
  | 23 // electrical + plumbing + furniture / bunks
  | 24; // completed colony (collapsed state — never assigned)

/**
 * The broad family a part belongs to. Drives the 3D material/colour, the coarse visibility toggles
 * and the customer/engineering view masks. Kept close to both BOQs' vocabulary so a part maps cleanly
 * to a BoqLine (superstructure) or a civil line (substructure).
 */
export type ColonyPartKind =
  // substructure (civil)
  | "pcc" | "footing" | "pedestal" | "plinth-beam"
  // steel-to-foundation connection
  | "base-plate" | "anchor-bolt" | "levelling-plate"
  // primary steel frame
  | "column" | "stud" | "rail" | "base-beam" | "floor-beam" | "joist" | "joist-web" | "floor-tube" | "brace"
  /** Transverse member added under a flooring-sheet cross joint that lands mid-bay (sheetLayout.ts). */
  | "noggin"
  // roof steelwork
  | "roof-truss" | "rafter" | "truss-web" | "purlin" | "ridge"
  /**
   * PANEL-SUPPORT SECTIONS — the MS framework a sandwich panel is CAPTURED by (panelSupport.ts).
   * A PUF panel has no edge strength, so it is never simply placed on steel: the U-channel grips it
   * at the base, the C-channel receives its vertical edge (and forms the perimeter deck edge member),
   * the angle restrains its head without loading it, and the framed pocket captures it on three sides.
   */
  | "c-channel" | "u-channel" | "angle-support" | "pocket-support"
  // fabricated connections (synthesized engineering detail)
  | "gusset" | "cleat" | "end-plate" | "splice-plate" | "stiffener"
  | "bolt" | "nut" | "washer" | "weld"
  // PUF panel bottom locking system (paired C-purlin receiving pocket on the plinth beam)
  | "puf-lock-base-plate" | "puf-lock-anchor-bolt" | "puf-lock-nut" | "puf-lock-washer"
  | "puf-lock-c-purlin-left" | "puf-lock-c-purlin-right" | "puf-lock-weld"
  | "puf-lock-panel-seat" | "puf-lock-sealant" | "puf-lock-isolation-strip"
  /* RAFTER SUPPORT SYSTEM — a bolted cleat on the rafter carries a C-purlin, and an MS square /
   * rectangular tube is bolted THROUGH THE C-PURLIN WEB (faces flush) to carry the covering: an
   * 8' × 4' fibre-cement sheet at a ceiling level, or a 1000 mm cover-width PUF panel on the sloped
   * roof. Deliberately distinct from the generic `purlin` / `roof-sheet` / `ceiling` kinds so the
   * fabricated support system is scheduled and priced separately and can never double-count them. */
  | "rsup-cleat-plate" | "rsup-bolt" | "rsup-nut" | "rsup-washer"
  | "rsup-c-purlin" | "rsup-ms-tube" | "rsup-cement-sheet" | "rsup-puf-roof-panel"
  // envelope
  /** One numbered 8'×4' deck sheet in the setting-out (sheetLayout.ts). */
  | "floor-sheet"
  | "floor-board" | "floor-finish" | "ext-panel" | "insulation" | "int-finish"
  | "roof-sheet" | "ceiling" | "partition"
  // openings
  | "door" | "door-swing" | "window"
  // stair + railing
  | "stair-stringer" | "stair-tread" | "landing" | "handrail" | "handrail-post" | "toe-plate"
  // corridor / veranda
  | "veranda-beam" | "veranda-joist" | "veranda-post" | "walkway-plate"
  // MEP + fit-out
  | "light" | "fan" | "socket" | "db" | "plumbing-fixture" | "pipe" | "furniture" | "bunk";

/** Which coarse visibility layer a toggle controls. */
export type ColonyPartLayer =
  | "foundation" | "structure" | "connection" | "walls" | "roof" | "openings" | "stair"
  | "electrical" | "plumbing" | "furniture"
  /** The PUF panel bottom locking assemblies — one toggle hides / shows every plate + purlin pair. */
  | "puf-lock"
  /** The rafter cleat / C-purlin / MS tube support system and the covering it carries. */
  | "rafter-support";

/** The two viewing modes. A part visible in customer mode is also visible in engineering. */
export type ViewMode = "engineering" | "customer";

/** Which priced model an item's quantity / rate / weight resolves against. */
export type BoqSource = "steel" | "civil" | "none";

/** Human-facing + fabrication spec, pulled straight from the design + BOQ — surfaced by the inspector. */
export interface PartSpec {
  material?: string;      // resolved material name (Material Master)
  sectionSize?: string;   // e.g. "RHS 100 x 50 x 3 mm"
  grade?: string;         // e.g. "IS 2062 E250" / "Fe500"
  lengthM?: number;       // native colony length (metres)
  widthMm?: number;
  heightMm?: number;
  thicknessMm?: number;
  quantity?: number;      // priced pieces for the line this part belongs to
  unitWeightKg?: number;  // per piece / per m (from Material Master, via BOQ)
  totalWeightKg?: number;
  rate?: number;          // ₹ per unit (from the Material Master, via BOQ)
  amount?: number;        // ₹ line total
  // fabrication / connection detail
  boltSpec?: string;      // "M12 gr 8.8 × 40"
  boltCount?: number;     // bolts in this connection group
  holeDiaMm?: number;
  weldSpec?: string;      // "6 mm fillet · shop weld"
  weldLengthMm?: number;
  // flooring-sheet setting-out (sheetLayout.ts)
  /** Laying sequence mark of a deck sheet, e.g. "S07". */
  sheetMark?: string;
  /** true ⇒ laid whole; false ⇒ cut to fit the perimeter. */
  sheetFull?: boolean;
  /** Support-member centres carrying this sheet (mm). */
  supportSpacingMm?: number;
  /** Bearing available to each sheet at a joint landing on a member (mm). */
  bearingMm?: number;
  // panel seating (panelSupport.ts)
  /** Clear slot width a captured panel edge enters (mm). */
  slotWidthMm?: number;
  /** Minimum depth the panel edge must sit into the section (mm). */
  minInsertionMm?: number;
  /** What this member is structurally doing — surfaced verbatim by the inspector. */
  role?: string;
  /** How the load this member receives reaches the foundation. */
  loadPath?: string;
  note?: string;
}

/**
 * One addressable colony component. `id` is the stable, DETERMINISTIC join key shared across the 2D
 * sheets, the 3D meshes, the exploded animation, the inspector and the BOQ — clicking a part anywhere
 * highlights it everywhere. Where several parts roll up into one aggregated BOQ line (e.g. all
 * `floor:joist:6` joists), they share `boqLineId`, so selecting the line highlights every member.
 *
 * Stable-id convention (spec): `<floor>:<kind>:<locator>`, e.g. `gf:column:A-1`, `gf:joist:z1:03`,
 * `roof:truss:t1:web:03`, `conn:base:A-1:bolt:02`, `foundation:footing:A-1`.
 */
export interface ColonyPart {
  id: string;
  kind: ColonyPartKind;
  layer: ColonyPartLayer;
  label: string;
  solid: PartSolid;
  /** three.js material colour (LITERAL HEX — export-safe, never an oklch / CSS-var token). */
  colorHex: string;
  /** Opacity 0..1; skins default translucent-capable via the renderer's transparent mode. */
  opacity?: number;
  materialKey?: string;   // → Material Master
  /** → BoqLine.id (steel) or civil line id (foundation). May be shared by sibling parts. */
  boqLineId?: string;
  /** Which priced model `boqLineId` lives in — the inspector routes the lookup by this. */
  boqSource: BoqSource;
  geomKey?: string;       // existing wall-segment identity where the BOQ already emits one
  assemblyStep: ColonyAssemblyStep;
  /** Unit direction the part travels in the exploded view (renderer scales it by the explode gap). */
  explode: Vec3;
  spec: PartSpec;
  /** Modes this part shows in. Engineering-only parts (frame, bolts, plates, dims) omit "customer". */
  viewMask: ViewMode[];
  /* ---- fabrication / erection metadata (spec: stable IDs + model data) ---- */
  /** The erection assembly this part is bolted / welded into (parts fly in together). */
  assemblyId?: string;
  /** The connection group bolts / plates / welds share (a bolt cluster + its plates). */
  connectionId?: string;
  /** Fabrication part mark, e.g. `C1`, `PB1`, `BP1`, `T1`. */
  partMark?: string;
  /** Floor index: -1 = foundation, 0 = ground, 1 = first, … */
  floor?: number;
  /** Structural grid reference where applicable, e.g. `A-1`. */
  grid?: string;
  /** Where the part is made / joined: shop-fabricated, site-erected, or a reference (civil) model. */
  fabrication?: "shop" | "site" | "reference";
}

/** One entry in the exploded-assembly / video timeline. */
export interface AssemblyStepInfo {
  step: ColonyAssemblyStep;
  title: string;
  description: string;
}

/** Axis-aligned bounds of the whole model (metres). */
export interface ModelBounds {
  min: Vec3;
  max: Vec3;
}

/** Title-block / drawing-register metadata for the exported drawing set + reports. */
export interface ColonyDrawingMeta {
  projectName: string;
  clientName?: string;
  location?: string;
  drawingNumber?: string;
  revision?: string;
  date?: string;
  scale?: string;
  drawnBy?: string;
  checkedBy?: string;
  approvedBy?: string;
  status?: string;
}

/**
 * A deterministic engineering warning surfaced when a resolved quantity cannot physically fit the
 * available space (spec: "Show a deterministic engineering warning … do not silently remove members").
 */
export interface ModelWarning {
  code: string;
  message: string;
  memberId?: string;
  boqLineId?: string;
  required?: number;
  available?: number;
}

/** The whole shared model — the single object every studio surface consumes. */
export interface ColonyModel {
  parts: ColonyPart[];
  assembly: AssemblyStepInfo[];
  bounds: ModelBounds;
  warnings: ModelWarning[];
  /**
   * The resolved PUF panel bottom locking system — config, plate positions, take-off and validation
   * issues, exactly as the parts above were built from. Carried on the model so the detail sheets,
   * the schedules and the reports read the SAME numbers the geometry was built from and never
   * re-derive a pocket width or a piece count. Type: PufLockDerived (model/pufLock).
   */
  pufLock?: import("./pufLock").PufLockDerived;
  /**
   * The resolved RAFTER SUPPORT system — config, derived levels, cleat positions, take-off and
   * validation issues, exactly as the `rsup-*` parts above were built from. Carried on the model for
   * the same reason `pufLock` is: the detail sheets, the assembly video captions, the schedules and
   * the reports must read the SAME numbers the geometry was built from and never re-derive a tube
   * spacing, a sheet count or a weight of their own.
   * Type: RafterSupportDerived (model/rafterSupport).
   */
  rafterSupport?: import("./rafterSupport").RafterSupportDerived;
  /**
   * The flooring-sheet setting-out for one deck: how the 8'×4' sheets tile it, whether every joint
   * lands on a member, the bearing achieved, and the ordering arithmetic (full / cut / offcut /
   * wastage / rounded purchase quantity). ENGINEERING DETAIL — the priced `floor:board` line remains
   * the source of truth for cost; this explains how that area is physically cut and laid.
   */
  deck?: SheetLayoutResult;
  /** How the configured PUF panel thickness is seated and locked into the MS support framework. */
  panelSupport?: PanelSupportSpec;
  /** Convenience header echoed from the config (metres), for titles / labels. */
  meta: {
    projectName: string;
    title: string;
    floors: number;
    totalLengthM: number;
    totalWidthM: number;
    totalHeightM: number;
    rooms: number;
    roofType: string;
    sloped: boolean;
    plinthM: number;
    floorHM: number;
    gridRef: string;
  };
}
