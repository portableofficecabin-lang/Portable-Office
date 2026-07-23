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
  /* The noggin is part of the sheet-bearing frame, so it goes in with the joists — BEFORE any sheet
   * is laid over it, which is the whole reason it exists. */
  noggin: 8,
  "floor-board": 8,
  /* The numbered 8'×4' sheets are laid after the joists + noggins are complete and checked. */
  "floor-sheet": 8,
  "floor-finish": 8,
  brace: 9,
  "floor-beam": 11,
  stud: 14,
  rail: 14,
  /* PANEL-SUPPORT SECTIONS.
   * The C-channel defaults to the BASE FRAME step because its primary job is the perimeter deck edge
   * member — it is part of the floor structure, not the wall. Jamb / closing channels used purely to
   * receive a panel edge override this to 14 at build time via `assemblyStep`.
   * The base track, head angle and framed pockets all belong with the wall framing: they must be
   * complete and checked BEFORE the first panel (step 20) is offered up. */
  "c-channel": 6,
  "u-channel": 14,
  "angle-support": 14,
  "pocket-support": 14,
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
  // RAFTER SUPPORT — the bolted cleat, its C-purlin and the MS tube go up WITH the purlin system
  // (step 18); the covering they carry is fixed with the sheeting / ceiling (step 19). Mapping onto
  // the existing 24-step canon keeps the erection sequence additive — nothing is renumbered.
  "rsup-cleat-plate": 18,
  "rsup-bolt": 18,
  "rsup-nut": 18,
  "rsup-washer": 18,
  "rsup-c-purlin": 18,
  "rsup-ms-tube": 18,
  "rsup-cement-sheet": 19,
  "rsup-puf-roof-panel": 19,
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
  noggin: { x: 0, y: 0, z: -0.75 },
  /* The sheets lift CLEAR of the joists in the exploded view — that separation is what lets the
   * viewer read the support grid underneath and see that every joint lands on a member. */
  "floor-sheet": { x: 0, y: 0, z: 1.15 },
  "floor-board": { x: 0, y: 0, z: -0.3 },
  "floor-finish": { x: 0, y: 0, z: -0.15 },
  brace: { x: 0, y: 0, z: 0.5 },
  "floor-beam": { x: 0, y: 0, z: 0.7 },
  stud: { x: 0, y: 0, z: 0.6 },
  rail: { x: 0, y: 0, z: 0.6 },
  /* Panel-support sections travel OUTWARD from the wall they serve, so the exploded view reads as the
   * panel sliding out of its channel. The perimeter C-channel and the base track get a per-edge
   * outward vector at build time; these are the fallbacks. */
  "c-channel": { x: 0, y: 0, z: -0.9 },
  "u-channel": { x: 0, y: 0, z: -0.5 },
  "angle-support": { x: 0, y: 0, z: 0.8 },
  "pocket-support": { x: 0, y: 0, z: 0.6 },
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
  // RAFTER SUPPORT — exploded bottom-up in build order so the detail reads as it is erected:
  // cleat → bolt/nut/washer → C-purlin → MS tube → covering. The tube additionally gets a per-part
  // sideways component at build time (it bolts to the purlin WEB, so it must slide off sideways to
  // reveal the bolted joint rather than lift straight up through the purlin).
  "rsup-cleat-plate": { x: 0, y: 0, z: 1.8 },
  "rsup-bolt": { x: 0, y: 0, z: 2.0 },
  "rsup-nut": { x: 0, y: 0, z: 2.0 },
  "rsup-washer": { x: 0, y: 0, z: 2.0 },
  "rsup-c-purlin": { x: 0, y: 0, z: 2.1 },
  "rsup-ms-tube": { x: 0, y: 0, z: 2.3 },
  "rsup-cement-sheet": { x: 0, y: 0, z: 2.6 },
  "rsup-puf-roof-panel": { x: 0, y: 0, z: 3.2 },
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
  "floor-beam": "structure", joist: "structure", brace: "structure", noggin: "structure",
  "c-channel": "structure", "u-channel": "structure",
  "angle-support": "structure", "pocket-support": "structure",
  "roof-truss": "roof", rafter: "roof", "truss-web": "roof", purlin: "roof", ridge: "roof",
  gusset: "connection", cleat: "connection", "end-plate": "connection", "splice-plate": "connection",
  stiffener: "connection", bolt: "connection", nut: "connection", washer: "connection", weld: "connection",
  "floor-sheet": "walls",
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
  "rsup-cleat-plate": "rafter-support", "rsup-bolt": "rafter-support", "rsup-nut": "rafter-support",
  "rsup-washer": "rafter-support", "rsup-c-purlin": "rafter-support", "rsup-ms-tube": "rafter-support",
  "rsup-cement-sheet": "rafter-support", "rsup-puf-roof-panel": "rafter-support",
};

/** Engineering-mode colour per kind (LITERAL hex — export safe). */
export const COLOR_OF_KIND: Record<ColonyPartKind, string> = {
  pcc: "#9ca3af", footing: "#78716c", pedestal: "#8b8377", "plinth-beam": "#a8a29e",
  "levelling-plate": "#52525b", "base-plate": "#3f3f46", "anchor-bolt": "#27272a",
  column: "#475569", stud: "#94a3b8", rail: "#64748b", "base-beam": "#334155",
  "floor-beam": "#3b4a5e", joist: "#94a3b8", brace: "#0ea5e9", noggin: "#a3b3c6",
  /* Panel-support sections read as a distinct TEAL family so the MS support framework the panels seat
   * into is instantly separable from the primary grey frame in both the 3D and the video. */
  "c-channel": "#0d9488", "u-channel": "#14b8a6", "angle-support": "#2dd4bf", "pocket-support": "#0f766e",
  "roof-truss": "#475569", rafter: "#64748b", "truss-web": "#7c8ca0", purlin: "#93a3b5", ridge: "#334155",
  gusset: "#b45309", cleat: "#c2841a", "end-plate": "#a16207", "splice-plate": "#92400e",
  stiffener: "#b45309", bolt: "#1f2937", nut: "#111827", washer: "#374151", weld: "#ef4444",
  "floor-sheet": "#c79a63",
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
  // Rafter support — the C-purlin and the MS tube take the blue of real painted structural steel, in
  // two distinct shades so the viewer can see the tube is a SEPARATE member bolted to the purlin web.
  "rsup-cleat-plate": "#7c2d12", "rsup-bolt": "#18181b", "rsup-nut": "#0f0f11",
  "rsup-washer": "#3f3f46", "rsup-c-purlin": "#0369a1", "rsup-ms-tube": "#0891b2",
  "rsup-cement-sheet": "#d6d3d1", "rsup-puf-roof-panel": "#e2e8f0",
};

/** Which part families are engineering-only (hidden in the clean customer view). */
export const ENG_ONLY = new Set<ColonyPartKind>([
  "pcc", "footing", "pedestal", "plinth-beam", "levelling-plate", "base-plate", "anchor-bolt",
  "column", "stud", "rail", "base-beam", "floor-beam", "joist", "brace", "noggin",
  "c-channel", "u-channel", "angle-support", "pocket-support",
  /* The numbered sheet setting-out is a fabrication overlay ON the deck the customer already sees
   * (floor-board / floor-finish stay in the customer view untouched) — so it is engineering-only. */
  "floor-sheet",
  "roof-truss", "rafter", "truss-web", "purlin", "ridge",
  "gusset", "cleat", "end-plate", "splice-plate", "stiffener", "bolt", "nut", "washer", "weld",
  "insulation", "door-swing", "veranda-beam", "veranda-joist", "veranda-post",
  // The whole PUF locking system is fabrication detail — hidden in the clean customer view.
  "puf-lock-base-plate", "puf-lock-anchor-bolt", "puf-lock-nut", "puf-lock-washer",
  "puf-lock-c-purlin-left", "puf-lock-c-purlin-right", "puf-lock-weld",
  "puf-lock-panel-seat", "puf-lock-sealant", "puf-lock-isolation-strip",
  // The rafter-support STEEL is fabrication detail. Its COVERINGS are deliberately NOT listed: the
  // ceiling board and the roof panel are the finishes a customer actually sees.
  "rsup-cleat-plate", "rsup-bolt", "rsup-nut", "rsup-washer", "rsup-c-purlin", "rsup-ms-tube",
]);

/**
 * The rafter-support part families, as one set — the "show / hide rafter support" toggle and every
 * schedule filter keys off this rather than re-listing the kinds.
 */
export const RAFTER_SUPPORT_KINDS = new Set<ColonyPartKind>([
  "rsup-cleat-plate", "rsup-bolt", "rsup-nut", "rsup-washer",
  "rsup-c-purlin", "rsup-ms-tube", "rsup-cement-sheet", "rsup-puf-roof-panel",
]);

/** True when a part belongs to the rafter cleat / C-purlin / MS tube support system. */
export function isRafterSupportKind(kind: ColonyPartKind): boolean {
  return RAFTER_SUPPORT_KINDS.has(kind);
}

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
