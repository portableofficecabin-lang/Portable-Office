/**
 * Cabin Price Calculator — pricing model & estimate engine.
 *
 * This is the SINGLE SOURCE OF TRUTH for every number the homepage calculator
 * shows. It is intentionally a plain data + pure-function module (no React, no
 * "use client") so the sales team can tune rates here without touching UI code.
 *
 * All figures are indicative ex-works estimates for the Indian market (₹). The
 * calculator makes clear the final quotation is verified by the sales team, so
 * these are calibrated to be realistic-but-conservative starting points, not
 * binding prices. Adjust freely.
 */

export const GST_RATE = 0.18; // 18% GST
export const TRANSPORT_BASE = 18000; // per cabin, local/regional; long-haul varies
export const INSTALLATION_BASE = 15000; // per cabin, standard site install
// Height: 8'6" (8.5 ft) is the standard, no-surcharge height. Each extra FOOT above
// it adds 8% of the base cabin price (prorated for part-feet: 9'0" = +4%, 9'6" = +8%).
export const STANDARD_HEIGHT_FT = 8.5;
export const HEIGHT_SURCHARGE_PER_FT = 0.08;

/** Format a number as Indian Rupees (₹1,23,456). Local copy so this module stays
 *  dependency-free — importing from lib/exportUtils would pull xlsx into the bundle. */
export const formatINR = (n: number | null | undefined): string =>
  `₹${Math.round(Number(n || 0)).toLocaleString("en-IN")}`;

const round = (n: number) => Math.round(n);

/* ------------------------------------------------------------------ *
 * Step 1 — Products
 * baseRatePerSqft is for a standard-spec MS cabin; structure & interior
 * choices adjust from there.
 * ------------------------------------------------------------------ */
export type BadgeType = "Most Chosen" | "Best Value" | "Budget Value" | "Premium";

export interface ProductType {
  id: string;
  label: string;
  icon: string; // lucide-react icon key (mapped in the component)
  baseRatePerSqft: number;
  def: { length: number; width: number; height: number };
  badge?: BadgeType;
  blurb: string;
}

export const PRODUCTS: ProductType[] = [
  // Standard height is 8'6" (8.5 ft) for every product — the no-surcharge baseline.
  // Customers can raise it in the Size step; each extra foot adds HEIGHT_SURCHARGE_PER_FT.
  { id: "porta-cabin",     label: "Porta Cabin",         icon: "building",   baseRatePerSqft: 1700, def: { length: 20, width: 10, height: 8.5 }, badge: "Budget Value", blurb: "All-purpose modular cabin" },
  { id: "office-cabin",    label: "Office Cabin",        icon: "briefcase",  baseRatePerSqft: 1850, def: { length: 20, width: 10, height: 8.5 }, badge: "Best Value",  blurb: "Furnished workspace cabin" },
  { id: "security-cabin",  label: "Security Cabin",      icon: "shield",     baseRatePerSqft: 2150, def: { length: 6,  width: 6,  height: 8.5 }, blurb: "Guard booth / gate post" },
  { id: "toilet-cabin",    label: "Toilet Cabin",        icon: "bath",       baseRatePerSqft: 2450, def: { length: 8,  width: 6,  height: 8.5 }, blurb: "Portable washroom block" },
  { id: "accommodation",   label: "Accommodation Cabin", icon: "bedDouble",  baseRatePerSqft: 1600, def: { length: 24, width: 10, height: 8.5 }, blurb: "Bunkhouse / staff stay" },
  { id: "container-office", label: "Container Office",   icon: "container",  baseRatePerSqft: 2000, def: { length: 20, width: 8,  height: 8.5 }, badge: "Premium", blurb: "Insulated container workspace" },
  { id: "site-office",     label: "Site Office",         icon: "layout",     baseRatePerSqft: 1750, def: { length: 20, width: 10, height: 8.5 }, blurb: "On-site project office" },
  { id: "puf-panel-cabin", label: "Puf Panel Cabin",     icon: "panels",     baseRatePerSqft: 2200, def: { length: 20, width: 10, height: 8.5 }, blurb: "PUF-insulated panel cabin" },
  // Living/home products. Default sizes stay under MAX_AUTO_QUOTE_AREA so they always get a
  // real auto-quoted base price (and never drag startingFromEstimate() down to ~0).
  { id: "container-home",  label: "Container Home",      icon: "container",  baseRatePerSqft: 2100, def: { length: 20, width: 8,  height: 8.5 }, blurb: "Insulated container living home" },
  { id: "prefab-modular-home", label: "Prefab Modular Home", icon: "building", baseRatePerSqft: 1950, def: { length: 20, width: 10, height: 8.5 }, blurb: "Modular prefab home — turnkey living space" },
  { id: "storage-container", label: "Storage Container",  icon: "warehouse",  baseRatePerSqft: 1250, def: { length: 20, width: 8,  height: 8.5 }, blurb: "Shipping container for storage" },
];

/* ------------------------------------------------------------------ *
 * Step 3 — Structure (multiplier on base rate)
 * ------------------------------------------------------------------ */
export interface StructureType {
  id: string;
  label: string;
  multiplier: number;
  note: string;
}

export const STRUCTURES: StructureType[] = [
  { id: "ms",        label: "MS Cabin",                       multiplier: 1.0,  note: "Mild-steel frame — economical & sturdy" },
  { id: "gi",        label: "GI Cabin",                       multiplier: 1.12, note: "Galvanised — rust-resistant, longer life" },
  { id: "puf",       label: "Insulated PUF Panel Wall",       multiplier: 1.25, note: "PUF sandwich-panel walls — insulated & thermally efficient" },
  { id: "container", label: "Shipping Container Conversion",  multiplier: 1.28, note: "Corten container base — most rugged" },
];

/** The "Insulated PUF Panel Wall" structure: the sandwich panel IS the finished wall.
 *  There is NO corrugated outer sheet and NO separate thermal-insulation layer (the panel
 *  is inherently insulated), and an interior wall lining is OPTIONAL (recommended: none). */
export const isPufPanel = (structureId: string) => structureId === "puf";

/* ------------------------------------------------------------------ *
 * Roof type — the sloped 2-side roof (sheds to both width sides) is the
 * STANDARD default (₹0). A flat roof is optional and costs +8% of the
 * base cabin price.
 * ------------------------------------------------------------------ */
export const ROOF_FLAT_SURCHARGE = 0.08; // flat roof = +8% of base cabin price
export interface RoofType { id: string; label: string; note: string; surchargePct: number; }
export const ROOF_FLAT_PCT = `${Math.round(ROOF_FLAT_SURCHARGE * 100)}%`; // e.g. "8%" — single source for labels
export const ROOFS: RoofType[] = [
  { id: "sloped", label: "Sloped Roof (2-side)", note: "Twin-slope roof shedding to both width sides — standard", surchargePct: 0 },
  { id: "flat",   label: "Flat Roof",            note: `Single flat / mono-pitch roof — optional (+${ROOF_FLAT_PCT})`, surchargePct: ROOF_FLAT_SURCHARGE },
];
export const findRoof = (id: string): RoofType => ROOFS.find((r) => r.id === id) ?? ROOFS[0];

/* ------------------------------------------------------------------ *
 * Base cabin rate — SIZE-BASED, per CARPET-AREA sq.ft (INTERNAL). The
 * ₹/sqft below is NEVER shown to customers; the calculator uses it to
 * auto-compute the base price from the entered size. Rate falls as the
 * cabin grows; sizes BETWEEN the sample points get a linearly-interpolated
 * "similar" rate. Above MAX_AUTO_QUOTE_AREA (40×10 = 400 sq.ft) we can't
 * auto-quote → 0 = "contact us directly". Tune the sample points here.
 *
 * Anchors set by the owner (carpet-area rates): 4×4 = ₹2300, 6×4 = ₹2000,
 * 10×8 = ₹1100, 10×10 = ₹950, and a ₹900 basic rate across 100–400 sq.ft.
 * The remaining sizes (5×4, 6×6, 8×6, 8×8, 15×10, 20×10) are interpolated
 * onto a smooth descending curve.
 * ------------------------------------------------------------------ */
export const MAX_AUTO_QUOTE_AREA = 400; // sq.ft (40 × 10). Bigger → contact us.
// [carpet-area sq.ft, ₹/sqft] — ascending by area. Sizes below the first point
// (4×4) use the 4×4 rate; 100–400 sq.ft settle at the ₹900 basic rate.
const CABIN_RATE_POINTS: ReadonlyArray<readonly [number, number]> = [
  [16,  2300], // 4×4  (owner rate)
  [20,  2150], // 5×4  (interpolated)
  [24,  2000], // 6×4  (owner rate)
  [36,  1800], // 6×6  (interpolated)
  [48,  1600], // 8×6  (interpolated)
  [64,  1350], // 8×8  (interpolated)
  [80,  1100], // 10×8 (owner rate)
  [100, 950],  // 10×10 (owner rate)
  [150, 900],  // 15×10 — porta-cabin ₹900 basic rate kicks in
  [200, 900],  // 20×10
  [400, 900],  // 40×10 (flat ₹900 basic across 100–400 sq.ft)
];

/** ₹ per sq.ft for a built cabin of the given floor area. Exact sample sizes return
 *  their listed rate; in-between sizes get a linearly-interpolated "similar" rate.
 *  Returns 0 when the area exceeds MAX_AUTO_QUOTE_AREA (customer must contact us).
 *  INTERNAL — this per-sqft figure is never displayed to customers. */
export function cabinRatePerSqft(area: number): number {
  if (!(area > 0) || area > MAX_AUTO_QUOTE_AREA) return 0;
  const pts = CABIN_RATE_POINTS;
  if (area <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [a1, r1] = pts[i];
    if (area <= a1) {
      const [a0, r0] = pts[i - 1];
      return a1 === a0 ? r1 : r0 + ((area - a0) / (a1 - a0)) * (r1 - r0);
    }
  }
  return pts[pts.length - 1][1];
}

/* ------------------------------------------------------------------ *
 * Step 4 — Interior finishes
 * `delta` = ₹ per sq.ft ABOVE (or below, if negative) the standard finish
 * already included in the base rate. This drives the upgrade/downgrade breakdown.
 * The item marked `standard: true` is the ₹0 baseline for its group.
 * ------------------------------------------------------------------ */
export interface Material {
  id: string;
  label: string;
  delta: number;
  standard?: boolean;
  /** Board thickness for display / factory spec (e.g. "8 mm"). Only set on the
   *  board finishes (Particle Board / MDF / HDHMR). */
  thickness?: string;
}

/** Material label with its board thickness appended when present, e.g. "MDF · 8 mm". */
export const materialLabel = (m?: Material | null): string =>
  m ? `${m.label}${m.thickness ? ` · ${m.thickness}` : ""}` : "";

// Internal Wall — MDF is the standard finish (₹50/sqft, already in the base rate);
// every other option's delta is ₹/sqft above (or below) that standard. Particle
// Board is ₹40/sqft → ₹10 below the MDF standard. Boards are 8 mm thick.
export const WALL_MATERIALS: Material[] = [
  { id: "particle", label: "Particle Board", delta: -10, thickness: "8 mm" }, // ₹40/sqft — ₹10 below the ₹50 MDF standard
  { id: "pvc",      label: "PVC",            delta: 68 },
  { id: "mdf",      label: "MDF",            delta: 0, standard: true, thickness: "8 mm" },
  { id: "hdhmr",    label: "HDHMR",          delta: 52, thickness: "8 mm" },
  { id: "gypsum",   label: "Gypsum",         delta: 90 },
  { id: "wpc",      label: "WPC",            delta: 150 },
  { id: "spc",      label: "SPC",            delta: 460 },
  { id: "uv",       label: "UV Sheet",       delta: 395 },
  { id: "acp",      label: "ACP",            delta: 240 },
];

/** Absolute ₹/sqft of the standard MDF wall lining. For MS/GI/container cabins this rate
 *  is BUNDLED into the base price (so the WALL_MATERIALS deltas above are measured over
 *  it). A PUF panel cabin bundles nothing — the panel itself is the finished wall — so if
 *  the customer opts to add an interior lining, it is charged at this absolute base rate
 *  PLUS the material's delta (e.g. MDF ≈ ₹50/sqft, Particle ≈ ₹40/sqft, PVC ≈ ₹118/sqft). */
export const WALL_LINING_BASE_RATE = 50;

/** Wall selection used only for PUF panel cabins — the recommended default: the bare PUF
 *  panel is left as the finished interior wall (no extra lining, ₹0). */
export const WALL_NONE: Material = { id: "none", label: "Not Required (PUF Panel Finish)", delta: 0 };

/** Resolve a wall selection by id, including the PUF-only "none" option. Use this instead
 *  of a raw WALL_MATERIALS lookup wherever a saved config's wallId may be "none". */
export const findWallMaterial = (id: string): Material | undefined =>
  id === WALL_NONE.id ? WALL_NONE : WALL_MATERIALS.find((m) => m.id === id);

/** Wall options shown for PUF panel cabins: "Not Required" (recommended) first, then each
 *  lining priced at its ABSOLUTE additional rate (base + delta) — the true cost of adding
 *  that lining over the PUF panel, since nothing is bundled for PUF. */
export const pufWallOptions = (): Material[] => [
  WALL_NONE,
  ...WALL_MATERIALS.map((m) => ({ ...m, delta: WALL_LINING_BASE_RATE + m.delta, standard: false })),
];

// Ceiling — MDF is the standard finish (₹50/sqft, already in the base rate);
// every other option's delta is ₹/sqft above (or below) that standard. Boards are 8 mm.
export const CEILING_MATERIALS: Material[] = [
  { id: "pvc",   label: "PVC",      delta: 68 },
  { id: "mdf",   label: "MDF",      delta: 0, standard: true, thickness: "8 mm" },
  { id: "hdhmr", label: "HDHMR",    delta: 52, thickness: "8 mm" },
  { id: "gypsum", label: "Gypsum",  delta: 90 },
  { id: "wpc",   label: "WPC",      delta: 150 },
  { id: "spc",   label: "SPC",      delta: 460 },
  { id: "uv",    label: "UV Sheet", delta: 395 },
  { id: "acp",   label: "ACP",      delta: 240 }, // washable — the default ceiling for toilet cabins
];

// Flooring — Vinyl is the standard finish (~₹38/sqft, already in the base rate);
// every other option's delta is ₹/sqft above that standard.
export const FLOORING_MATERIALS: Material[] = [
  { id: "vinyl",   label: "Vinyl",           delta: 0, standard: true },
  { id: "pvc",     label: "PVC",             delta: 210 },
  { id: "spc",     label: "SPC",             delta: 480 },
  { id: "laminate", label: "Wooden Laminate", delta: 48 },
  { id: "tiles",   label: "Tiles",           delta: 210 },
];

/* ------------------------------------------------------------------ *
 * Step 4b — Thermal insulation (sits BETWEEN the corrugated outer body
 * and the plain inner wall/ceiling). Priced per running sq.ft of insulated
 * surface = wall area + ceiling area. `color` is the fill used in the wall
 * cross-section illustration shown in the Interior step.
 * ------------------------------------------------------------------ */
export interface InsulationOption {
  id: string;
  label: string;
  /** ₹ per running sq.ft of insulated surface (walls + ceiling). 0 = none. */
  ratePerSqft: number;
  /** Layer thickness, for display. */
  thickness: string;
  /** Fill colour for the cross-section visual. */
  color: string;
  note: string;
}

export const INSULATION_OPTIONS: InsulationOption[] = [
  { id: "none",      label: "No Insulation", ratePerSqft: 0,  thickness: "—",     color: "transparent", note: "Single-skin wall — no thermal layer" },
  { id: "glasswool", label: "Glasswool",     ratePerSqft: 17, thickness: "25 mm", color: "#facc15",     note: "25 mm glass-wool — high thermal & acoustic insulation" },
  { id: "hitlon",    label: "Hitlon",        ratePerSqft: 10, thickness: "12 mm", color: "#f5f5f5",     note: "12 mm Hitlon (XLPE foil foam) — moisture-safe & lightweight (white / black)" },
];

/* ------------------------------------------------------------------ *
 * Step 5 — Doors & Windows (price each)
 * ------------------------------------------------------------------ */
export interface Priced {
  id: string;
  label: string;
  price: number;
  /** Units already covered by the base cabin price. Only quantity BEYOND this is
   *  charged at `price`. Doors: 1 Steel Door is included, extras are ₹7,500 each.
   *  Undefined = every unit is charged. */
  includedQty?: number;
}

// Main Door — one Steel Door is included in the base cabin; each extra Steel Door is
// ₹7,500. Glass / Aluminium / UPVC is a premium upgrade charged at ₹28,000 per door.
export const DOOR_TYPES: Priced[] = [
  { id: "steel", label: "Steel Door",                     price: 7500,  includedQty: 1 },
  { id: "glass", label: "Glass / Aluminium / UPVC Door",  price: 28000 },
];

// uPVC is the recommended best-value default (listed first). Prices are the BASE for a
// standard 3×3 ft (9 sq.ft), 2-track window; larger sizes and 2.5-track scale up from here.
export const WINDOW_TYPES: Priced[] = [
  { id: "upvc",     label: "uPVC Window",        price: 5500 },
  { id: "sliding",  label: "Sliding Aluminium",  price: 9000 },
  { id: "openable", label: "Openable UPVC Window", price: 8200 },
  { id: "fixed",    label: "Fixed Glass",        price: 3500 },
];

/* Window size & track — the base window is 3×3 ft (9 sq.ft) with a 2-track frame. The price
 * scales with the window AREA (bigger window ⇒ higher cost) and with the track type
 * (2-track = base, 2.5-track = +12%). */
export const WINDOW_BASE_AREA = 9; // 3 ft × 3 ft baseline
export interface WindowTrack { id: string; label: string; mult: number; note?: string; }
export const WINDOW_TRACKS: WindowTrack[] = [
  { id: "2",   label: "2 Track",   mult: 1.0 },
  { id: "2.5", label: "2.5 Track", mult: 1.12, note: "+12% over 2-track" },
];
export const findWindowTrack = (id: string): WindowTrack => WINDOW_TRACKS.find((t) => t.id === id) ?? WINDOW_TRACKS[0];
/** Per-window price = base type price × (area ÷ 3×3 baseline) × track multiplier. */
export function windowUnitPrice(basePrice: number, widthFt: number, heightFt: number, trackId: string): number {
  const area = Math.max(1, widthFt || 3) * Math.max(1, heightFt || 3);
  return Math.round(basePrice * (area / WINDOW_BASE_AREA) * findWindowTrack(trackId).mult);
}

/** Format a decimal-feet value as feet-and-inches, e.g. 8.5 → 8′6″, 20 → 20′,
 *  7.67 → 7′8″. Used on the plan/elevation dimension labels so 8'6" never rounds
 *  up to a misleading "9ft". */
export function formatFeet(ft: number): string {
  const total = Math.round(ft * 12); // work in whole inches
  const whole = Math.floor(total / 12);
  const inches = total % 12;
  return inches === 0 ? `${whole}′` : `${whole}′${inches}″`;
}

/** Standard opening sizes (feet, Width × Height) shown to scale on the 2D plan and
 *  elevations. Door 3′0″ × 6′0″ (standard cabin door height). The window is drawn
 *  from the customer's chosen Window Width × Height (WINDOW_SIZE is only the default).
 *  A storage container's end double-door opening is the ISO standard 7′8″ × 7′6″. */
export interface OpeningSize { widthFt: number; heightFt: number; }
export const DOOR_SIZE: OpeningSize = { widthFt: 3, heightFt: 6 };
export const WINDOW_SIZE: OpeningSize = { widthFt: 3, heightFt: 3 }; // default 3×3 ft window
// ISO 668 standard 20ft/40ft container door opening: 7′8″ wide × 7′6″ high.
export const CONTAINER_DOOR_SIZE: OpeningSize = { widthFt: 7 + 8 / 12, heightFt: 7.5 };
/** Compact dimension label, e.g. "3′×7′" or "7′8″×7′6″". */
export const sizeLabel = (s: OpeningSize): string => `${formatFeet(s.widthFt)}×${formatFeet(s.heightFt)}`;

/* ------------------------------------------------------------------ *
 * Openings (doors & windows) — placement model.
 *
 * Every opening is { side, offset }. `offset` is the distance in FEET from
 * the wall's start corner to the opening's NEAR EDGE (not its centre); the
 * opening then spans its width INTO the wall. Upper/Down walls run along the
 * cabin LENGTH, Left/Right walls along the WIDTH.
 *
 * These helpers are the SINGLE SOURCE OF TRUTH for the valid offset range, so
 * the input, the presets, the 2D plan, the floor plan and the elevations all
 * agree. Previously each renderer clamped on its own, which made offsets past
 * the limit silently collapse to the same spot.
 * ------------------------------------------------------------------ */
export interface OpeningPlacement { side: string; offset: number; }

export const OPENING_SIDES = [
  { id: "top",    label: "Upper" },
  { id: "bottom", label: "Down" },
  { id: "left",   label: "Left" },
  { id: "right",  label: "Right" },
] as const;
export const sideLabel = (side: string): string =>
  OPENING_SIDES.find((s) => s.id === side)?.label ?? side;

/** Wall span (ft) for a side: Upper/Down run along LENGTH, Left/Right along WIDTH. */
export const sideSpanFt = (side: string, lengthFt: number, widthFt: number): number =>
  side === "left" || side === "right" ? Math.max(1, widthFt) : Math.max(1, lengthFt);

/** Effective opening width (ft) on a wall of `spanFt` — the real width, but never more
 *  than 60% of a short wall (matches how the 2D plan draws it). */
export const openingWidthOn = (spanFt: number, widthFt: number): number =>
  Math.min(Math.max(widthFt, 0.5), Math.max(0.5, spanFt) * 0.6);

/** Largest valid distance-from-corner (ft) for an opening's NEAR edge — the opening must
 *  still fit inside the wall. e.g. a 3 ft door on a 10 ft wall → max 7 ft. */
export const maxOpeningOffset = (spanFt: number, widthFt: number): number =>
  Math.max(0, spanFt - openingWidthOn(spanFt, widthFt));

/** Clamp an opening's distance-from-corner into [0, maxOpeningOffset]. */
export const clampOpeningOffset = (offset: number, spanFt: number, widthFt: number): number =>
  Math.min(Math.max(Number.isFinite(offset) ? offset : 0, 0), maxOpeningOffset(spanFt, widthFt));

/** Corner / centre presets for an opening on a wall of `spanFt`. `offset` is the near edge,
 *  so "centre" is (span - width)/2 and "far corner" is (span - width) — NOT span/2 / span-1. */
export const openingPreset = (pos: "start" | "center" | "end", spanFt: number, widthFt: number): number => {
  const max = maxOpeningOffset(spanFt, widthFt);
  return pos === "start" ? 0 : pos === "end" ? max : max / 2;
};

/** Human label for a placement, e.g. "Upper @ 2′". */
export const placementLabel = (p: OpeningPlacement): string =>
  `${sideLabel(p.side)} @ ${formatFeet(p.offset)}`;

/* ---- Door opening (hand + swing) ----------------------------------------------- *
 * A door is fully specified by WHICH EDGE is hinged and WHICH WAY the leaf swings.
 *   hand "left"  = hinged at the opening's start edge (the `offset` end)
 *   hand "right" = hinged at the far edge
 *   swing "out"  = leaf swings out to the exterior;  "in" = into the room
 * The defaults (left / out) reproduce the original drawing exactly.
 * ------------------------------------------------------------------------------- */
export type DoorHand = "left" | "right";
export type DoorSwing = "in" | "out";

/** A main door: a placement plus how it opens. */
export interface DoorPlacement extends OpeningPlacement {
  hand?: DoorHand;
  swing?: DoorSwing;
}

export const DOOR_HANDS = [
  { id: "left",  label: "Hinge L" },
  { id: "right", label: "Hinge R" },
] as const;
export const DOOR_SWINGS = [
  { id: "out", label: "Opens Out" },
  { id: "in",  label: "Opens In" },
] as const;

/** Partition doors. A partition runs across the cabin WIDTH, so its door is hinged at the
 *  rear ("top") or front ("bottom") end of the opening, and swings into the left/right room. */
export type PartitionHinge = "top" | "bottom";
export type PartitionSwing = "left" | "right";
export const PARTITION_HINGES = [
  { id: "top",    label: "Hinge Rear" },
  { id: "bottom", label: "Hinge Front" },
] as const;
export const PARTITION_SWINGS = [
  { id: "left",  label: "Into Left Room" },
  { id: "right", label: "Into Right Room" },
] as const;

/** e.g. "hinge left, opens out" — for the quote / WhatsApp / PDF. */
export const doorOpeningLabel = (d: DoorPlacement): string =>
  `hinge ${d.hand ?? "left"}, opens ${d.swing ?? "out"}`;
export const partitionOpeningLabel = (hinge: PartitionHinge, swing: PartitionSwing): string =>
  `hinge ${hinge === "top" ? "rear" : "front"}, opens into ${swing} room`;

/** Legacy named window positions (the old toggle-chip model) → side + CENTRE fraction along
 *  that wall. Kept ONLY to migrate saved configs onto the windowPlacements model. */
export const LEGACY_WINDOW_POSITIONS: Record<string, { side: string; t: number }> = {
  "top-left":      { side: "top",    t: 0.2 },
  "top-center":    { side: "top",    t: 0.5 },
  "top-right":     { side: "top",    t: 0.8 },
  "bottom-left":   { side: "bottom", t: 0.2 },
  "bottom-center": { side: "bottom", t: 0.5 },
  "bottom-right":  { side: "bottom", t: 0.8 },
  "bottom":        { side: "bottom", t: 0.5 },
  "left":          { side: "left",   t: 0.5 },
  "right":         { side: "right",  t: 0.5 },
};

/* ------------------------------------------------------------------ *
 * Product-wise behaviour — keeps irrelevant options off the calculator
 * for specific product types (drives both the UI and the estimate engine).
 * ------------------------------------------------------------------ */
export const isToiletCabin = (productId: string) => productId === "toilet-cabin";
// "Storage Container" (a.k.a. Container Storage). storage-cabin kept as an alias so
// any pre-existing saved config still resolves to the container flow.
export const isStorageProduct = (productId: string) =>
  productId === "storage-container" || productId === "storage-cabin";

/** The only sizes offered for storage containers — no free/custom dimensions. */
export interface StorageSize { id: string; length: number; width: number; label: string; usage: string; }
export const STORAGE_SIZES: StorageSize[] = [
  { id: "20x8", length: 20, width: 8, label: "20 ft Container – 20 ft × 8 ft", usage: "Suitable for small storage, tool room, site material storage, and compact storage use." },
  { id: "40x8", length: 40, width: 8, label: "40 ft Container – 40 ft × 8 ft", usage: "Suitable for large storage, site material storage, tools, machinery, and equipment storage." },
];

/** Ventilation options shown INSTEAD of windows for toilet cabins. */
export const VENTILATION_ITEMS: Priced[] = [
  { id: "exhaust", label: "Exhaust Fan", price: 1200 },
  { id: "louver",  label: "Lower Louver / Ventilator", price: 900 },
];

/* ------------------------------------------------------------------ *
 * Storage Container — grade selection (replaces per-sqft pricing).
 * The base price for a container is the grade rate for the chosen size,
 * NOT the sqft calculation used for built cabins.
 * ------------------------------------------------------------------ */
export interface ContainerGrade { id: string; label: string; description: string; note?: string; }
export const CONTAINER_GRADES: ContainerGrade[] = [
  { id: "new_current_year", label: "New Grade / Current Year", description: "Fresh / latest year container, best condition, premium quality." },
  { id: "grade_2024_2025",  label: "2024 – 2025 Grade Container", description: "Recent year used container, good condition, suitable for storage and site use." },
  { id: "grade_2010_2014",  label: "2010 – 2014 Used Grade Container", description: "Old used container, economical option, suitable for budget storage. Condition depends on availability and inspection.", note: "Used container condition depends on physical availability and inspection." },
];

/** Grade rate by size value ("20x8" / "40x8") then grade id. 0 = "Contact for Rate".
 *  These defaults are the calculator's rate config — later editable from the admin panel. */
export const CONTAINER_GRADE_RATES: Record<string, Record<string, number>> = {
  "20x8": { new_current_year: 0, grade_2024_2025: 280000, grade_2010_2014: 240000 },
  "40x8": { new_current_year: 0, grade_2024_2025: 360000, grade_2010_2014: 245000 },
};

/** Container size value ("20x8" / "40x8") from length/width. */
export const containerSizeKey = (length: number, width: number): string => `${Math.round(length)}x${Math.round(width)}`;
/** Grade rate for a size + grade. 0 means "Contact for Rate". */
export const containerRate = (length: number, width: number, gradeId: string): number =>
  CONTAINER_GRADE_RATES[containerSizeKey(length, width)]?.[gradeId] ?? 0;

/* ------------------------------------------------------------------ *
 * Step 6 — Electrical (unit price; default qty auto-suggested from area)
 * ------------------------------------------------------------------ */
export interface ElectricalItem {
  id: string;
  label: string;
  unitPrice: number;
  defaultQty: (area: number) => number;
  preselect: boolean;
}

export const ELECTRICAL_ITEMS: ElectricalItem[] = [
  { id: "led",     label: "LED Panel Light", unitPrice: 800,  defaultQty: (a) => Math.max(1, Math.ceil(a / 45)), preselect: true },
  { id: "tube",    label: "Tube Light",  unitPrice: 250,  defaultQty: (a) => Math.max(1, Math.ceil(a / 60)), preselect: false }, // SET: tube-light rate
  { id: "fan",     label: "Fan",         unitPrice: 2500, defaultQty: (a) => Math.max(1, Math.ceil(a / 120)), preselect: true },
  { id: "exhaust", label: "Exhaust Fan", unitPrice: 1200, defaultQty: () => 1, preselect: false },
  { id: "ac",      label: "AC Provision", unitPrice: 2500, defaultQty: () => 1, preselect: false },
  { id: "plug",    label: "Plug Points", unitPrice: 450,  defaultQty: (a) => Math.max(2, Math.ceil(a / 55)), preselect: true },
  { id: "popup-socket", label: "Pop-up Socket (table)", unitPrice: 3500, defaultQty: () => 1, preselect: false }, // table-mounted pop-up, e.g. conference table
];

/** Light colour + LED panel shape — spec choices in the Electrical step (apply to the LED
 *  panel / tube lights). No price impact by default; wire a delta later if a shape costs more. */
export const LIGHT_COLORS = [{ id: "white", label: "White" }, { id: "warm", label: "Warm" }] as const;
export const LED_SHAPES = [{ id: "square", label: "Square" }, { id: "round", label: "Round" }] as const;

/* ------------------------------------------------------------------ *
 * Spec-only placement / layout choices — NO price impact. Captured in
 * the config, the WhatsApp summary and the PDF so the factory knows the
 * intended layout. (Same pattern as LIGHT_COLORS / LED_SHAPES above.)
 * ------------------------------------------------------------------ */
export const FURNITURE_POSITIONS = [
  { id: "wall", label: "Wall Attached" },
  { id: "centre", label: "Centre" },
] as const;
// Plug points can go on any combination of walls AND/OR beside the work tables — a
// MULTI-select (stored as a string[] on the config). The 2D plan spreads sockets along
// each chosen wall and puts one beside each work table.
export const PLUG_POINT_WALLS = [
  { id: "upper", label: "Upper Wall" },
  { id: "down",  label: "Down Wall" },
  { id: "left",  label: "Left Wall" },
  { id: "right", label: "Right Wall" },
  { id: "table", label: "By Work Table" },
] as const;
export const PLUG_POINT_WALL_IDS: readonly string[] = PLUG_POINT_WALLS.map((w) => w.id);
export const MOBILITY_TYPES = [
  { id: "movable", label: "100% Movable (fully relocatable)" },
  { id: "fixed", label: "Fixed / Semi-permanent" },
] as const;

/** Partition door type. Priced through the partition add-ons:
 *   • no door  → "Fixed Partition"        ₹17,500 each
 *   • hinged   → "Partition with Door"    ₹22,000 each (all-in)
 *   • sliding  → Fixed Partition ₹17,500 + "Partition Sliding Door" ₹8,500 = ₹26,000 each */
export const PARTITION_DOOR_TYPES = [
  { id: "hinged",  label: "Hinged Door" },
  { id: "sliding", label: "Sliding Door" },
] as const;
export const partitionDoorTypeLabel = (id: string): string =>
  PARTITION_DOOR_TYPES.find((t) => t.id === id)?.label ?? id;
/** Work-table add-ons. Adding the first one auto-ticks "By Work Table" for plug points;
 *  removing the last one un-ticks it (see the toggleAddon handler). */
export const TABLE_ADDON_IDS = ["workstation", "manager", "manager-l", "conference"];

/** Manager-table footprints. Normal = a 5′ × 2′ rectangle. L-shaped = that same 5′ × 2′ main
 *  run plus a 2′-wide return leg, giving a 5′ × 4′ bounding footprint. */
export const MANAGER_TABLE_SIZE = { widthFt: 5, depthFt: 2 };
export const MANAGER_L_SIZE = { widthFt: 5, depthFt: 4, returnWidthFt: 2 };
/** Revolving chairs are supplied as Featherlite (or an equivalent brand). */
export const CHAIR_BRAND_NOTE = "Featherlite or similar alternate";

/** Where a work table can sit in the room — a wall run (staff sit on the room side of the
 *  desk, with walking clearance), or free-standing in the CENTRE: back-to-back "opposite"
 *  seating with a partition screen between each person. */
export const TABLE_POSITIONS = [
  { id: "top",    label: "Upper Wall" },
  { id: "bottom", label: "Down Wall" },
  { id: "left",   label: "Left Wall" },
  { id: "right",  label: "Right Wall" },
  { id: "centre", label: "Centre" },
] as const;
export const tablePositionLabel = (id: string): string =>
  TABLE_POSITIONS.find((p) => p.id === id)?.label ?? id;

/** Default wall for the i-th table when the customer hasn't picked one — spread them around
 *  the room (upper → down → left → right). Conference tables, and everything when
 *  "Furniture Position" is Centre, default to the centre pod. */
const TABLE_WALL_CYCLE = ["top", "bottom", "left", "right"];
export const defaultTablePosition = (i: number, centrePref = false): string =>
  centrePref ? "centre" : TABLE_WALL_CYCLE[i % TABLE_WALL_CYCLE.length];

export const furniturePositionLabel = (id: string): string => FURNITURE_POSITIONS.find((o) => o.id === id)?.label ?? id;
/** Human label for the selected plug-point placements, e.g. "Upper Wall, Left Wall, By Work Table". */
export const plugPointWallsLabel = (ids: string[] | undefined): string =>
  (ids ?? []).map((id) => PLUG_POINT_WALLS.find((w) => w.id === id)?.label ?? id).join(", ") || "As Per Site";
export const mobilityTypeLabel = (id: string): string => MOBILITY_TYPES.find((o) => o.id === id)?.label ?? id;

/* ------------------------------------------------------------------ *
 * Exact material sizes — shown on the layout drawing so the customer & factory
 * see the real size of each item (display / spec only, no price impact).
 * ------------------------------------------------------------------ */
export const FAN_SIZE = { shape: "round" as const, label: `12″` };        // 12" round ceiling fan
export const LED_PANEL_SIZE = {
  square: { shape: "square" as const, label: `10.5″` },                   // 10.5" square LED panel
  round:  { shape: "round"  as const, label: `4″` },                      // 4" round LED panel
};
/** Every work table (workstation / manager / conference) is a standard 3.5 ft × 22″ × 30″. */
export const TABLE_SIZE = { lengthFt: 3.5, depthIn: 22, heightIn: 30 };
export const TABLE_SIZE_SHORT = `3.5ft×22″`;
export const TABLE_SIZE_LABEL = `3.5 ft × 22″ × 30″`;

/** Exact material size + shape for a layout item (for the drag drawing). `kind` = the
 *  LayoutDesigner kind (fan/led/…); `id` = the addon id; `ledShape` = config.ledShape. */
export function materialSpec(kind: string, id: string, ledShape: string):
  { label: string; shape: "round" | "square" | "rect" } | null {
  if (kind === "fan") return { label: FAN_SIZE.label, shape: "round" };
  if (kind === "led") return ledShape === "round" ? { ...LED_PANEL_SIZE.round } : { ...LED_PANEL_SIZE.square };
  if (TABLE_ADDON_IDS.includes(id)) return { label: TABLE_SIZE_SHORT, shape: "rect" };
  return null;
}

/* ------------------------------------------------------------------ *
 * Step 7 — Optional add-ons / furniture (price each; some take a quantity)
 * ------------------------------------------------------------------ */
export interface AddonItem {
  id: string;
  label: string;
  price: number;
  hasQty?: boolean;
  /** Restrict this add-on to specific product ids. When set, the add-on only shows
   *  (and is only ever charged) for those products. Omitted = available to all. */
  onlyFor?: string[];
  /** Optional helper line under the add-on card. */
  hint?: string;
}

export const ADDONS: AddonItem[] = [
  // Plumbing fittings for an ATTACHED washroom inside the cabin.
  { id: "toilet",      label: "Toilet",           price: 22000, hint: "Attached WC / washroom in the cabin" },
  { id: "pantry",      label: "Pantry",           price: 18000 },
  { id: "wash-basin",  label: "Wash Basin",       price: 4500,  hint: "Attached-washroom fitting" },
  { id: "urinal",      label: "Urinal",           price: 6500,  hint: "Attached-washroom fitting" },
  { id: "partition",      label: "Fixed Partition",     price: 17500, hasQty: true },
  { id: "partition-door", label: "Partition with Door", price: 22000, hasQty: true },
  // Work tables, cupboard & overhead cabinet — flat ₹5,000 per unit.
  { id: "workstation", label: "Workstation",      price: 5000,  hasQty: true },
  // Manager table — a normal 5′×2′ rectangle, or the L-shaped desk (5′×2′ + a 2′ return).
  { id: "manager",     label: "Manager Table (5′ × 2′ Rectangle)", price: 6500, hasQty: true },
  { id: "manager-l",   label: "Manager Table (L-Shaped)",          price: 8000, hasQty: true, hint: "5′×2′ main run + 2′ return leg" },
  { id: "conference",  label: "Conference Table", price: 5000,  hasQty: true },
  { id: "cupboard",    label: "Cupboard",         price: 5000,  hasQty: true },
  { id: "overhead",    label: "Overhead Cabinet", price: 5000,  hasQty: true },
  // Basic office table — plain top vs one with a drawer box.
  { id: "table",        label: "Table (Without Drawer)",  price: 3500, hasQty: true },
  { id: "table-drawer", label: "Table (With Drawer Box)", price: 6000, hasQty: true, hint: "Table with a lockable drawer box" },
  // Revolving office chairs — two options; brand Featherlite or an equivalent alternate.
  { id: "chair-headrest", label: "Revolving Chair — Head Rest", price: 8500, hasQty: true, hint: CHAIR_BRAND_NOTE },
  { id: "chair-backrest", label: "Revolving Chair — Back Rest", price: 5000, hasQty: true, hint: CHAIR_BRAND_NOTE },
  // Security-cabin only: an external stand/bracket fitted outside each window.
  { id: "window-stand", label: "Exterior Window Stand", price: 4500, hasQty: true,
    onlyFor: ["security-cabin"], hint: "One per window — fitted outside" },
];

/* ------------------------------------------------------------------ *
 * Calculator state + estimate engine
 * ------------------------------------------------------------------ */
export interface CabinConfig {
  productId: string;
  length: number;
  width: number;
  height: number;
  quantity: number;
  structureId: string;
  /** Roof type: "sloped" (2-side, default, ₹0) or "flat" (+8% of base cabin price). */
  roofId: string;
  wallId: string;
  ceilingId: string;
  flooringId: string;
  /** Thermal insulation between the outer body and inner wall/ceiling. "none" = none. */
  insulationId: string;
  doorTypeId: string;
  doorQty: number;
  /** Per-door placement: side (top/bottom/left/right) + offset in ft from the start
   *  corner to the door's NEAR EDGE, plus how it opens (hand + swing). Mirrors doorQty. */
  doorPlacements: DoorPlacement[];
  windowTypeId: string;
  windowQty: number;
  /** Window size (ft) — default 3×3. Larger windows cost proportionally more. */
  windowWidthFt: number;
  windowHeightFt: number;
  /** Sliding track: "2" (2-track, base) or "2.5" (2.5-track, +12%). */
  windowTrackId: string;
  /** Per-window placement: side + offset in ft from the start corner to the window's NEAR
   *  EDGE — same model as doorPlacements. Window count mirrors this list. */
  windowPlacements: OpeningPlacement[];
  /** id -> quantity for ventilation (toilet cabins: exhaust fan / louver). */
  ventilation: Record<string, number>;
  /** Selected container grade (storage containers only; ignored for other products). */
  containerGradeId: string;
  /** id -> quantity. Presence with qty>0 means selected. */
  electrical: Record<string, number>;
  /** Light colour (white / warm) and LED panel shape (square / round) — spec only. */
  lightColor: string;
  ledShape: string;
  /** Spec-only placement choices (no price impact) — captured in the quote/PDF.
   *  furniturePosition: wall | centre · mobilityType: movable | fixed. */
  furniturePosition: string;
  /** Per-table placement — addon id → array of TABLE_POSITIONS ids, one entry per unit.
   *  Lets the customer put each individual table on a specific wall (or the centre pod). */
  tablePlacements: Record<string, string[]>;
  /** Plug-point placement — MULTI-select of PLUG_POINT_WALLS ids (upper/down/left/right/table).
   *  The 2D plan spreads sockets along each chosen wall + one beside each work table. */
  plugPointWalls: string[];
  mobilityType: string;
  /** Spec-only (no price impact): per-room unit counts for each work-furniture add-on in a
   *  multi-room layout. addon id -> [room1, room2, …] summing to the add-on quantity (rooms
   *  1..roomCount-1 are stored; the last room is the derived remainder). Captured in quote/PDF. */
  furnitureRoom: Record<string, number[]>;
  /** id -> quantity. Presence with qty>0 means selected. */
  addons: Record<string, number>;
  /** Spec-only (no price impact): free drag-and-drop positions for the customer's
   *  chosen items (doors, windows, lights, fans, furniture) on the floor plan.
   *  Key = item instance id, value = fractional {x,y} (0..1) within the cabin,
   *  plus an optional rotation `r` in degrees (0/90/180/270). Optional so older
   *  persisted configs stay valid. Captured in the WhatsApp quote + PDF so the
   *  factory builds to the intended layout & orientation. */
  layout?: Record<string, { x: number; y: number; r?: number }>;
  /** Number of rooms (1..8). 1 = single room, no partitions; N rooms => N-1 partitions
   *  (each priced via the "partition" / "partition-door" add-on with qty = N-1). */
  roomCount: number;
  /** Per-room lengths (ft) along the cabin length; roomLengths.length === roomCount and
   *  the values sum to the cabin length. Room k occupies roomLengths[k-1]. */
  roomLengths: number[];
  /** Partitions have doors ("Partition with Door" price) vs plain fixed partitions.
   *  Applies uniformly to all N-1 partitions. */
  partitionDoor: boolean;
  /** Door type on every partition when `partitionDoor` is true: "hinged" | "sliding".
   *  Sliding is priced as a Fixed Partition + the "Partition Sliding Door" add-on. */
  partitionDoorType: string;
  /** Partition-door position: the door's NEAR-EDGE distance (ft) from the REAR (top) wall,
   *  measured along the partition — which spans the cabin WIDTH. Clamped so it always fits.
   *  Applies uniformly to all N-1 partitions. */
  partitionDoorOffset: number;
  /** Partition-door opening: which end of the opening is hinged (rear/front end of the
   *  partition) and which room the leaf swings into. Applies to all N-1 partitions. */
  partitionDoorHinge: PartitionHinge;
  partitionDoorSwing: PartitionSwing;
  transport: boolean;
  installation: boolean;
  gst: boolean;
}

export interface LineDelta {
  label: string;
  detail: string;
  amount: number;
}

export interface Estimate {
  area: number;
  wallArea: number;
  /** Dimensions actually used for pricing (after clamping) — display these so the
   *  shown "L × W = area" always matches the priced figure. */
  dimLength: number;
  dimWidth: number;
  dimHeight: number;
  quantity: number;
  base: number;
  /** Extra-height premium: base × 8% × (height − 8'6"), prorated. 0 at/below standard. */
  heightSurcharge: number;
  /** Flat-roof premium: base × 8% when roof = flat. 0 for the sloped default. */
  roofSurcharge: number;
  interior: number;
  interiorLines: LineDelta[];
  /** Thermal-insulation cost (wall + ceiling area × rate). 0 when none selected. */
  insulation: number;
  openings: number;
  openingLines: LineDelta[];
  ventilation: number;
  ventilationLines: LineDelta[];
  electrical: number;
  electricalLines: LineDelta[];
  furniture: number;
  furnitureLines: LineDelta[];
  perCabin: number;
  cabinsSubtotal: number; // perCabin * qty
  transport: number;
  installation: number;
  subtotal: number; // before GST
  gst: number;
  total: number;
  /** true when the price can't be auto-quoted (oversized cabin > 400 sq.ft, or a
   *  container grade with no listed rate) — the UI shows "Contact us" not a number. */
  contactRequired: boolean;
}

const findById = <T extends { id: string }>(list: T[], id: string): T | undefined =>
  list.find((x) => x.id === id);

export function buildDefaultConfig(productId = PRODUCTS[0].id): CabinConfig {
  const product = findById(PRODUCTS, productId) ?? PRODUCTS[0];
  const area = product.def.length * product.def.width;
  const container = isStorageProduct(product.id);
  // The "Puf Panel Cabin" product defaults to the PUF panel structure (its walls ARE PUF
  // panels), which in turn defaults the interior wall to "Not Required".
  const puf = product.id === "puf-panel-cabin";
  // Toilet cabins default to a fully washable ACP (Aluminium Composite Panel) lining on
  // the walls and ceiling — the standard finish for wet areas.
  const toilet = isToiletCabin(product.id);
  const electrical: Record<string, number> = {};
  // Storage containers are priced purely by grade — no pre-selected electricals.
  ELECTRICAL_ITEMS.forEach((e) => {
    if (!container && e.preselect) electrical[e.id] = e.defaultQty(area);
  });
  return {
    productId: product.id,
    length: product.def.length,
    width: product.def.width,
    height: product.def.height,
    quantity: 1,
    structureId: puf ? "puf" : toilet ? "gi" : STRUCTURES[0].id,
    // Sloped 2-side roof is the standard default; flat is +8%. Storage containers are
    // ISO shipping containers → ALWAYS flat-roofed (no sloped option, no surcharge).
    roofId: container ? "flat" : "sloped",
    wallId: puf ? WALL_NONE.id : toilet ? "acp" : WALL_MATERIALS.find((m) => m.standard)!.id,
    ceilingId: toilet ? "acp" : CEILING_MATERIALS.find((m) => m.standard)!.id,
    flooringId: FLOORING_MATERIALS.find((m) => m.standard)!.id,
    insulationId: "none",
    doorTypeId: DOOR_TYPES[0].id, // Steel Door (1 included in base)
    // Containers ship with their own doors — no separate door line.
    doorQty: container ? 0 : 1,
    // Default door placement: one main door on the front (bottom) wall, ~30% along
    // (offset = distance from the left corner to the door's near edge).
    doorPlacements: container ? [] : [{
      side: "bottom",
      offset: clampOpeningOffset(Math.round(product.def.length * 0.3), product.def.length, DOOR_SIZE.widthFt),
      hand: "left",
      swing: "out",
    }],
    windowTypeId: "upvc", // uPVC is the recommended best-value default
    // Standard window is 3×3 ft on a 2-track frame; size & track drive the price.
    windowWidthFt: 3,
    windowHeightFt: 3,
    windowTrackId: "2",
    // Toilet & storage products start windowless — toilet uses ventilation instead;
    // containers have no windows.
    windowQty: isToiletCabin(product.id) || container ? 0 : 2,
    // Default window placements: two windows on the rear (Upper) wall, set in symmetrically
    // from each corner. `offset` is the distance to each window's near edge.
    windowPlacements: isToiletCabin(product.id) || container ? [] : [
      { side: "top", offset: clampOpeningOffset(Math.round(product.def.length * 0.2), product.def.length, WINDOW_SIZE.widthFt) },
      { side: "top", offset: clampOpeningOffset(Math.round(product.def.length * 0.8) - WINDOW_SIZE.widthFt, product.def.length, WINDOW_SIZE.widthFt) },
    ],
    // Toilet cabins default to one exhaust fan (ventilation replaces windows).
    ventilation: isToiletCabin(product.id) ? { exhaust: 1 } : {},
    // Default container grade (2024–2025). Ignored for non-container products.
    containerGradeId: "grade_2024_2025",
    electrical,
    lightColor: "white",
    ledShape: "square",
    furniturePosition: "wall",
    tablePlacements: {},
    plugPointWalls: ["down"], // one wall by default; "By Work Table" auto-adds when a table is chosen
    mobilityType: "movable",
    furnitureRoom: {},
    addons: {},
    // Drag-and-drop item positions (spec-only) — empty until the customer arranges them.
    layout: {},
    // Layout — single room by default; multi-room partitions are opt-in in the Size step.
    roomCount: 1,
    roomLengths: [Math.round(product.def.length)],
    partitionDoor: true,
    partitionDoorType: "hinged",
    // Centred on the partition (which spans the cabin WIDTH) by default.
    partitionDoorOffset: openingPreset("center", product.def.width, DOOR_SIZE.widthFt),
    // Opens like the original drawing: hinged at the rear end, swinging into the right room.
    partitionDoorHinge: "top",
    partitionDoorSwing: "right",
    transport: false,
    installation: false,
    gst: true,
  };
}

/** Clamp helper: keep dimensions/quantities sane so the estimate can't go absurd. */
const clamp = (n: number, min: number, max: number) =>
  Number.isFinite(n) ? Math.min(Math.max(n, min), max) : min;

export function computeEstimate(cfg: CabinConfig): Estimate {
  const product = findById(PRODUCTS, cfg.productId) ?? PRODUCTS[0];
  const structure = findById(STRUCTURES, cfg.structureId) ?? STRUCTURES[0];

  const length = clamp(cfg.length, 1, 200);
  const width = clamp(cfg.width, 1, 100);
  const height = clamp(cfg.height, 6, 20);
  const quantity = clamp(Math.round(cfg.quantity), 1, 500);

  const area = round(length * width);
  const wallArea = round(2 * (length + width) * height);

  // Base price: storage containers are priced by GRADE for the chosen size (flat
  // rate, 0 = "Contact for Rate"); built cabins use per-sqft × structure multiplier.
  const container = isStorageProduct(cfg.productId);
  // Built cabins: base = size-based ₹/sqft × area × structure multiplier. The rate is
  // 0 for oversized cabins (area > MAX_AUTO_QUOTE_AREA) → base 0 → "contact us".
  const base = container
    ? containerRate(length, width, cfg.containerGradeId)
    : round(cabinRatePerSqft(area) * area * structure.multiplier);

  // Extra-height premium — 8% of the base cabin price per foot above the 8'6" standard
  // (prorated). Not applied to storage containers (fixed ISO height, grade-priced).
  const extraHeight = Math.max(0, height - STANDARD_HEIGHT_FT);
  const heightSurcharge = container ? 0 : round(base * HEIGHT_SURCHARGE_PER_FT * extraHeight);

  // Flat-roof premium — +8% of the base cabin price when a flat roof is chosen. The
  // sloped 2-side roof is the ₹0 default. Not applied to storage containers.
  const roofSurcharge = container ? 0 : round(base * findRoof(cfg.roofId).surchargePct);

  // Interior deltas (₹/sqft over the standard finish)
  const puf = isPufPanel(cfg.structureId);
  const wall = findWallMaterial(cfg.wallId) ?? WALL_MATERIALS[0];
  const ceiling = findById(CEILING_MATERIALS, cfg.ceilingId) ?? CEILING_MATERIALS[0];
  const flooring = findById(FLOORING_MATERIALS, cfg.flooringId) ?? FLOORING_MATERIALS[0];
  // Wall lining: MS/GI/container bundle the standard MDF lining in the base rate, so the
  // material delta is measured OVER it. A PUF panel bundles nothing (the panel is the
  // finished wall) → "Not Required" = ₹0, and any lining is an optional add-on charged at
  // its ABSOLUTE rate (base + delta).
  const wallAmt = puf
    ? (cfg.wallId === WALL_NONE.id ? 0 : round((WALL_LINING_BASE_RATE + wall.delta) * wallArea))
    : round(wall.delta * wallArea);
  const ceilAmt = round(ceiling.delta * area);
  const floorAmt = round(flooring.delta * area);
  const interior = wallAmt + ceilAmt + floorAmt;
  const interiorLines: LineDelta[] = [
    { label: "Internal Wall", detail: puf && cfg.wallId !== WALL_NONE.id ? `${materialLabel(wall)} (add-on over PUF)` : materialLabel(wall), amount: wallAmt },
    { label: "Ceiling", detail: materialLabel(ceiling), amount: ceilAmt },
    { label: "Flooring", detail: materialLabel(flooring), amount: floorAmt },
  ].filter((l) => l.amount !== 0);

  // Thermal insulation — priced per running sq.ft of insulated surface (walls +
  // ceiling), sits between the corrugated outer body and the plain inner wall. NOT
  // applicable to PUF panels: the sandwich panel is inherently insulated (no corrugated
  // body / inner-lining cavity to fill), so no separate insulation is charged.
  const insulationOpt = findById(INSULATION_OPTIONS, cfg.insulationId) ?? INSULATION_OPTIONS[0];
  const insulation = puf ? 0 : round(insulationOpt.ratePerSqft * (wallArea + area));

  // Doors & windows — windows never apply to toilet cabins (ventilation instead).
  const toilet = isToiletCabin(cfg.productId);
  const door = findById(DOOR_TYPES, cfg.doorTypeId) ?? DOOR_TYPES[0];
  const win = findById(WINDOW_TYPES, cfg.windowTypeId) ?? WINDOW_TYPES[0];
  const doorQty = clamp(Math.round(cfg.doorQty), 0, 50);
  const windowQty = toilet ? 0 : clamp(Math.round(cfg.windowQty), 0, 100);
  // Only doors beyond the included quantity (1 Steel Door) are charged.
  const doorChargeQty = Math.max(0, doorQty - (door.includedQty ?? 0));
  const doorAmt = round(door.price * doorChargeQty);
  // Windows: base 3×3 ft, 2-track — price scales with area and track (2.5-track = +12%).
  const winW = clamp(cfg.windowWidthFt ?? 3, 1, 12);
  const winH = clamp(cfg.windowHeightFt ?? 3, 1, 12);
  const winTrack = findWindowTrack(cfg.windowTrackId);
  const winPerUnit = windowUnitPrice(win.price, winW, winH, cfg.windowTrackId);
  const winAmt = round(winPerUnit * windowQty);
  const openings = doorAmt + winAmt;
  const openingLines: LineDelta[] = [
    { label: "Doors", detail: door.includedQty ? `${doorQty} × ${door.label} · ${door.includedQty} included` : `${doorQty} × ${door.label}`, amount: doorAmt },
    { label: "Windows", detail: `${windowQty} × ${win.label} ${formatFeet(winW)}×${formatFeet(winH)} · ${winTrack.label}`, amount: winAmt },
  ].filter((l) => l.amount !== 0);

  // Ventilation (toilet cabins) — exhaust fan / louver, priced only when selected.
  const ventilationLines: LineDelta[] = [];
  let ventilation = 0;
  VENTILATION_ITEMS.forEach((v) => {
    const qty = clamp(Math.round(cfg.ventilation?.[v.id] ?? 0), 0, 50);
    if (qty > 0) {
      const amt = round(v.price * qty);
      ventilation += amt;
      ventilationLines.push({ label: v.label, detail: `${qty} × ${formatINR(v.price)}`, amount: amt });
    }
  });

  // Electrical
  const electricalLines: LineDelta[] = [];
  let electrical = 0;
  ELECTRICAL_ITEMS.forEach((e) => {
    const qty = clamp(Math.round(cfg.electrical[e.id] ?? 0), 0, 200);
    if (qty > 0) {
      const amt = round(e.unitPrice * qty);
      electrical += amt;
      electricalLines.push({ label: e.label, detail: `${qty} × ${formatINR(e.unitPrice)}`, amount: amt });
    }
  });

  // Furniture / add-ons
  const furnitureLines: LineDelta[] = [];
  let furniture = 0;
  ADDONS.forEach((a) => {
    // Product-restricted add-ons (e.g. security-cabin window stand) are never charged
    // on other products, even if a stale quantity lingers from a previous selection.
    if (a.onlyFor && !a.onlyFor.includes(cfg.productId)) return;
    const qty = clamp(Math.round(cfg.addons[a.id] ?? 0), 0, 200);
    if (qty > 0) {
      const amt = round(a.price * qty);
      furniture += amt;
      furnitureLines.push({
        label: a.label,
        detail: a.hasQty ? `${qty} × ${formatINR(a.price)}` : formatINR(a.price),
        amount: amt,
      });
    }
  });

  // Containers price on the grade rate alone — no interior/openings/electrical/furniture.
  const perCabin = container ? base : base + heightSurcharge + roofSurcharge + interior + insulation + openings + ventilation + electrical + furniture;
  const cabinsSubtotal = perCabin * quantity;
  const transport = cfg.transport ? TRANSPORT_BASE * quantity : 0;
  const installation = cfg.installation ? INSTALLATION_BASE * quantity : 0;
  const subtotal = cabinsSubtotal + transport + installation;
  const gst = cfg.gst ? round(subtotal * GST_RATE) : 0;
  const total = subtotal + gst;

  return {
    area,
    wallArea,
    dimLength: length,
    dimWidth: width,
    dimHeight: height,
    quantity,
    base,
    heightSurcharge,
    roofSurcharge,
    interior: container ? 0 : interior,
    interiorLines: container ? [] : interiorLines,
    insulation: container ? 0 : insulation,
    openings: container ? 0 : openings,
    openingLines: container ? [] : openingLines,
    ventilation: container ? 0 : ventilation,
    ventilationLines: container ? [] : ventilationLines,
    electrical: container ? 0 : electrical,
    electricalLines: container ? [] : electricalLines,
    furniture: container ? 0 : furniture,
    furnitureLines: container ? [] : furnitureLines,
    perCabin,
    cabinsSubtotal,
    transport,
    installation,
    subtotal,
    gst,
    total,
    contactRequired: base <= 0,
  };
}

/** Lowest indicative "starting from" total across all products at their default
 *  configuration (incl. GST, single unit). Computed from the SAME engine the
 *  calculator uses so the homepage hero can show a real, live figure — never
 *  hardcode a price in the UI. If the sales team tunes rates above, this updates
 *  automatically. Safe for public/anonymous rendering (no backend, pure function). */
export function startingFromEstimate(): number {
  return Math.min(...PRODUCTS.map((p) => computeEstimate(buildDefaultConfig(p.id)).total));
}

/** Add-on ids that are "movable" work furniture and can be assigned to a specific room in
 *  a 2-room layout (drives the Add-ons room picker + drawing). Fixtures (toilet, wash
 *  basin, urinal, pantry, partition) are excluded — they are not placed per-room this way. */
export const ROOM_FURNITURE_IDS = ["workstation", "manager", "manager-l", "conference", "cupboard", "chair-headrest", "chair-backrest"];

/** Per-unit placement for a table add-on: one TABLE_POSITIONS id per unit. Entries the
 *  customer hasn't set fall back to the spread default (conference tables and the "Centre"
 *  furniture position default to the centre pod). Always returns exactly `qty` entries, so
 *  changing the quantity can never leave a table without a placement. */
export function tablePlacementsOf(cfg: CabinConfig, addonId: string, qty: number): string[] {
  const saved = cfg.tablePlacements?.[addonId] ?? [];
  const centrePref = cfg.furniturePosition === "centre" || addonId === "conference";
  const n = Math.max(0, Math.round(qty) || 0);
  return Array.from({ length: n }, (_, i) => saved[i] ?? defaultTablePosition(i, centrePref));
}

/** Spec-only: per-room unit counts for a work-furniture add-on across the current rooms.
 *  Returns an array of length roomCount (each ≥0) summing to `total`. Rooms 1..N-1 come from
 *  the stored array (default: everything in Room 1); the last room absorbs the remainder, so
 *  a quantity change can never leave a room over-filled. */
export function furnitureRoomCounts(cfg: CabinConfig, addonId: string, total: number, roomCount: number): number[] {
  const t = Math.max(0, Math.round(total) || 0);
  const n = Math.max(1, Math.round(roomCount) || 1);
  if (n === 1) return [t];
  const stored = cfg.furnitureRoom?.[addonId];
  const out: number[] = [];
  let used = 0;
  for (let i = 0; i < n - 1; i++) {
    const def = i === 0 ? t : 0; // default: everything in Room 1
    const raw = Array.isArray(stored) ? stored[i] : def;
    const v = Math.max(0, Math.min(t - used, Math.round(Number(raw)) || 0));
    out.push(v);
    used += v;
  }
  out.push(Math.max(0, t - used));
  return out;
}

/** Produce exactly `count` room lengths (each ≥1 ft) summing to `totalLength`; rooms 1..N-1
 *  seed from `lengths`, the last room is the remainder. Caps count at 8 and at totalLength. */
export function normalizeRoomLengths(totalLength: number, count: number, lengths: number[] = []): number[] {
  const total = Math.max(1, Math.round(totalLength));
  const n = Math.min(Math.max(Math.round(count) || 1, 1), 8, total);
  if (n === 1) return [total];
  const head: number[] = [];
  for (let i = 0; i < n - 1; i++) head.push(Math.max(1, Math.round(lengths[i] ?? total / n)));
  let used = head.reduce((a, b) => a + b, 0);
  // Trim the head (from the last editable room back) so ≥1 ft is left for every remaining room.
  for (let i = n - 2; i >= 0 && used > total - (n - 1 - i); i--) {
    const reducible = Math.min(used - (total - (n - 1 - i)), head[i] - 1);
    if (reducible > 0) { head[i] -= reducible; used -= reducible; }
  }
  head.push(Math.max(1, total - used));
  return head;
}

/** Human-readable configuration summary — reused for the lead message, the
 *  WhatsApp share text and the PDF. */
export function summariseConfig(cfg: CabinConfig, est: Estimate): string {
  const product = findById(PRODUCTS, cfg.productId)?.label ?? "Cabin";

  // Storage containers use a dedicated grade-based summary format.
  if (isStorageProduct(cfg.productId)) {
    const size = STORAGE_SIZES.find((s) => s.length === est.dimLength && s.width === est.dimWidth);
    const grade = CONTAINER_GRADES.find((g) => g.id === cfg.containerGradeId);
    const rate = containerRate(est.dimLength, est.dimWidth, cfg.containerGradeId);
    const contact = rate <= 0;
    return [
      `Product: ${product}`,
      `Container Size: ${size?.label ?? `${est.dimLength} ft × ${est.dimWidth} ft`}${est.quantity > 1 ? ` × ${est.quantity} unit(s)` : ""}`,
      `Container Grade: ${grade?.label ?? "—"}`,
      `Base Container Rate: ${contact ? "Contact for Rate" : formatINR(rate)}`,
      `Delivery / Transport: ${est.transport ? formatINR(est.transport) : "As applicable"}`,
      cfg.gst ? `GST (18%): ${contact ? "As applicable" : formatINR(est.gst)}` : `GST: excluded`,
      `Grand Total: ${contact ? "Contact for Rate" : formatINR(est.total)}`,
      grade?.note ? `Note: ${grade.note}` : ``,
    ].filter((l) => l !== ``).join("\n");
  }

  const structure = findById(STRUCTURES, cfg.structureId)?.label ?? "";
  const wall = materialLabel(findWallMaterial(cfg.wallId));
  const ceiling = materialLabel(findById(CEILING_MATERIALS, cfg.ceilingId));
  const flooring = materialLabel(findById(FLOORING_MATERIALS, cfg.flooringId));
  const insul = findById(INSULATION_OPTIONS, cfg.insulationId);
  const door = findById(DOOR_TYPES, cfg.doorTypeId)?.label ?? "";
  const win = findById(WINDOW_TYPES, cfg.windowTypeId)?.label ?? "";
  const elec = est.electricalLines.map((l) => `${l.label} (${l.detail})`).join(", ") || "None";
  const furn = est.furnitureLines.map((l) => `${l.label}${l.detail.includes("×") ? " " + l.detail.split(" ")[0] : ""}`).join(", ") || "None";
  const isToilet = isToiletCabin(cfg.productId);
  const isStorage = isStorageProduct(cfg.productId);
  const vent = est.ventilationLines.map((l) => `${l.label} (${l.detail.split(" ")[0]} no.)`).join(", ");
  const roof = findRoof(cfg.roofId);
  // Per-room furniture placement (only meaningful for a multi-room layout).
  const roomFurn = cfg.roomCount > 1
    ? ROOM_FURNITURE_IDS.filter((id) => cfg.addons?.[id]).map((id) => {
        const a = ADDONS.find((x) => x.id === id);
        const counts = furnitureRoomCounts(cfg, id, cfg.addons[id], cfg.roomCount);
        const where = counts.map((c, i) => (c > 0 ? `Room ${i + 1} × ${c}` : "")).filter(Boolean).join(" + ") || "—";
        return `${a?.label ?? id} → ${where}`;
      }).join(", ")
    : "";

  return [
    `Product: ${product} (${structure})`,
    `Size: ${est.dimLength} × ${est.dimWidth} ft, H ${est.dimHeight} ft — ${est.area} sq.ft × ${est.quantity} unit(s)`,
    `Roof: ${roof.label}${cfg.roofId === "flat" ? ` (+${ROOF_FLAT_PCT})` : ""}`,
    isStorage ? `Usage: Material Storage / Tool Room` : ``,
    `Interior: Wall ${wall}, Ceiling ${ceiling}, Flooring ${flooring}`,
    insul && insul.id !== "none" ? `Insulation: ${insul.label} (${insul.thickness})` : ``,
    isToilet
      ? `Doors: ${cfg.doorQty} × ${door}`
      : `Doors/Windows: ${cfg.doorQty} × ${door}${cfg.doorPlacements?.length ? ` (${cfg.doorPlacements.map((d) => `${placementLabel(d)} · ${doorOpeningLabel(d)}`).join(", ")})` : ""}, ${cfg.windowQty} × ${win} ${formatFeet(cfg.windowWidthFt ?? 3)}×${formatFeet(cfg.windowHeightFt ?? 3)} ${findWindowTrack(cfg.windowTrackId).label}${cfg.windowPlacements?.length ? ` (${cfg.windowPlacements.map(placementLabel).join(", ")})` : ""}`,
    isToilet ? `Ventilation: ${vent || "Exhaust Fan (1 no.)"}` : ``,
    isToilet ? `Window: Not Applicable (toilet cabin)` : (isStorage && cfg.windowQty === 0 ? `Window: Not Applicable (add if required)` : ``),
    `Electrical: ${elec}`,
    cfg.roomCount > 1
      ? `Rooms: ${cfg.roomCount} (${cfg.roomLengths.map((l, i) => `R${i + 1} ${Math.round(l)}ft`).join(" · ")}) — ${cfg.roomCount - 1} × ${cfg.partitionDoor ? `Partition w/ ${partitionDoorTypeLabel(cfg.partitionDoorType)} @ ${formatFeet(cfg.partitionDoorOffset)} from rear${cfg.partitionDoorType === "hinged" ? ` (${partitionOpeningLabel(cfg.partitionDoorHinge, cfg.partitionDoorSwing)})` : ""}` : "Fixed Partition"}`
      : `Rooms: Single`,
    `Add-ons: ${furn}`,
    isToilet ? `` : `Furniture Position: ${furniturePositionLabel(cfg.furniturePosition)}`,
    roomFurn ? `Furniture Layout: ${roomFurn}` : ``,
    `Plug Point Placement: ${plugPointWallsLabel(cfg.plugPointWalls)}`,
    `Shifting / Mobility: ${mobilityTypeLabel(cfg.mobilityType)}`,
    `Delivery: Transport ${cfg.transport ? "Yes" : "No"}, Installation ${cfg.installation ? "Yes" : "No"}`,
    ``,
    `Base Cabin: ${formatINR(est.base)}`,
    est.heightSurcharge ? `Extra Height (${est.dimHeight} ft > 8'6"): ${formatINR(est.heightSurcharge)}` : ``,
    est.roofSurcharge ? `Flat Roof (+${ROOF_FLAT_PCT}): ${formatINR(est.roofSurcharge)}` : ``,
    est.interior ? `Interior: ${formatINR(est.interior)}` : ``,
    est.insulation ? `Insulation: ${formatINR(est.insulation)}` : ``,
    est.openings ? `Doors & Windows: ${formatINR(est.openings)}` : ``,
    est.ventilation ? `Ventilation: ${formatINR(est.ventilation)}` : ``,
    est.electrical ? `Electrical: ${formatINR(est.electrical)}` : ``,
    est.furniture ? `Furniture / Add-ons: ${formatINR(est.furniture)}` : ``,
    est.transport ? `Transport: ${formatINR(est.transport)}` : ``,
    est.installation ? `Installation: ${formatINR(est.installation)}` : ``,
    cfg.quantity > 1 ? `Per-cabin: ${formatINR(est.perCabin)}` : ``,
    `Subtotal: ${formatINR(est.subtotal)}`,
    cfg.gst ? `GST (18%): ${formatINR(est.gst)}` : `GST: excluded`,
    `Estimated Total: ${formatINR(est.total)}`,
  ]
    .filter((l) => l !== ``)
    .join("\n");
}
