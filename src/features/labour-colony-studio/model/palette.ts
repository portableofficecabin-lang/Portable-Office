/**
 * LABOUR COLONY ENGINEERING STUDIO — component COLOUR PALETTE.
 *
 * Every visible element family gets a user-settable colour that flows through EVERY rendered surface:
 * the interactive 3D model, the exploded view, the assembly video and the exported frames/video. One
 * resolver (`resolvePartColor`) is the single place a part's colour is decided, so a colour chosen in
 * the studio can never appear in the viewer but not the video, or on screen but not in the export.
 *
 * WHY A GROUP, NOT A KIND — the model has ~70 part kinds, which is far too granular to hand an admin.
 * Colours are therefore chosen per COLOUR GROUP ("MS truss", "C-channel", "PUF panel", "bolts & nuts",
 * "railings", …), and `GROUP_OF_KIND` maps every kind into exactly one group. Adding a new part kind
 * is a compile error until it is assigned a group, so the palette can never silently miss a component.
 *
 * WHY IT IS APPLIED AT RENDER TIME, NOT AT BUILD TIME — the shared ColonyModel is cached on a geometry
 * key (see ColonyDrawingStudio) so a rate change re-prices without rebuilding. Baking colour into
 * `part.colorHex` at build time would make every colour tweak a full geometry rebuild of thousands of
 * parts. Resolving at render time keeps the palette instant and leaves the model's own `colorHex`
 * intact as the default, which is what the 2D sheets and exports fall back to.
 *
 * EXPORT-SAFE: literal hex only — never a Tailwind class, CSS variable or oklch() token, both because
 * three.js needs a parseable colour and because html2canvas/PDF export chokes on oklch (see
 * src/lib/pdf/sanitizeColors.ts).
 *
 * Pure data — no React, no three.js, no DOM.
 */

import { COLOR_OF_KIND } from "./assembly";
import type { ColonyPart, ColonyPartKind } from "./types";

/* ------------------------------------------------------------------ groups --------------------- */

/**
 * The colour groups an admin actually chooses from. Ordered the way the picker presents them:
 * substructure first, then primary steel, then the panel-support sections the detailing added, then
 * connections, then skins, then fit-out.
 */
export type ColonyColorGroup =
  // substructure
  | "foundation"
  | "baseConnection"
  // primary steel frame
  | "column"
  | "beam"
  | "joist"
  | "noggin"
  | "brace"
  | "truss"
  | "purlin"
  // panel-support sections (the MS support framework the PUF panels seat into)
  | "cChannel"
  | "uChannel"
  | "angleSupport"
  | "pocketSupport"
  // detailing systems (PUF bottom locking pocket on the plinth; rafter support cleat/purlin/tube)
  | "pufLock"
  | "rafterSupport"
  // fabricated connections
  | "plate"
  | "bolt"
  | "nut"
  | "weld"
  // envelope
  | "floorSheet"
  | "pufPanel"
  | "insulation"
  | "lining"
  | "roofSheet"
  | "partition"
  // openings + access + fit-out
  | "opening"
  | "stair"
  | "railing"
  | "veranda"
  | "walkway"
  | "mep"
  | "furniture";

/** Human label + one-line description for each group, for the colour picker UI. */
export const COLOR_GROUP_META: Record<ColonyColorGroup, { label: string; hint: string }> = {
  foundation: { label: "Foundation", hint: "PCC, footings, pedestals, plinth beams" },
  baseConnection: { label: "Base plates & anchors", hint: "Base plates, anchor bolts, levelling plates" },
  column: { label: "Columns", hint: "All floor columns" },
  beam: { label: "Base & floor beams", hint: "Longitudinal and transverse frame beams" },
  joist: { label: "Floor joists", hint: "The members carrying the flooring sheets" },
  noggin: { label: "Sheet noggins", hint: "Transverse members under the sheet cross joints" },
  brace: { label: "Bracing", hint: "Cross and knee bracing" },
  truss: { label: "MS truss & rafters", hint: "Roof trusses, rafters, webs, ridge" },
  purlin: { label: "Purlins", hint: "Roof purlins and roof bracing" },
  cChannel: { label: "C-channel", hint: "Perimeter edge member and panel jamb / closing channels" },
  uChannel: { label: "U-channel", hint: "Panel base tracks" },
  angleSupport: { label: "Angle supports", hint: "Panel head restraints and angle cleats" },
  pocketSupport: { label: "Framed pockets", hint: "Three-sided panel pockets at columns" },
  pufLock: { label: "PUF bottom lock", hint: "Plinth base plates, anchor bolts and the paired C-purlin panel pocket" },
  rafterSupport: { label: "Rafter support", hint: "Bolted cleats, C-purlins and MS tubes on the rafters" },
  plate: { label: "Side & gusset plates", hint: "Splice, cleat, gusset, end and stiffener plates" },
  bolt: { label: "Bolts", hint: "All bolt shanks and heads" },
  nut: { label: "Nuts & washers", hint: "Nuts and washers" },
  weld: { label: "Weld beads", hint: "Shop and site fillet welds" },
  floorSheet: { label: "Flooring sheets", hint: "8'×4' deck sheets, board and finish" },
  pufPanel: { label: "PUF panels", hint: "External sandwich wall panels" },
  insulation: { label: "Insulation", hint: "Wall insulation layer" },
  lining: { label: "Internal lining", hint: "Internal finish boards" },
  roofSheet: { label: "Roof sheeting", hint: "Roof sheets and ceiling" },
  partition: { label: "Partitions", hint: "Internal partition walls" },
  opening: { label: "Doors & windows", hint: "Door leaves, swings and window units" },
  stair: { label: "Staircase", hint: "Stringers, treads, landings" },
  railing: { label: "Railings", hint: "Handrails, posts and toe plates" },
  veranda: { label: "Veranda framing", hint: "Veranda beams, joists and posts" },
  walkway: { label: "Walkway plate", hint: "Chequered walkway plate" },
  mep: { label: "Electrical & plumbing", hint: "Lights, fans, sockets, DB, fixtures, pipework" },
  furniture: { label: "Furniture & bunks", hint: "Bunks and loose furniture" },
};

/**
 * Every part kind's colour group. Exhaustive by construction — `Record<ColonyPartKind, …>` means a new
 * part kind fails to compile until it is given a group, so the palette can never miss a component.
 */
export const GROUP_OF_KIND: Record<ColonyPartKind, ColonyColorGroup> = {
  pcc: "foundation", footing: "foundation", pedestal: "foundation", "plinth-beam": "foundation",
  "levelling-plate": "baseConnection", "base-plate": "baseConnection", "anchor-bolt": "baseConnection",
  column: "column", "base-beam": "beam", "floor-beam": "beam",
  joist: "joist", "joist-web": "joist", noggin: "noggin", brace: "brace",
  stud: "column", rail: "beam",
  "roof-truss": "truss", rafter: "truss", "truss-web": "truss", ridge: "truss", purlin: "purlin",
  "c-channel": "cChannel", "u-channel": "uChannel",
  "angle-support": "angleSupport", "pocket-support": "pocketSupport",
  gusset: "plate", cleat: "plate", "end-plate": "plate", "splice-plate": "plate", stiffener: "plate",
  bolt: "bolt", nut: "nut", washer: "nut", weld: "weld",
  "floor-sheet": "floorSheet", "floor-board": "floorSheet", "floor-finish": "floorSheet",
  "ext-panel": "pufPanel", insulation: "insulation", "int-finish": "lining",
  "roof-sheet": "roofSheet", ceiling: "roofSheet", partition: "partition",
  door: "opening", "door-swing": "opening", window: "opening",
  "stair-stringer": "stair", "stair-tread": "stair", landing: "stair",
  handrail: "railing", "handrail-post": "railing", "toe-plate": "railing",
  "veranda-beam": "veranda", "veranda-joist": "veranda", "veranda-post": "veranda",
  "walkway-plate": "walkway",
  light: "mep", fan: "mep", socket: "mep", db: "mep", "plumbing-fixture": "mep", pipe: "mep",
  furniture: "furniture", bunk: "furniture",
  "puf-lock-base-plate": "pufLock", "puf-lock-anchor-bolt": "pufLock", "puf-lock-nut": "pufLock",
  "puf-lock-washer": "pufLock", "puf-lock-c-purlin-left": "pufLock", "puf-lock-c-purlin-right": "pufLock",
  "puf-lock-weld": "pufLock", "puf-lock-panel-seat": "pufLock", "puf-lock-sealant": "pufLock",
  "puf-lock-isolation-strip": "pufLock",
  "rsup-cleat-plate": "rafterSupport", "rsup-bolt": "rafterSupport", "rsup-nut": "rafterSupport",
  "rsup-washer": "rafterSupport", "rsup-c-purlin": "rafterSupport", "rsup-ms-tube": "rafterSupport",
  // The rafter-support COVERINGS are the roof/ceiling finish the customer sees, so they recolour
  // with "Roof sheeting" rather than with the support steel that carries them.
  "rsup-cement-sheet": "roofSheet", "rsup-puf-roof-panel": "roofSheet",
};

/* ------------------------------------------------------------------ palette -------------------- */

/** A partial override map — only the groups the admin has actually changed. */
export type ColonyPalette = Partial<Record<ColonyColorGroup, string>>;

/**
 * The default colour of each group, taken from the model's own per-kind engineering colours so the
 * picker opens showing exactly what the viewer is already drawing. The representative kind for each
 * group is the one an admin would recognise it by.
 */
const REPRESENTATIVE_KIND: Record<ColonyColorGroup, ColonyPartKind> = {
  foundation: "footing", baseConnection: "base-plate", column: "column", beam: "base-beam",
  joist: "joist", noggin: "noggin", brace: "brace", truss: "roof-truss", purlin: "purlin",
  cChannel: "c-channel", uChannel: "u-channel", angleSupport: "angle-support", pocketSupport: "pocket-support",
  pufLock: "puf-lock-c-purlin-left", rafterSupport: "rsup-c-purlin",
  plate: "splice-plate", bolt: "bolt", nut: "nut", weld: "weld",
  floorSheet: "floor-sheet", pufPanel: "ext-panel", insulation: "insulation", lining: "int-finish",
  roofSheet: "roof-sheet", partition: "partition", opening: "door", stair: "stair-stringer",
  railing: "handrail", veranda: "veranda-beam", walkway: "walkway-plate", mep: "light", furniture: "furniture",
};

/** The palette the studio opens with — every group at its model default. */
export function defaultPalette(): Required<ColonyPalette> {
  const out = {} as Required<ColonyPalette>;
  for (const g of Object.keys(REPRESENTATIVE_KIND) as ColonyColorGroup[]) {
    out[g] = COLOR_OF_KIND[REPRESENTATIVE_KIND[g]];
  }
  return out;
}

/** Ordered group list for the picker (matches the ColonyColorGroup declaration order). */
export const COLOR_GROUP_ORDER: ColonyColorGroup[] = Object.keys(REPRESENTATIVE_KIND) as ColonyColorGroup[];

const HEX_RE = /^#[0-9a-f]{6}$/i;

/** Accept only a literal 6-digit hex — anything else falls back, keeping three.js and PDF export safe. */
export function isValidHex(value: string | undefined | null): value is string {
  return typeof value === "string" && HEX_RE.test(value);
}

/**
 * THE one place a part's rendered colour is decided.
 *
 * Order: an explicit palette override for the part's group wins; otherwise the part keeps the colour
 * the model built it with (`part.colorHex`), which already encodes any per-part override the builder
 * applied. A malformed override is ignored rather than passed to three.js.
 */
export function resolvePartColor(part: ColonyPart, palette?: ColonyPalette | null): string {
  if (palette) {
    const override = palette[GROUP_OF_KIND[part.kind]];
    if (isValidHex(override)) return override;
  }
  return part.colorHex;
}

/** Convenience for surfaces that only have a kind (legends, schedules, drawing keys). */
export function resolveKindColor(kind: ColonyPartKind, palette?: ColonyPalette | null): string {
  if (palette) {
    const override = palette[GROUP_OF_KIND[kind]];
    if (isValidHex(override)) return override;
  }
  return COLOR_OF_KIND[kind];
}

/** Drop overrides that equal the default, so a saved palette stays small and readable. */
export function compactPalette(palette: ColonyPalette): ColonyPalette {
  const def = defaultPalette();
  const out: ColonyPalette = {};
  for (const g of COLOR_GROUP_ORDER) {
    const v = palette[g];
    if (isValidHex(v) && v.toLowerCase() !== def[g].toLowerCase()) out[g] = v;
  }
  return out;
}

/** Which groups a given model actually contains — the picker hides groups with no parts. */
export function groupsPresentIn(parts: ColonyPart[]): Set<ColonyColorGroup> {
  const out = new Set<ColonyColorGroup>();
  for (const p of parts) out.add(GROUP_OF_KIND[p.kind]);
  return out;
}
