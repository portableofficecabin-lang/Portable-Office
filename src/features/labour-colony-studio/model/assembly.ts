/**
 * LABOUR COLONY ENGINEERING STUDIO — assembly sequence + per-kind maps.
 *
 * The canonical 24-step civil-led erection order, the human copy for the exploded-animation +
 * assembly-video readout, and the per-kind mapping (construction step, explode direction, coarse
 * layer, colour, engineering-only flag). The exploded view reveals parts up to the current step and
 * slides each one along its explode vector, scaled by the animation's separation gap.
 */

import type {
  AssemblyStepInfo, ColonyAssemblyStep, ColonyPartKind, ColonyPartLayer, ViewMode, Vec3,
} from "./types";

/** The 24-step timeline, in erection order. Step 24 = the collapsed, completed colony. */
export const ASSEMBLY_SEQUENCE: AssemblyStepInfo[] = [
  { step: 1, title: "PCC / lean concrete bed", description: "Levelling PCC bed cast under every footing on the column grid." },
  { step: 2, title: "Isolated footings", description: "RCC isolated footings (F1/F2/F3) cast to their load-sized dimensions." },
  { step: 3, title: "Pedestals", description: "RCC pedestals raised from each footing to plinth level." },
  { step: 4, title: "Plinth beams", description: "Tie / plinth beams cast between pedestals to complete the substructure grid." },
  { step: 5, title: "Base plates & anchor bolts", description: "Holding-down anchor bolts, levelling plates and column base plates set at finished plinth level." },
  { step: 6, title: "Ground-floor base frame", description: "Longitudinal and transverse base-frame beams bolted onto the base plates." },
  { step: 7, title: "Ground-floor columns", description: "Ground-floor columns erected on the base plates and plumbed." },
  { step: 8, title: "Ground-floor joists & deck", description: "Floor joists laid between the base beams and the deck / flooring fixed over them." },
  { step: 9, title: "Ground-floor bracing", description: "Vertical cross / knee bracing installed to stabilise the ground-floor frame." },
  { step: 10, title: "Ground-floor / transfer trusses", description: "Ground-floor transfer trusses installed where the layout carries a floor over." },
  { step: 11, title: "First-floor beams", description: "First-floor perimeter and transverse floor beams landed on the ground-floor columns." },
  { step: 12, title: "First-floor columns & splices", description: "First-floor columns spliced onto the ground-floor columns and plumbed." },
  { step: 13, title: "First-floor joists & deck", description: "First-floor joists and deck fixed to carry the upper accommodation." },
  { step: 14, title: "Wall studs & rails", description: "Wall studs and top / bottom framing rails fixed between the columns on every wall line." },
  { step: 15, title: "Staircase", description: "Staircase stringers, treads, landings and their support framing erected and connected at both ends." },
  { step: 16, title: "Corridor & veranda framing", description: "Corridor / veranda beams, joists and chequered walkway plate installed along the access side." },
  { step: 17, title: "Roof trusses & rafters", description: "Roof trusses / rafters landed on the top of the columns and connected at ridge and eave." },
  { step: 18, title: "Roof purlins & bracing", description: "Purlins and roof wind-bracing fixed across the trusses to receive the sheeting." },
  { step: 19, title: "Roof sheeting & ceiling", description: "Roofing sheets, ridge / eave flashing and the internal ceiling lining fixed." },
  { step: 20, title: "Wall panels & partitions", description: "External cladding, insulation, internal lining and internal partitions installed." },
  { step: 21, title: "Doors & windows", description: "Door leaves and window units set into their framed openings." },
  { step: 22, title: "Railings", description: "Handrail posts, top / mid rails and toe plates fixed along corridors, verandas and stairs." },
  { step: 23, title: "Electrical, plumbing & fit-out", description: "Lights, fans, sockets, distribution board, wet fixtures, pipework and furniture / bunks fitted." },
  { step: 24, title: "Completed colony", description: "Every component assembled in its final position." },
];

/** Which construction step each part family belongs to. */
export const STEP_OF_KIND: Record<ColonyPartKind, ColonyAssemblyStep> = {
  pcc: 1,
  footing: 2,
  pedestal: 3,
  "plinth-beam": 4,
  "levelling-plate": 5,
  "base-plate": 5,
  "anchor-bolt": 5,
  "base-beam": 6,
  column: 7,
  joist: 8,
  "floor-board": 8,
  "floor-finish": 8,
  brace: 9,
  "floor-beam": 11,
  stud: 14,
  rail: 14,
  "stair-stringer": 15,
  "stair-tread": 15,
  landing: 15,
  "veranda-beam": 16,
  "veranda-joist": 16,
  "veranda-post": 16,
  "walkway-plate": 16,
  "roof-truss": 17,
  rafter: 17,
  "truss-web": 17,
  ridge: 17,
  purlin: 18,
  "roof-sheet": 19,
  ceiling: 19,
  "ext-panel": 20,
  insulation: 20,
  "int-finish": 20,
  partition: 20,
  door: 21,
  "door-swing": 21,
  window: 21,
  handrail: 22,
  "handrail-post": 22,
  "toe-plate": 22,
  // connection hardware follows the member it joins — grouped late so it reads as "tightening".
  gusset: 17,
  cleat: 14,
  "end-plate": 11,
  "splice-plate": 12,
  stiffener: 11,
  bolt: 6,
  nut: 6,
  washer: 6,
  weld: 6,
  // PUF LOCK — the plate + anchor + welded C-purlin pair IS a base-plate-and-anchor-bolt operation on
  // the plinth beam, so it erects with step 5; the panel only drops into the finished pocket at the
  // wall-panel step (20). Mapping onto the existing 24-step canon keeps the sequence additive.
  "puf-lock-base-plate": 5,
  "puf-lock-anchor-bolt": 5,
  "puf-lock-nut": 5,
  "puf-lock-washer": 5,
  "puf-lock-c-purlin-left": 5,
  "puf-lock-c-purlin-right": 5,
  "puf-lock-weld": 5,
  "puf-lock-isolation-strip": 20,
  "puf-lock-sealant": 20,
  "puf-lock-panel-seat": 20,
  light: 23,
  fan: 23,
  socket: 23,
  db: 23,
  "plumbing-fixture": 23,
  pipe: 23,
  furniture: 23,
  bunk: 23,
};

/**
 * The unit direction a part family flies out in the exploded view. The renderer multiplies this by
 * the separation gap, so magnitude encodes RELATIVE travel (foundations sink, roof lifts, walls fan
 * outward, fit-out lifts clear). Wall / opening / face-specific parts get a face vector at build time.
 */
export const EXPLODE_OF_KIND: Record<ColonyPartKind, Vec3> = {
  pcc: { x: 0, y: 0, z: -3.0 },
  footing: { x: 0, y: 0, z: -2.6 },
  pedestal: { x: 0, y: 0, z: -2.2 },
  "plinth-beam": { x: 0, y: 0, z: -1.9 },
  "levelling-plate": { x: 0, y: 0, z: -1.6 },
  "base-plate": { x: 0, y: 0, z: -1.4 },
  "anchor-bolt": { x: 0, y: 0, z: -1.5 },
  "base-beam": { x: 0, y: 0, z: -1.1 },
  column: { x: 0, y: 0, z: 0.4 },
  joist: { x: 0, y: 0, z: -0.6 },
  "floor-board": { x: 0, y: 0, z: -0.3 },
  "floor-finish": { x: 0, y: 0, z: -0.15 },
  brace: { x: 0, y: 0, z: 0.5 },
  "floor-beam": { x: 0, y: 0, z: 0.7 },
  stud: { x: 0, y: 0, z: 0.6 },
  rail: { x: 0, y: 0, z: 0.6 },
  "stair-stringer": { x: -1, y: 0, z: 0.2 },
  "stair-tread": { x: -1, y: 0, z: 0.3 },
  landing: { x: -1, y: 0, z: 0.2 },
  "veranda-beam": { x: 0, y: -1, z: 0.3 },
  "veranda-joist": { x: 0, y: -1, z: 0.2 },
  "veranda-post": { x: 0, y: -1, z: 0.3 },
  "walkway-plate": { x: 0, y: -1, z: 0.1 },
  "roof-truss": { x: 0, y: 0, z: 2.4 },
  rafter: { x: 0, y: 0, z: 2.2 },
  "truss-web": { x: 0, y: 0, z: 2.5 },
  ridge: { x: 0, y: 0, z: 2.7 },
  purlin: { x: 0, y: 0, z: 2.0 },
  "roof-sheet": { x: 0, y: 0, z: 3.0 },
  ceiling: { x: 0, y: 0, z: 1.7 },
  "ext-panel": { x: 0, y: 0, z: 0 },      // overridden per-face
  insulation: { x: 0, y: 0, z: 0 },       // overridden per-face
  "int-finish": { x: 0, y: 0, z: 0 },     // overridden per-face
  partition: { x: 0, y: 0, z: 0.9 },
  door: { x: 0, y: 0, z: 0 },             // overridden per-face
  "door-swing": { x: 0, y: 0, z: 0 },
  window: { x: 0, y: 0, z: 0 },           // overridden per-face
  handrail: { x: 0, y: 0, z: 1.2 },
  "handrail-post": { x: 0, y: 0, z: 1.2 },
  "toe-plate": { x: 0, y: 0, z: 1.1 },
  gusset: { x: 0, y: 0, z: 1.6 },
  cleat: { x: 0, y: 0, z: 1.0 },
  "end-plate": { x: 0, y: 0, z: 1.0 },
  "splice-plate": { x: 0, y: 0, z: 1.2 },
  stiffener: { x: 0, y: 0, z: 1.0 },
  bolt: { x: 0, y: 0, z: 0.9 },
  nut: { x: 0, y: 0, z: 0.9 },
  washer: { x: 0, y: 0, z: 0.9 },
  weld: { x: 0, y: 0, z: 0 },
  // PUF LOCK — the exploded order the spec calls for reads bottom-up off these magnitudes:
  // anchor bolts → plate → washers → nuts → left purlin → right purlin → weld → strip → seal → panel.
  // The two purlins additionally fan APART along the pocket normal, which is stamped per-part at
  // build time (the sign depends on which wall the plate sits on), so the pocket opens up visibly.
  "puf-lock-anchor-bolt": { x: 0, y: 0, z: -1.5 },
  "puf-lock-base-plate": { x: 0, y: 0, z: -1.2 },
  "puf-lock-washer": { x: 0, y: 0, z: -0.9 },
  "puf-lock-nut": { x: 0, y: 0, z: -0.6 },
  "puf-lock-c-purlin-left": { x: 0, y: 0, z: 0.5 },
  "puf-lock-c-purlin-right": { x: 0, y: 0, z: 0.5 },
  "puf-lock-weld": { x: 0, y: 0, z: 0.8 },
  "puf-lock-isolation-strip": { x: 0, y: 0, z: 1.1 },
  "puf-lock-sealant": { x: 0, y: 0, z: 1.3 },
  "puf-lock-panel-seat": { x: 0, y: 0, z: 1.8 },
  light: { x: 0, y: 0, z: 1.4 },
  fan: { x: 0, y: 0, z: 1.4 },
  socket: { x: 0, y: 0, z: 0 },           // overridden per-face
  db: { x: 0, y: 0, z: 0.3 },
  "plumbing-fixture": { x: 0, y: 0, z: -0.3 },
  pipe: { x: 0, y: 0, z: -0.3 },
  furniture: { x: 0, y: 0, z: 0.8 },
  bunk: { x: 0, y: 0, z: 0.8 },
};

/** Broad layer each part family belongs to (drives the coarse visibility toggles). */
export const LAYER_OF_KIND: Record<ColonyPartKind, ColonyPartLayer> = {
  pcc: "foundation", footing: "foundation", pedestal: "foundation", "plinth-beam": "foundation",
  "levelling-plate": "foundation", "base-plate": "connection", "anchor-bolt": "connection",
  column: "structure", stud: "structure", rail: "structure", "base-beam": "structure",
  "floor-beam": "structure", joist: "structure", brace: "structure",
  "roof-truss": "roof", rafter: "roof", "truss-web": "roof", purlin: "roof", ridge: "roof",
  gusset: "connection", cleat: "connection", "end-plate": "connection", "splice-plate": "connection",
  stiffener: "connection", bolt: "connection", nut: "connection", washer: "connection", weld: "connection",
  "floor-board": "walls", "floor-finish": "walls", "ext-panel": "walls", insulation: "walls",
  "int-finish": "walls", "roof-sheet": "roof", ceiling: "roof", partition: "walls",
  door: "openings", "door-swing": "openings", window: "openings",
  "stair-stringer": "stair", "stair-tread": "stair", landing: "stair",
  handrail: "stair", "handrail-post": "stair", "toe-plate": "stair",
  "veranda-beam": "structure", "veranda-joist": "structure", "veranda-post": "structure",
  "walkway-plate": "walls",
  light: "electrical", fan: "electrical", socket: "electrical", db: "electrical",
  "plumbing-fixture": "plumbing", pipe: "plumbing", furniture: "furniture", bunk: "furniture",
  "puf-lock-base-plate": "puf-lock", "puf-lock-anchor-bolt": "puf-lock", "puf-lock-nut": "puf-lock",
  "puf-lock-washer": "puf-lock", "puf-lock-c-purlin-left": "puf-lock", "puf-lock-c-purlin-right": "puf-lock",
  "puf-lock-weld": "puf-lock", "puf-lock-panel-seat": "puf-lock", "puf-lock-sealant": "puf-lock",
  "puf-lock-isolation-strip": "puf-lock",
};

/** Engineering-mode colour per kind (LITERAL hex — export safe). */
export const COLOR_OF_KIND: Record<ColonyPartKind, string> = {
  pcc: "#9ca3af", footing: "#78716c", pedestal: "#8b8377", "plinth-beam": "#a8a29e",
  "levelling-plate": "#52525b", "base-plate": "#3f3f46", "anchor-bolt": "#27272a",
  column: "#475569", stud: "#94a3b8", rail: "#64748b", "base-beam": "#334155",
  "floor-beam": "#3b4a5e", joist: "#94a3b8", brace: "#0ea5e9",
  "roof-truss": "#475569", rafter: "#64748b", "truss-web": "#7c8ca0", purlin: "#93a3b5", ridge: "#334155",
  gusset: "#b45309", cleat: "#c2841a", "end-plate": "#a16207", "splice-plate": "#92400e",
  stiffener: "#b45309", bolt: "#1f2937", nut: "#111827", washer: "#374151", weld: "#ef4444",
  "floor-board": "#b98a52", "floor-finish": "#d9bb8f", "ext-panel": "#cbd5e1", insulation: "#facc15",
  "int-finish": "#e7ecf2", "roof-sheet": "#9aa7b4", ceiling: "#eef2f7", partition: "#c7b299",
  door: "#8b5a2b", "door-swing": "#cbd5e1", window: "#a8c8e0",
  "stair-stringer": "#57534e", "stair-tread": "#a8a29e", landing: "#78716c",
  handrail: "#0891b2", "handrail-post": "#0e7490", "toe-plate": "#155e75",
  "veranda-beam": "#3b4a5e", "veranda-joist": "#94a3b8", "veranda-post": "#475569", "walkway-plate": "#71717a",
  light: "#fde68a", fan: "#94a3b8", socket: "#475569", db: "#334155",
  "plumbing-fixture": "#bae6fd", pipe: "#7dd3fc", furniture: "#d9bb8f", bunk: "#e7d3b3",
  // PUF lock — the two purlins are deliberately DIFFERENT greens so the viewer can see at a glance
  // that the panel is captured between two SEPARATE members, not one folded channel.
  "puf-lock-base-plate": "#334155", "puf-lock-anchor-bolt": "#18181b", "puf-lock-nut": "#0f0f11",
  "puf-lock-washer": "#3f3f46", "puf-lock-c-purlin-left": "#0f766e", "puf-lock-c-purlin-right": "#15803d",
  "puf-lock-weld": "#ef4444", "puf-lock-panel-seat": "#cbd5e1", "puf-lock-sealant": "#a3a3a3",
  "puf-lock-isolation-strip": "#1f2937",
};

/** Which part families are engineering-only (hidden in the clean customer view). */
export const ENG_ONLY = new Set<ColonyPartKind>([
  "pcc", "footing", "pedestal", "plinth-beam", "levelling-plate", "base-plate", "anchor-bolt",
  "column", "stud", "rail", "base-beam", "floor-beam", "joist", "brace",
  "roof-truss", "rafter", "truss-web", "purlin", "ridge",
  "gusset", "cleat", "end-plate", "splice-plate", "stiffener", "bolt", "nut", "washer", "weld",
  "insulation", "door-swing", "veranda-beam", "veranda-joist", "veranda-post",
  // The whole PUF locking system is fabrication detail — hidden in the clean customer view.
  "puf-lock-base-plate", "puf-lock-anchor-bolt", "puf-lock-nut", "puf-lock-washer",
  "puf-lock-c-purlin-left", "puf-lock-c-purlin-right", "puf-lock-weld",
  "puf-lock-panel-seat", "puf-lock-sealant", "puf-lock-isolation-strip",
]);

/**
 * The PUF-lock part families, as one set — the "show / hide locking assemblies" toggle and every
 * schedule filter key off this rather than re-listing the kinds.
 *
 * Deliberately NOT added to CONNECTION_DETAIL: that gate hides its members until the heavy-detail
 * flag is switched on, and the whole point of this system is that the captured panel must be visible
 * in the model. The part count is bounded (one small assembly per plate — a dozen or so), so it costs
 * nothing to render, and the dedicated `puf-lock` layer gives the user a single switch to hide it.
 */
export const PUF_LOCK_KINDS = new Set<ColonyPartKind>([
  "puf-lock-base-plate", "puf-lock-anchor-bolt", "puf-lock-nut", "puf-lock-washer",
  "puf-lock-c-purlin-left", "puf-lock-c-purlin-right", "puf-lock-weld",
  "puf-lock-panel-seat", "puf-lock-sealant", "puf-lock-isolation-strip",
]);

/** True when a part belongs to the PUF panel bottom locking system. */
export function isPufLockKind(kind: ColonyPartKind): boolean {
  return PUF_LOCK_KINDS.has(kind);
}

export function viewMaskOf(kind: ColonyPartKind): ViewMode[] {
  return ENG_ONLY.has(kind) ? ["engineering"] : ["engineering", "customer"];
}

/** True for connection-detail hardware — heavy, so the viewer lazy-loads / gates it (perf, spec §Performance). */
export const CONNECTION_DETAIL = new Set<ColonyPartKind>([
  "base-plate", "anchor-bolt", "gusset", "cleat", "end-plate", "splice-plate", "stiffener",
  "bolt", "nut", "washer", "weld",
]);
