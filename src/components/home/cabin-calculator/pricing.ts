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

// Type-only: CabinConfig carries the admin Material BOQ settings so they persist with the config.
// A type-only import keeps this module free of any runtime dependency on the BOQ engine, so the
// public homepage bundle is unchanged.
import type { BoqSettings, CabinBoqOptions } from "@/lib/boq/types";
// Type-only, for the SAME reason: a table's price is derived by the BOQ engine from the Material
// Master (spec §23 — "do not hardcode rates inside the calculator"), which this module must not
// import at runtime. computeEstimate() therefore takes the per-table costs as an INJECTED map
// (see EstimateOptions) rather than computing them itself. CabinCalculator — which is already a
// deferred, ssr:false chunk — does the pricing and passes the result in.
import type { CabinTable } from "@/features/cabin-design/furniture/tables/tableSchema";

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
  /** Restrict this finish to specific product ids (e.g. toilet-only APP Sheet).
   *  When set, it only shows — and is only charged — for those products. */
  onlyFor?: string[];
}

/** Material label with its board thickness appended when present, e.g. "MDF · 8 mm". */
export const materialLabel = (m?: Material | null): string =>
  m ? `${m.label}${m.thickness ? ` · ${m.thickness}` : ""}` : "";

/** Is finish `m` offered for product `productId`? (onlyFor gate — undefined = all products.) */
export const materialAllowed = (m: Material | null | undefined, productId: string): boolean =>
  !!m && (!m.onlyFor || m.onlyFor.includes(productId));

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
  // Toilet cabins ONLY: waterproof APP Sheet lining — the toilet's default internal wall.
  // +₹60/sqft over the standard (keep in sync with the ceiling APP Sheet entry below).
  { id: "app-sheet", label: "APP Sheet",     delta: 60, onlyFor: ["toilet-cabin"] },
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
  // Exclude product-restricted finishes (e.g. toilet-only APP Sheet) — PUF cabins are never toilets.
  ...WALL_MATERIALS.filter((m) => !m.onlyFor).map((m) => ({ ...m, delta: WALL_LINING_BASE_RATE + m.delta, standard: false })),
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
  { id: "acp",   label: "ACP",      delta: 240 }, // washable panel
  // Toilet cabins ONLY: waterproof APP Sheet — the toilet's default ceiling (+₹60/sqft,
  // keep in sync with the wall APP Sheet rate above).
  { id: "app-sheet", label: "APP Sheet", delta: 60, onlyFor: ["toilet-cabin"] },
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

/** Only the "Openable UPVC Window" is a casement that swings — sliding/uPVC/fixed don't. */
export const isOpenableWindow = (id: string) => id === "openable";
/** An openable (casement) window opens OUTSIDE (space-saving, no grill) or INSIDE (a safety
 *  grill is fitted so the opening stays secure). Drives the 2D-plan drawing. */
export type WindowOpening = "inside" | "outside";
export const WINDOW_OPENINGS = [
  { id: "outside", label: "Opens Outside" },
  { id: "inside",  label: "Opens Inside + Grill" },
] as const;
export const windowOpeningLabel = (id: string): string =>
  id === "inside" ? "opens inside (safety grill)" : "opens outside";

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
 * PER-OPENING SIZES.
 *
 * Every door and every window may carry its OWN width/height. The size is OPTIONAL on the
 * placement, and that is the whole design:
 *
 *   undefined  ⇒  fall back to the standard/global size  ⇒  behaves EXACTLY as before.
 *
 * That fallback is what keeps the public homepage calculator (which has no per-opening size UI and
 * only sets the single global windowWidthFt/windowHeightFt) bit-for-bit unchanged, and what lets a
 * config saved in localStorage BEFORE this feature keep pricing and drawing identically.
 *
 * ALWAYS resolve a size through doorSizeOf() / windowSizeOf(). Never read DOOR_SIZE or
 * cfg.windowWidthFt directly at a call site — that is exactly how one consumer (a drawing, the BOQ,
 * the furniture keep-out) silently keeps using 3×6 while the rest of the app moved on.
 * ------------------------------------------------------------------ */

/** Openings are clamped to a sane build range so a typo can't produce a 900 ft door. */
export const MIN_OPENING_FT = 1;
export const MAX_OPENING_FT = 12;
export const clampOpeningFt = (n: number, fallback: number): number =>
  Math.min(Math.max(Number.isFinite(n) ? n : fallback, MIN_OPENING_FT), MAX_OPENING_FT);

/** A per-opening size override. Both fields are optional and independent. */
export interface OpeningSizeOverride { widthFt?: number; heightFt?: number; }

/** The size ACTUALLY used for one door. Its own override wins; otherwise the standard 3′×6′. */
export const doorSizeOf = (d?: OpeningSizeOverride | null): OpeningSize => ({
  widthFt: clampOpeningFt(d?.widthFt ?? DOOR_SIZE.widthFt, DOOR_SIZE.widthFt),
  heightFt: clampOpeningFt(d?.heightFt ?? DOOR_SIZE.heightFt, DOOR_SIZE.heightFt),
});

/**
 * The size ACTUALLY used for one window. Resolution order:
 *   1. the window's own override      (admin per-window size)
 *   2. the config's global window size (what the PUBLIC calculator sets — unchanged behaviour)
 *   3. the standard 3′×3′
 */
export const windowSizeOf = (
  w?: OpeningSizeOverride | null,
  cfg?: { windowWidthFt?: number; windowHeightFt?: number } | null,
): OpeningSize => ({
  widthFt: clampOpeningFt(w?.widthFt ?? cfg?.windowWidthFt ?? WINDOW_SIZE.widthFt, WINDOW_SIZE.widthFt),
  heightFt: clampOpeningFt(w?.heightFt ?? cfg?.windowHeightFt ?? WINDOW_SIZE.heightFt, WINDOW_SIZE.heightFt),
});

/** True when this opening carries an explicit size of its own (i.e. "Custom", not "Standard"). */
export const hasCustomSize = (o?: OpeningSizeOverride | null): boolean =>
  o?.widthFt !== undefined || o?.heightFt !== undefined;

export interface OpeningPreset extends OpeningSize { id: string; label: string; }

/** Standard door sizes. The 3′×6′ entry IS `DOOR_SIZE` — picking it reproduces today's price exactly. */
export const DOOR_STD_SIZES: OpeningPreset[] = [
  { id: "d-2.5x6.5", label: "2′6″ × 6′6″ — Narrow",      widthFt: 2.5, heightFt: 6.5 },
  { id: "d-3x6",     label: "3′ × 6′ — Standard",        widthFt: 3,   heightFt: 6 },
  { id: "d-3x7",     label: "3′ × 7′ — Tall",            widthFt: 3,   heightFt: 7 },
  { id: "d-3.5x7",   label: "3′6″ × 7′ — Wide",          widthFt: 3.5, heightFt: 7 },
  { id: "d-4x7",     label: "4′ × 7′ — Extra Wide",      widthFt: 4,   heightFt: 7 },
  { id: "d-6x7",     label: "6′ × 7′ — Double Leaf",     widthFt: 6,   heightFt: 7 },
];

/** Standard window sizes. The 3′×3′ entry IS `WINDOW_SIZE` — today's default. */
export const WINDOW_STD_SIZES: OpeningPreset[] = [
  { id: "w-2x2",   label: "2′ × 2′ — Small",       widthFt: 2, heightFt: 2 },
  { id: "w-3x3",   label: "3′ × 3′ — Standard",    widthFt: 3, heightFt: 3 },
  { id: "w-4x3",   label: "4′ × 3′ — Wide",        widthFt: 4, heightFt: 3 },
  { id: "w-4x4",   label: "4′ × 4′ — Large",       widthFt: 4, heightFt: 4 },
  { id: "w-5x4",   label: "5′ × 4′ — Extra Wide",  widthFt: 5, heightFt: 4 },
  { id: "w-6x4",   label: "6′ × 4′ — Panoramic",   widthFt: 6, heightFt: 4 },
];

/** The preset matching this exact size, or undefined when the size is genuinely custom. */
export const matchPreset = (presets: OpeningPreset[], s: OpeningSize): OpeningPreset | undefined =>
  presets.find((p) => Math.abs(p.widthFt - s.widthFt) < 1e-6 && Math.abs(p.heightFt - s.heightFt) < 1e-6);

/**
 * Door price scales with AREA off the standard 3′×6′ (18 sq ft), exactly as windows scale off 3′×3′.
 * A standard door gives a ratio of 1.0, so a build with no custom sizes prices identically to before.
 */
export const DOOR_BASE_AREA = DOOR_SIZE.widthFt * DOOR_SIZE.heightFt; // 18 sq ft
export function doorUnitPrice(basePrice: number, widthFt: number, heightFt: number): number {
  const area = Math.max(1, widthFt || DOOR_SIZE.widthFt) * Math.max(1, heightFt || DOOR_SIZE.heightFt);
  return Math.round(basePrice * (area / DOOR_BASE_AREA));
}

/**
 * Breakdown text for a set of openings, e.g.
 *   all the same → "2 × uPVC Window 3′×3′"
 *   mixed sizes  → "3 × uPVC Window · sizes: 3′×3′, 4′×4′, 6′×4′"
 * Sizes that differ per opening MUST be spelled out — a single "3′×3′" on a quote whose windows are
 * actually three different sizes is how the wrong window gets manufactured.
 */
export function openingsDetail(qty: number, label: string, sizes: OpeningSize[], includedQty?: number): string {
  const head = `${qty} × ${label}`;
  const inc = includedQty ? ` · ${includedQty} included` : "";
  if (!sizes.length) return head + inc;
  const uniform = sizes.every((s) => s.widthFt === sizes[0].widthFt && s.heightFt === sizes[0].heightFt);
  return uniform
    ? `${head} ${sizeLabel(sizes[0])}${inc}`
    : `${head}${inc} · sizes: ${sizes.map(sizeLabel).join(", ")}`;
}

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
/**
 * One opening on a wall. `offset` is feet from that wall's start corner to the opening's NEAR EDGE.
 *
 * `widthFt` / `heightFt` are the OPTIONAL per-opening size override (see doorSizeOf / windowSizeOf).
 * Leaving them undefined means "standard size" and reproduces the pre-per-size behaviour exactly —
 * which is what keeps old saved configs and the public calculator unchanged. Resolve them through
 * doorSizeOf() / windowSizeOf(); never read the raw fields.
 */
export interface OpeningPlacement extends OpeningSizeOverride { side: string; offset: number; }

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

/* ---- Sliding partition door (side + travel direction) --------------------------- *
 * A sliding leaf does NOT swing — it hangs on ONE FACE of the partition and travels
 * ALONG it. The partition spans the cabin WIDTH, so the only axis it can travel on is
 * rear ↔ front. Two independent choices fully specify it:
 *   side      "left" | "right"  = which room's face the panel is mounted on (and parks in)
 *   direction "rear" | "front"  = which way the leaf travels as it opens
 * To open CLEAR of the doorway the leaf needs a run of blank partition equal to its own
 * width on the side it travels toward. Nothing else in the opening model enforces that,
 * so `partitionSlideOffsetRange` is the single source of truth for where the door may sit
 * — the UI, the 2D plan and the quote text all read it, and therefore cannot disagree.
 * -------------------------------------------------------------------------------- */
export type PartitionSlideSide = "left" | "right";
export type PartitionSlideDirection = "rear" | "front";
export const PARTITION_SLIDE_SIDES = [
  { id: "left",  label: "Left Side" },
  { id: "right", label: "Right Side" },
] as const;
export const PARTITION_SLIDE_DIRECTIONS = [
  { id: "rear",  label: "Slides to Rear" },
  { id: "front", label: "Slides to Front" },
] as const;

/** Blank partition (ft) the leaf has to park on, travelling `direction` from `offsetFt`. */
export const partitionSlideRunFt = (direction: PartitionSlideDirection, offsetFt: number, widthFt: number): number => {
  const ow = openingWidthOn(widthFt, DOOR_SIZE.widthFt);
  const off = clampOpeningOffset(offsetFt, widthFt, DOOR_SIZE.widthFt);
  return direction === "rear" ? off : Math.max(0, widthFt - off - ow);
};
/** True when the leaf retracts fully clear of the doorway (run ≥ its own width). */
export const partitionSlideFits = (direction: PartitionSlideDirection, offsetFt: number, widthFt: number): boolean =>
  partitionSlideRunFt(direction, offsetFt, widthFt) + 1e-6 >= openingWidthOn(widthFt, DOOR_SIZE.widthFt);
/** Door offsets (ft from the rear wall) at which the leaf fully retracts travelling `direction`.
 *  null ⇒ the partition is too short to ever clear the doorway (cabin width < 2 × door width),
 *  in which case a sliding partition door cannot open fully whichever way it is hung. */
export const partitionSlideOffsetRange = (
  direction: PartitionSlideDirection, widthFt: number,
): { min: number; max: number } | null => {
  const ow = openingWidthOn(widthFt, DOOR_SIZE.widthFt);
  const maxOff = maxOpeningOffset(widthFt, DOOR_SIZE.widthFt);
  const min = direction === "rear" ? ow : 0;
  const max = direction === "rear" ? maxOff : maxOff - ow;
  return max + 1e-6 < min ? null : { min, max };
};
/** Snap a door offset to the nearest position where the leaf fully retracts. Falls back to the
 *  plain opening clamp when no such position exists, so the door is still drawn on the wall. */
export const clampPartitionSlideOffset = (
  direction: PartitionSlideDirection, offsetFt: number, widthFt: number,
): number => {
  const off = clampOpeningOffset(offsetFt, widthFt, DOOR_SIZE.widthFt);
  const r = partitionSlideOffsetRange(direction, widthFt);
  return r ? Math.min(Math.max(off, r.min), r.max) : off;
};

/** e.g. "hinge left, opens out" — for the quote / WhatsApp / PDF. */
export const doorOpeningLabel = (d: DoorPlacement): string =>
  `hinge ${d.hand ?? "left"}, opens ${d.swing ?? "out"}`;
export const partitionOpeningLabel = (hinge: PartitionHinge, swing: PartitionSwing): string =>
  `hinge ${hinge === "top" ? "rear" : "front"}, opens into ${swing} room`;
/** e.g. "right face, slides to rear" — how a sliding partition door opens. */
export const partitionSlideLabel = (side: PartitionSlideSide, direction: PartitionSlideDirection): string =>
  `${side} face, slides to ${direction}`;

/* ---- Sliding partition door: the ONE shared geometry model --------------------- *
 * Every consumer of a sliding partition door — the 2D ModulePlan, the small FloorPreview,
 * the furniture keep-out (doorClearance), the validation warnings, the PDF spec table and
 * the WhatsApp/enquiry summary — reads its geometry from `slidingDoorModel`, so none of
 * them can disagree about where the leaf is, how far it travels, whether it fits, or where
 * furniture may not go.
 *
 * Frame — the partition spans the cabin WIDTH and is drawn as a VERTICAL wall in plan:
 *   • u-axis  = feet along the partition from the REAR wall (u=0) toward the FRONT (u=width).
 *   • faceSign = which room the leaf hangs in along the LENGTH axis: +1 = right room
 *                (drawn at larger x), -1 = left room.
 *   • travelSign = which way the leaf slides: -1 = toward the rear (u→0), +1 = toward the
 *                  front (u→width).
 * Bounds are returned in FEET on the u-axis; px consumers scale by (origin + u·ppf) and
 * project the face with faceSign. Nothing here touches React or pixels. */
export interface USpan {
  /** near edge (smaller u, feet from rear) */ u0: number;
  /** far edge (larger u, feet from rear) */ u1: number;
}
export interface SlidingDoorModel {
  side: PartitionSlideSide;
  direction: PartitionSlideDirection;
  faceSign: 1 | -1;             // +1 = right room, -1 = left room
  travelSign: 1 | -1;          // +1 = slides toward front, -1 = toward rear
  widthFt: number;             // cabin width = partition length
  doorWidthFt: number;         // leaf width along the partition
  offsetFt: number;            // clamped near-edge distance from the rear wall
  opening: USpan;              // the doorway gap (what a person walks through)
  closed: USpan;               // the closed leaf footprint (== opening)
  parked: USpan;               // the parked/retracted leaf footprint (clamped to blank partition)
  travel: USpan;               // full swept envelope = closed ∪ parked
  runFt: number;               // blank partition available to retract onto
  needFt: number;              // blank partition required to fully retract (== doorWidthFt)
  fits: boolean;               // runFt >= needFt (leaf clears the doorway when open)
  validRange: { min: number; max: number } | null; // offsets where it fits; null = impossible (cabin too narrow)
  warning: string | null;      // canonical human warning when it does not fit (null when fine)
}

/** Build the sliding-door geometry model from a cabin config. Uses the SAME opening clamps as
 *  the drawing (openingWidthOn / clampOpeningOffset), so the model and every renderer agree. */
export const slidingDoorModel = (
  cfg: Pick<CabinConfig, "width" | "partitionDoorOffset" | "partitionSlideSide" | "partitionSlideDirection">,
): SlidingDoorModel => {
  const widthFt = Math.max(1, cfg.width || 1);
  const side = cfg.partitionSlideSide ?? "right";
  const direction = cfg.partitionSlideDirection ?? "rear";
  const faceSign: 1 | -1 = side === "right" ? 1 : -1;
  const travelSign: 1 | -1 = direction === "front" ? 1 : -1;
  const doorWidthFt = openingWidthOn(widthFt, DOOR_SIZE.widthFt);
  const offsetFt = clampOpeningOffset(cfg.partitionDoorOffset ?? 0, widthFt, DOOR_SIZE.widthFt);
  const opening: USpan = { u0: offsetFt, u1: offsetFt + doorWidthFt };
  const runFt = partitionSlideRunFt(direction, offsetFt, widthFt);
  // The DRAWN parked leaf is clamped to the blank partition actually available, so it is never
  // drawn (or kept-out) through the exterior wall when the door sits too close to that end.
  const parkFt = Math.min(doorWidthFt, runFt);
  const parked: USpan = direction === "rear"
    ? { u0: opening.u0 - parkFt, u1: opening.u0 }
    : { u0: opening.u1, u1: opening.u1 + parkFt };
  const travel: USpan = { u0: Math.min(opening.u0, parked.u0), u1: Math.max(opening.u1, parked.u1) };
  const needFt = doorWidthFt;
  const fits = runFt + 1e-6 >= needFt;
  const validRange = partitionSlideOffsetRange(direction, widthFt);
  const warning = fits ? null
    : `Sliding panel needs ${formatFeet(needFt)} of clear partition to slide ${direction}, only ${formatFeet(runFt)} available`;
  return {
    side, direction, faceSign, travelSign, widthFt, doorWidthFt, offsetFt,
    opening, closed: opening, parked, travel, runFt, needFt, fits, validRange, warning,
  };
};

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
  // External / entrance light — a bulkhead light OUTSIDE the cabin over the entrance / walkway.
  // Positioned along the door's wall via externalLightOffset (see the accessor below).
  { id: "ext-light", label: "External / Entrance Light", unitPrice: 1200, defaultQty: () => 1, preselect: false },
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

/* ---- Room-wise socket (plug-point) placement — SPEC-ONLY positioning ------------------- *
 * Supersedes the global `plugPointWalls` above. Sockets are chosen PER ROOM, on any wall,
 * with a left/right position. The priced count still lives in electrical.plug; the invariant
 * totalPlacedPlugs(cfg) === (electrical.plug || 0) is held by withSocketPlan/reconcileSocketPlan
 * so the drawing, the quote and the price never disagree. Wall ids match the 2D plan's
 * coordinate convention (top = Upper/rear wall, bottom = Down/front wall).
 * -------------------------------------------------------------------------------------- */
export const PLUG_WALLS = [
  { id: "top",    label: "Upper Wall" },
  { id: "bottom", label: "Down Wall" },
  { id: "left",   label: "Left Wall" },
  { id: "right",  label: "Right Wall" },
] as const;
export type PlugWall = (typeof PLUG_WALLS)[number]["id"];
export const plugWallLabel = (id: string): string => PLUG_WALLS.find((w) => w.id === id)?.label ?? id;

/** A run of `plugCount` plug points on one wall of a room, centred at `pos` (0..1 along that
 *  wall) — nudged left/right by the movement controls. Each plug point = 2 sockets + 2 switches
 *  and is drawn as ONE marker, so plugCount maps 1:1 to the priced electrical.plug. */
export interface PlugGroup { wall: PlugWall; plugCount: number; pos: number; }

/** Room purposes — spec-only labels so the socket selector & 2D plan read "Office Room",
 *  "Pantry Area", etc. instead of only "Room 2". "other" (or unset) renders as plain "Room N". */
export const ROOM_PURPOSES = [
  { id: "office",      label: "Office Room" },
  { id: "workstation", label: "Workstation Area" },
  { id: "manager",     label: "Manager Cabin" },
  { id: "reception",   label: "Reception" },
  { id: "meeting",     label: "Meeting Room" },
  { id: "pantry",      label: "Pantry Area" },
  { id: "toilet",      label: "Toilet Area" },
  { id: "store",       label: "Store Room" },
  { id: "other",       label: "Room" },
] as const;
export const roomPurposeLabel = (id: string | undefined): string =>
  ROOM_PURPOSES.find((p) => p.id === id)?.label ?? "Room";

export const MOBILITY_TYPES = [
  { id: "movable", label: "100% Movable (fully relocatable)" },
  { id: "fixed", label: "Fixed / Semi-permanent" },
] as const;

/** A sliding partition door saves floor space (no swing arc) and costs +₹8,000 over a
 *  regular hinged partition door. */
export const PARTITION_SLIDING_PREMIUM = 8000;

/** Partition door type. Priced through the partition add-ons:
 *   • no door  → "Fixed Partition"             ₹17,500 each
 *   • hinged   → "Partition with Door"         ₹22,000 each (all-in)
 *   • sliding  → "Partition with Sliding Door" ₹30,000 each (₹22,000 + ₹8,000 sliding premium) */
export const PARTITION_DOOR_TYPES = [
  { id: "hinged",  label: "Hinged Door",  premium: 0 },
  { id: "sliding", label: "Sliding Door", premium: PARTITION_SLIDING_PREMIUM },
] as const;
export const partitionDoorTypeLabel = (id: string): string =>
  PARTITION_DOOR_TYPES.find((t) => t.id === id)?.label ?? id;

/** The one-line partition spec, e.g.
 *    "Partition w/ Sliding Door @ 3' from rear (right face, slides to rear)"
 *    "Partition w/ Hinged Door @ 2'6" from rear (hinge rear, opens into right room)"
 *    "Fixed Partition"
 *  Shared by the WhatsApp/enquiry summary AND the printed PDF spec table so the two can never
 *  drift — the factory reads whichever reaches it first. */
export const partitionSpecLabel = (
  cfg: Pick<CabinConfig,
    "width" | "partitionDoor" | "partitionDoorType" | "partitionDoorOffset" |
    "partitionDoorHinge" | "partitionDoorSwing" | "partitionSlideSide" | "partitionSlideDirection">,
): string => {
  if (!cfg.partitionDoor) return "Fixed Partition";
  const sliding = cfg.partitionDoorType === "sliding";
  const side = cfg.partitionSlideSide ?? "right";
  const dir = cfg.partitionSlideDirection ?? "rear";
  const opening = sliding
    ? partitionSlideLabel(side, dir)
    : partitionOpeningLabel(cfg.partitionDoorHinge, cfg.partitionDoorSwing);
  // A leaf with too little blank partition to retract into is a build defect — say so in the
  // spec rather than letting the factory discover it on site. The warning text comes from the
  // shared model so the spec table, the WhatsApp summary and the admin UI all read identically.
  const tight = sliding ? slidingDoorModel(cfg).warning : null;
  return `Partition w/ ${partitionDoorTypeLabel(cfg.partitionDoorType)} @ ${formatFeet(cfg.partitionDoorOffset)} from rear (${opening})${tight ? ` [WARNING: ${tight}]` : ""}`;
};
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
  // Plumbing / pantry fittings for an ATTACHED washroom inside the cabin. The toilet & pantry
  // are SIZED (their price is size-based — see fixtureUnitPrice / FIXTURE_SIZING); `price` here
  // is the base at the standard size, so flat-price fallbacks still work.
  { id: "toilet-wc",       label: "Attached WC / Toilet (4′×4′)",       price: 25000, hasQty: true, hint: "Enclosed WC inside the cabin — 4′×4′ standard, priced by sq.ft above" },
  { id: "toilet-washroom", label: "Toilet with Bath / Washroom (6′×4′)", price: 35000, hasQty: true, hint: "Enclosed washroom with WC + bath — 6′×4′ standard, priced by sq.ft above" },
  { id: "pantry",      label: "Pantry",           price: 18000, hasQty: true, hint: "Counter inside the cabin — 4 ft standard, priced by running foot" },
  { id: "wash-basin",  label: "Wash Basin",       price: 4500,  hasQty: true, hint: "Placeable at any wall/position inside the cabin" },
  { id: "urinal",      label: "Urinal",           price: 6500,  hasQty: true, hint: "Urinal fitting with a separation partition" },
  { id: "partition",      label: "Fixed Partition",     price: 17500, hasQty: true },
  { id: "partition-door", label: "Partition with Door", price: 22000, hasQty: true },
  // Sliding partition door = hinged door (₹22,000) + PARTITION_SLIDING_PREMIUM (₹8,000).
  { id: "partition-door-sliding", label: "Partition with Sliding Door", price: 30000, hasQty: true },
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

/** Toilet / plumbing fittings — the ONLY optional add-ons offered for a toilet cabin (a
 *  complete, self-contained washroom), in display order. These same fittings are also
 *  offered as an attached-washroom option on the other, furniture-capable cabins. */
export const TOILET_FITTING_IDS: string[] = ["toilet-wc", "toilet-washroom", "urinal", "wash-basin", "pantry"];

/** The optional add-ons offered for a product, in display order. A TOILET CABIN gets ONLY the
 *  plumbing fittings above (no office furniture — it is a self-contained washroom). Every other
 *  cabin gets the full add-on list minus the partition rows (those are driven by the Rooms
 *  control in the Size step) and honouring each add-on's `onlyFor` product gate. */
export function addonsForProduct(productId: string): AddonItem[] {
  if (isToiletCabin(productId)) {
    return TOILET_FITTING_IDS
      .map((id) => ADDONS.find((a) => a.id === id))
      .filter((a): a is AddonItem => !!a);
  }
  // A security cabin is a compact guard booth — it has no attached washroom / pantry, so the
  // plumbing & pantry FIXTURES (toilet, washroom, urinal, wash-basin, pantry) are not offered.
  const noWetFittings = productId === "security-cabin";
  return ADDONS.filter(
    (a) =>
      a.id !== "partition" && a.id !== "partition-door" && a.id !== "partition-door-sliding" &&
      !(noWetFittings && FIXTURE_IDS.includes(a.id)) &&
      (!a.onlyFor || a.onlyFor.includes(productId)),
  );
}

/** Keep ONLY toilet/plumbing fittings in an add-ons map, dropping every office-furniture
 *  entry. Used when switching to (or restoring) a toilet cabin so furniture chosen on a
 *  previously-selected product can't leak into the toilet cabin's 2D plan, quote or price. */
export function toiletAddonsOnly(addons: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of Object.keys(addons ?? {})) {
    if (TOILET_FITTING_IDS.includes(id)) out[id] = addons[id];
  }
  return out;
}

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
  /** For an OPENABLE (casement) window: which way the sash swings — "outside" (no grill) or
   *  "inside" (a safety grill is fitted). Ignored for sliding / uPVC / fixed windows. */
  windowOpening: WindowOpening;
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
  /** External / entrance light position: distance (ft) from the door wall's start corner to the
   *  light, along that wall (the light sits just OUTSIDE the cabin over the entrance/walkway).
   *  Optional; externalLightOffsetOf defaults it to sit beside the main door. */
  externalLightOffset?: number;
  /** Spec-only placement choices (no price impact) — captured in the quote/PDF.
   *  furniturePosition: wall | centre · mobilityType: movable | fixed. */
  furniturePosition: string;
  /** Per-table placement — addon id → array of TABLE_POSITIONS ids, one entry per unit.
   *  Lets the customer put each individual table on a specific wall (or the centre pod). */
  tablePlacements: Record<string, string[]>;
  /** Per-unit manual adjust for EVERY furniture item — rotation (0/90/180/270°) and a
   *  fine shift in FEET (dx = right, dy = down) from its auto-arranged spot. addon id →
   *  one entry per unit. Empty entry = no adjust (auto placement). */
  furnitureAdjust: Record<string, { rot: number; dx: number; dy: number }[]>;
  /** Sized fixtures — chosen size per fixture add-on id. Enclosed toilets store {wFt,dFt} (area
   *  drives price); the pantry stores {wFt=counter length} (running-foot price). Optional; the
   *  fixtureSizeOf accessor clamps to each id's minimum. */
  fixtureSize?: Record<string, { wFt: number; dFt: number }>;
  /** Fixture placement (spec-only): a TOILET_CORNERS id for the enclosed toilets, a FIXTURE_WALLS
   *  id for pantry / wash-basin / urinal. Optional; fixturePlacementOf provides a default. */
  fixturePlacement?: Record<string, string>;
  /** Enclosed-toilet door face (spec-only): a TOILET_DOOR_SIDES id. Optional. @deprecated by the
   *  per-unit fields below (kept only to seed unit 0 when migrating an older saved config). */
  fixtureDoorSide?: Record<string, string>;
  /** Per-UNIT fitting placement (spec-only) — one entry per unit of a fitting add-on, so multiple
   *  attached toilets / basins / urinals / pantries can each sit on their own wall & spot.
   *   • fixtureUnitWall   — FIXTURE_WALLS id (top/bottom/left/right) the unit sits against.
   *   • fixtureUnitOffset — ft from that wall's start corner to the unit's near edge (<0 = auto-spread).
   *   • fixtureUnitSwing  — enclosed toilets only: door swings "in" (into the toilet) or "out" (into
   *                          the cabin room).
   *  The fixtureUnit*Of accessors always return exactly `qty` entries, so a quantity change can
   *  never leave a unit unplaced. */
  fixtureUnitWall?: Record<string, string[]>;
  fixtureUnitOffset?: Record<string, number[]>;
  fixtureUnitSwing?: Record<string, string[]>;
  /** Per-UNIT EWC (commode) placement INSIDE an enclosed toilet's own partition — independent
   *  of where the partition box itself sits. Enclosed toilets only; one entry per unit.
   *   • fixtureUnitEwcWall — which of the partition's 4 walls (FIXTURE_WALLS id) the commode is
   *      set out from. "auto"/absent = a sensible default (the toilet's back wall). The commode
   *      is auto-centred along that wall and auto-nudged so it never blocks the door.
   *   • fixtureUnitEwcDist — perpendicular gap (ft) FROM that wall to the commode (0 = flush).
   *  Clamped in the plan so the commode always stays inside the partition. */
  fixtureUnitEwcWall?: Record<string, string[]>;
  fixtureUnitEwcDist?: Record<string, number[]>;
  /** Gap (ft) between wall-attached furniture and the wall it sits against. 0 = flush to the
   *  wall (default). Lets the customer add walking / servicing clearance behind desks &
   *  cupboards on the 2D plan — a spec-only layout adjustment (no price impact). */
  furnitureWallGap: number;
  /** @deprecated Legacy GLOBAL plug-point placement (upper/down/left/right/table). Kept only so
   *  older saved configs can be migrated into the room-wise `socketPlan`; no longer edited/drawn. */
  plugPointWalls: string[];
  /** Room-wise socket (plug-point) placement — one PlugGroup[] per room (index = room 0..N-1).
   *  SPEC-ONLY positioning; the priced count lives in electrical.plug and equals the sum of every
   *  plugCount here (held by withSocketPlan / totalPlacedPlugs). Optional so old saves stay valid. */
  socketPlan?: PlugGroup[][];
  /** Room purposes — one ROOM_PURPOSES id per room (spec-only), for the socket selector and 2D
   *  plan captions ("Office Room", "Pantry Area", …). Optional; unset rooms read as "Room N". */
  roomPurposes?: string[];
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
  /** HINGED partition-door opening: which end of the opening is hinged (rear/front end of the
   *  partition) and which room the leaf swings into. Applies to all N-1 partitions. */
  partitionDoorHinge: PartitionHinge;
  partitionDoorSwing: PartitionSwing;
  /** SLIDING partition-door opening: which room's face the leaf hangs on, and which way it
   *  travels along the partition when it opens. Only meaningful when partitionDoorType is
   *  "sliding" (a sliding leaf has no hinge and no swing). Applies to all N-1 partitions. */
  partitionSlideSide: PartitionSlideSide;
  partitionSlideDirection: PartitionSlideDirection;
  transport: boolean;
  installation: boolean;
  gst: boolean;
  /** ADMIN-ONLY, and deliberately invisible to computeEstimate(): the Material BOQ's saved settings
   *  (rates, wastage, norms, per-line overrides, charges, template). It rides in this object purely
   *  so it persists with the rest of the config through localStorage. The customer estimate is a
   *  top-down ₹/sqft model and must not move because a BOQ rate was tuned — nothing in
   *  computeEstimate(), summariseConfig() or the enquiry payload reads these two fields. */
  boq?: BoqSettings;
  /** ADMIN-ONLY: floors / staircase / veranda for the BOQ. The customer wizard is single-storey and
   *  has no veranda, so these live outside it and default to "one floor, neither". */
  boqOptions?: CabinBoqOptions;
  /** Table Customisation Module (spec §26) — the COMPLETE structured configuration of every table
   *  in the design: type, shape, dimensions, position, rotation, material, support, storage,
   *  accessories, electrical and seating. Because it lives on CabinConfig it is saved, reloaded,
   *  taken off into the BOQ and drawn from ONE object, so a reopened design is byte-identical.
   *  Optional so every config persisted before the module existed still loads. */
  tables?: CabinTable[];
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
  /** Parametric tables. A SUB-VIEW of `furniture` — the amount is ALREADY inside `furniture`
   *  (and therefore inside `perCabin`). It exists so the UI, the PDF and the quotation can
   *  itemise the tables separately. NEVER add it to a total again. */
  tables: number;
  tableLines: LineDelta[];
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

/** The ONE accessor for a design's tables — nothing else ever indexes `cfg.tables` raw, so a config
 *  persisted before the module existed (where the field is absent) can never throw. */
export const tablesOf = (cfg: CabinConfig): CabinTable[] =>
  Array.isArray(cfg.tables) ? cfg.tables : [];

/** Injected inputs computeEstimate cannot derive without importing the BOQ engine (see the
 *  type-only import note at the top of this file). */
export interface EstimateOptions {
  /** tableId → total ₹ for that table's FULL quantity, priced by the BOQ engine from the Material
   *  Master. Absent ⇒ tables contribute ₹0, which is what a caller with no engine (e.g. the
   *  server-side `fromPrice`) correctly wants. */
  tableCosts?: Record<string, number>;
}

export function buildDefaultConfig(productId = PRODUCTS[0].id): CabinConfig {
  const product = findById(PRODUCTS, productId) ?? PRODUCTS[0];
  const area = product.def.length * product.def.width;
  const container = isStorageProduct(product.id);
  // The "Puf Panel Cabin" product defaults to the PUF panel structure (its walls ARE PUF
  // panels), which in turn defaults the interior wall to "Not Required".
  const puf = product.id === "puf-panel-cabin";
  // Toilet cabins default to a waterproof APP Sheet lining on the WALLS (the wet-area
  // finish; a toilet-only option, see WALL_MATERIALS) and a standard MDF ceiling.
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
    wallId: puf ? WALL_NONE.id : toilet ? "app-sheet" : WALL_MATERIALS.find((m) => m.standard)!.id,
    // Ceiling defaults to the standard MDF board for every product, toilet cabins included.
    ceilingId: CEILING_MATERIALS.find((m) => m.standard)!.id,
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
    windowOpening: "outside", // casement default: opens out (space-saving, no grill)
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
    furnitureAdjust: {},
    fixtureSize: {},
    fixturePlacement: {},
    fixtureDoorSide: {},
    furnitureWallGap: 0, // furniture sits flush to the wall by default
    plugPointWalls: ["down"], // legacy/migration only — superseded by socketPlan below
    // Room-wise socket placement (spec-only positioning). Single room by default: place the
    // preselected Plug Points on the Down (front) wall, centred. Sum === electrical.plug.
    socketPlan: (electrical.plug ?? 0) > 0 ? [[{ wall: "bottom" as const, plugCount: electrical.plug, pos: 0.5 }]] : [],
    roomPurposes: [],
    mobilityType: "movable",
    furnitureRoom: {},
    tables: [],
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
    // If the customer switches to a sliding door: leaf on the right room's face, sliding rearward.
    // (The offset is re-snapped to a position the leaf can retract into on that switch.)
    partitionSlideSide: "right",
    partitionSlideDirection: "rear",
    transport: false,
    installation: false,
    gst: true,
  };
}

/** Clamp helper: keep dimensions/quantities sane so the estimate can't go absurd. */
const clamp = (n: number, min: number, max: number) =>
  Number.isFinite(n) ? Math.min(Math.max(n, min), max) : min;

export function computeEstimate(cfg: CabinConfig, opts: EstimateOptions = {}): Estimate {
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

  // Interior deltas (₹/sqft over the standard finish). A finish restricted to another
  // product (e.g. a leftover toilet-only APP Sheet after switching product) falls back to
  // the standard so it is never shown/charged on a product it doesn't belong to.
  const puf = isPufPanel(cfg.structureId);
  const wallStd = WALL_MATERIALS.find((m) => m.standard) ?? WALL_MATERIALS[0];
  const ceilStd = CEILING_MATERIALS.find((m) => m.standard) ?? CEILING_MATERIALS[0];
  const wallSel = findWallMaterial(cfg.wallId) ?? wallStd;
  const wall = materialAllowed(wallSel, cfg.productId) ? wallSel : wallStd;
  const ceilingSel = findById(CEILING_MATERIALS, cfg.ceilingId) ?? ceilStd;
  const ceiling = materialAllowed(ceilingSel, cfg.productId) ? ceilingSel : ceilStd;
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
  const winTrack = findWindowTrack(cfg.windowTrackId);

  // Each opening is priced at ITS OWN size. Sizes are resolved per index, and an index with no
  // placement (or no override) resolves to the standard/global size — so a build with no custom
  // sizes produces exactly the same total as before this feature existed.
  const doorSizes = Array.from({ length: doorQty }, (_, i) => doorSizeOf(cfg.doorPlacements?.[i]));
  const winSizes = Array.from({ length: windowQty }, (_, i) => windowSizeOf(cfg.windowPlacements?.[i], cfg));

  // Doors scale by area off the standard 3′×6′ (ratio 1.0 for a standard door).
  const doorGross = doorSizes.reduce((s, sz) => s + doorUnitPrice(door.price, sz.widthFt, sz.heightFt), 0);
  // The "1 Steel Door included" allowance is worth ONE STANDARD door — so if the free door is
  // upgraded to a bigger one, the customer pays only the DIFFERENCE rather than getting the upgrade
  // free. With all-standard doors this reduces to the old `price × (qty − included)` exactly.
  const doorAllowance = (door.includedQty ?? 0) * door.price;
  const doorAmt = round(Math.max(0, doorGross - doorAllowance));

  // Windows: base 3×3 ft, 2-track — price scales with area and track (2.5-track = +12%).
  const winAmt = round(
    winSizes.reduce((s, sz) => s + windowUnitPrice(win.price, sz.widthFt, sz.heightFt, cfg.windowTrackId), 0),
  );

  const openings = doorAmt + winAmt;
  const openingLines: LineDelta[] = [
    { label: "Doors", detail: openingsDetail(doorQty, door.label, doorSizes, door.includedQty), amount: doorAmt },
    { label: "Windows", detail: `${openingsDetail(windowQty, win.label, winSizes)} · ${winTrack.label}`, amount: winAmt },
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
      // Sized fixtures (enclosed toilets by area, pantry by running foot) price via
      // fixtureUnitPrice; every other add-on uses its flat ADDONS price. Using the same unit
      // for BOTH the amount and the printed detail keeps the line and the charge in lockstep.
      const unit = fixtureUnitPrice(a.id, cfg);
      const sizeLbl = fixtureSizeLabel(a.id, cfg);
      const amt = round(unit * qty);
      furniture += amt;
      furnitureLines.push({
        label: sizeLbl ? `${a.label} · ${sizeLbl}` : a.label,
        detail: a.hasQty ? `${qty} × ${formatINR(unit)}` : formatINR(unit),
        amount: amt,
      });
    }
  });

  /* Parametric tables (Table Customisation Module).
   *
   * Every table's cost is computed by the BOQ engine from the Material Master and handed in via
   * `opts.tableCosts` — this module never invents a furniture rate (spec §23). The amounts are
   * FOLDED INTO the `furniture` bucket so that every existing consumer (perCabin, the on-screen
   * breakdown, the PDF, the WhatsApp summary) picks them up with no change, and `est.tables` is
   * published purely as an itemisable sub-view. */
  const tableCosts = opts.tableCosts ?? {};
  const tableLines: LineDelta[] = [];
  let tables = 0;
  tablesOf(cfg).forEach((t) => {
    const qty = clamp(Math.round(t.quantity ?? 0), 0, 50);
    const amt = round(tableCosts[t.id] ?? 0);
    if (qty <= 0 || amt <= 0) return;
    tables += amt;
    tableLines.push({
      label: `${t.name} · ${Math.round(t.dimensions.lengthMm)} × ${Math.round(t.dimensions.depthMm)} × ${Math.round(t.dimensions.heightMm)} mm`,
      detail: qty > 1 ? `${qty} × ${formatINR(round(amt / qty))}` : formatINR(amt),
      amount: amt,
    });
  });
  furniture += tables;
  furnitureLines.push(...tableLines);

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
    tables: container ? 0 : tables,
    tableLines: container ? [] : tableLines,
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

/** Add-on ids that are office work furniture drawn per-room in the 2D plan and assignable to a
 *  specific room in a multi-room layout (drives the Add-ons room picker + drawing). Plumbing/
 *  pantry FIXTURES (see FIXTURE_IDS) and partitions are excluded — fixtures are drawn by their
 *  own plan block, partitions by the Rooms control. */
export const ROOM_FURNITURE_IDS = ["workstation", "manager", "manager-l", "conference", "table", "table-drawer", "cupboard", "overhead", "chair-headrest", "chair-backrest"];

/** Plumbing / pantry fixtures — drawn in the 2D plan for EVERY cabin (including the toilet
 *  cabin, whose fittings these are). Placed by their own fixtures block, not the per-room
 *  furniture layout. */
export const FIXTURE_IDS = ["toilet-wc", "toilet-washroom", "wash-basin", "urinal", "pantry"];

/** The two ENCLOSED toilet/washroom fixtures — drawn as a partitioned corner sub-room (not a
 *  loose glyph). Their price is size-based (area × ₹/sqft). */
export const ENCLOSED_TOILET_IDS = ["toilet-wc", "toilet-washroom"];

/** Size-based pricing config for the enclosed toilets. Base price is at the standard (minimum)
 *  size; the ₹/sqft is derived from base ÷ standard-area so the standard size hits the base
 *  price exactly (WC 4×4=₹25,000 · Washroom 6×4=₹35,000). */
export const FIXTURE_SIZING: Record<string, { minW: number; minD: number; base: number; ratePerSqft: number }> = {
  "toilet-wc":       { minW: 4, minD: 4, base: 25000, ratePerSqft: 25000 / 16 },
  "toilet-washroom": { minW: 6, minD: 4, base: 35000, ratePerSqft: 35000 / 24 },
};
/** Pantry is a counter along a wall, priced by RUNNING FOOT (depth fixed). Base 4 ft = ₹18,000. */
export const PANTRY_RATE_PER_FT = 4500;
export const PANTRY_MIN_FT = 4;
export const PANTRY_DEPTH_FT = 2;

/** Corner a toilet/washroom is anchored to (relative to its room's band). rear = Upper wall,
 *  front = Down wall. */
export const TOILET_CORNERS = [
  { id: "rear-left",   label: "Rear-Left" },
  { id: "rear-right",  label: "Rear-Right" },
  { id: "front-left",  label: "Front-Left" },
  { id: "front-right", label: "Front-Right" },
] as const;
export const toiletCornerLabel = (id: string): string => TOILET_CORNERS.find((c) => c.id === id)?.label ?? id;
/** The toilet/washroom door opens on ONE of the enclosure's two interior faces: the face running
 *  along the cabin LENGTH ("length") or along the WIDTH ("width"). */
export const TOILET_DOOR_SIDES = [
  { id: "length", label: "Along length" },
  { id: "width",  label: "Along width" },
] as const;
export const toiletDoorSideLabel = (id: string): string => TOILET_DOOR_SIDES.find((s) => s.id === id)?.label ?? id;
/** Wall a pantry / wash-basin / urinal sits against inside the cabin. */
export const FIXTURE_WALLS = [
  { id: "top",    label: "Upper Wall" },
  { id: "bottom", label: "Down Wall" },
  { id: "left",   label: "Left Wall" },
  { id: "right",  label: "Right Wall" },
] as const;
export const fixtureWallLabel = (id: string): string => FIXTURE_WALLS.find((w) => w.id === id)?.label ?? id;

/** Add-ons drawn as individually-positioned floor pieces the customer can nudge in the plan
 *  (per-unit rotate + feet-shift): work tables + plain tables + cupboard + overhead cabinet +
 *  the plumbing/pantry fixtures. Chairs are auto-seated at their desk, so they're not nudged
 *  individually here. */
export const MOVABLE_ADDON_IDS = [
  "workstation", "manager", "manager-l", "conference", "table", "table-drawer",
  "cupboard", "overhead", ...FIXTURE_IDS,
];

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

/** Per-unit manual adjust (rotation + feet shift) for a furniture add-on. Always returns
 *  exactly `qty` entries so a quantity change can never leave a unit without an entry. */
export interface FurnitureAdjust { rot: number; dx: number; dy: number; }
export function furnitureAdjustOf(cfg: CabinConfig, addonId: string, qty: number): FurnitureAdjust[] {
  const saved = cfg.furnitureAdjust?.[addonId] ?? [];
  const n = Math.max(0, Math.round(qty) || 0);
  return Array.from({ length: n }, (_, i) => ({
    rot: ((saved[i]?.rot ?? 0) % 360 + 360) % 360,
    dx: saved[i]?.dx ?? 0,
    dy: saved[i]?.dy ?? 0,
  }));
}

/* ---- Sized / placeable fixtures (toilet, washroom, pantry, wash-basin, urinal) ---------- *
 * Size drives price (enclosed toilets by area, pantry by running foot); placement + door side
 * are spec-only and drive the 2D plan. Accessors always return a valid, clamped value so a
 * stale / missing entry can never break the drawing or the estimate. */

/** Stored size for a sized fixture, clamped to [per-id minimum … cabin size]. A fitting can
 *  never exceed the cabin it sits in: its width runs along the cabin LENGTH and its depth along
 *  the cabin WIDTH, so those are the upper bounds (applies to every product). Enclosed toilets
 *  use the FIXTURE_SIZING minimums; the pantry is a counter (min length, fixed depth). */
export function fixtureSizeOf(cfg: CabinConfig, id: string): { wFt: number; dFt: number } {
  const s = cfg.fixtureSize?.[id];
  // Cabin interior bounds (never below the fitting's own minimum, so a tiny cabin can't force a
  // sub-minimum size — the fitting just fills the cabin).
  const maxW = Math.max(1, Math.floor(Number(cfg.length) || 1));
  const maxD = Math.max(1, Math.floor(Number(cfg.width) || 1));
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
  if (id === "pantry") {
    const w = Math.round(Number(s?.wFt) || PANTRY_MIN_FT);
    return { wFt: clamp(w, PANTRY_MIN_FT, maxW), dFt: PANTRY_DEPTH_FT };
  }
  const spec = FIXTURE_SIZING[id];
  if (!spec) return { wFt: clamp(Number(s?.wFt) || 1, 1, maxW), dFt: clamp(Number(s?.dFt) || 1, 1, maxD) };
  return {
    wFt: clamp(Number(s?.wFt) || spec.minW, spec.minW, maxW),
    dFt: clamp(Number(s?.dFt) || spec.minD, spec.minD, maxD),
  };
}

/** Default placement for a fixture: a corner for the enclosed toilets, a wall for pantry /
 *  wash-basin / urinal. */
export function fixturePlacementOf(cfg: CabinConfig, id: string): string {
  const saved = cfg.fixturePlacement?.[id];
  if (ENCLOSED_TOILET_IDS.includes(id)) {
    return TOILET_CORNERS.some((c) => c.id === saved) ? saved! : "rear-left";
  }
  return FIXTURE_WALLS.some((w) => w.id === saved) ? saved! : "bottom";
}

/** Which interior face the enclosed toilet's door opens on. */
export function fixtureDoorSideOf(cfg: CabinConfig, id: string): string {
  const saved = cfg.fixtureDoorSide?.[id];
  return TOILET_DOOR_SIDES.some((s) => s.id === saved) ? saved! : "length";
}

/* ---- Per-UNIT fitting placement (wall + slide-offset + door swing) --------------------- *
 * Every fitting can now be added multiple times, each unit on its own wall at its own spot.
 * The accessors always return exactly `qty` entries so a quantity change never leaves a unit
 * unplaced, and they seed unit 0 from the legacy per-id fields so older saved configs keep
 * their chosen wall. */

/** Legacy per-id placement (corner/wall) → a FIXTURE_WALLS wall, to seed unit 0. rear = Upper
 *  (top) wall, front = Down (bottom) wall; a saved wall id passes through. */
export function legacyFixtureWall(cfg: CabinConfig, id: string): string | undefined {
  const p = cfg.fixturePlacement?.[id];
  if (FIXTURE_WALLS.some((w) => w.id === p)) return p;
  if (p === "rear-left" || p === "rear-right") return "top";
  if (p === "front-left" || p === "front-right") return "bottom";
  return undefined;
}
/** Default wall for the i-th unit — spread around the room so multiples don't stack on one wall. */
const FIXTURE_WALL_CYCLE = ["bottom", "top", "left", "right"];
export const defaultFixtureWall = (i: number): string => FIXTURE_WALL_CYCLE[i % FIXTURE_WALL_CYCLE.length];

/** Per-unit wall (FIXTURE_WALLS id) for each unit of a fitting — exactly `qty` entries. */
export function fixtureUnitWallsOf(cfg: CabinConfig, id: string, qty: number): string[] {
  const saved = cfg.fixtureUnitWall?.[id] ?? [];
  const legacy = legacyFixtureWall(cfg, id);
  const n = Math.max(0, Math.round(qty) || 0);
  return Array.from({ length: n }, (_, i) =>
    FIXTURE_WALLS.some((w) => w.id === saved[i]) ? saved[i]
      : i === 0 && legacy ? legacy
      : defaultFixtureWall(i));
}

/** Per-unit distance (ft) from the wall's start corner to each unit's near edge. A negative value
 *  means "auto" — the plan spreads the unit by its index so defaults don't overlap. Exactly `qty`. */
export function fixtureUnitOffsetsOf(cfg: CabinConfig, id: string, qty: number): number[] {
  const saved = cfg.fixtureUnitOffset?.[id] ?? [];
  const n = Math.max(0, Math.round(qty) || 0);
  return Array.from({ length: n }, (_, i) => {
    const v = Number(saved[i]);
    return Number.isFinite(v) ? v : -1; // -1 = auto-spread
  });
}

/** Per-unit enclosed-toilet door swing: "in" (into the toilet) or "out" (into the cabin room).
 *  Defaults to "in" — how these prefab cabins are actually built: the attached-toilet door
 *  swings INTO the toilet so its leaf never sweeps into the main space or over the entrance.
 *  The customer can still override a unit to "out". Exactly `qty` entries. */
export function fixtureUnitSwingsOf(cfg: CabinConfig, id: string, qty: number): string[] {
  const saved = cfg.fixtureUnitSwing?.[id] ?? [];
  const n = Math.max(0, Math.round(qty) || 0);
  return Array.from({ length: n }, (_, i) => (saved[i] === "in" || saved[i] === "out" ? saved[i] : "in"));
}

/** Per-unit wall the EWC/commode is set out FROM, inside an enclosed toilet's partition. Each
 *  entry is a FIXTURE_WALLS id (top/bottom/left/right) or "auto" (resolved to the toilet's back
 *  wall when drawn). Exactly `qty` entries so a quantity change never leaves a unit unset. */
export function fixtureUnitEwcWallsOf(cfg: CabinConfig, id: string, qty: number): string[] {
  const saved = cfg.fixtureUnitEwcWall?.[id] ?? [];
  const n = Math.max(0, Math.round(qty) || 0);
  return Array.from({ length: n }, (_, i) => {
    const v = saved[i];
    return v === "top" || v === "bottom" || v === "left" || v === "right" ? v : "auto";
  });
}

/** Per-unit perpendicular gap (ft, ≥0) from the chosen EWC wall to the commode. 0 = flush against
 *  the wall. The plan clamps it so the commode can never leave the partition. Exactly `qty`. */
export function fixtureUnitEwcDistsOf(cfg: CabinConfig, id: string, qty: number): number[] {
  const saved = cfg.fixtureUnitEwcDist?.[id] ?? [];
  const n = Math.max(0, Math.round(qty) || 0);
  return Array.from({ length: n }, (_, i) => {
    const v = Number(saved[i]);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  });
}

/** Door swing options for an enclosed toilet — internal (opens into the toilet) vs external
 *  (opens out into the cabin). */
export const FIXTURE_DOOR_SWINGS = [
  { id: "in",  label: "Opens In (internal)" },
  { id: "out", label: "Opens Out (external)" },
] as const;

/** Resolved external / entrance-light position: distance (ft) along the MAIN door's wall from its
 *  start corner. Defaults to beside the door (its centre) and is clamped to that wall's length.
 *  The light itself is drawn just OUTSIDE that wall (over the entrance / walkway). */
export function externalLightOffsetOf(cfg: CabinConfig): number {
  const door = cfg.doorPlacements?.[0];
  const side = door?.side || "bottom";
  const span = sideSpanFt(side, cfg.length, cfg.width);
  const dflt = door
    ? clampOpeningOffset(door.offset ?? 0, span, DOOR_SIZE.widthFt) + DOOR_SIZE.widthFt / 2
    : span / 2;
  const v = Number(cfg.externalLightOffset);
  return Math.min(Math.max(Number.isFinite(v) ? v : dflt, 0), Math.max(0, span));
}

/** Per-UNIT price of an add-on. Sized fixtures scale with size (enclosed toilet by area, pantry
 *  by running foot); everything else is its flat ADDONS price. This is the SINGLE source the
 *  estimate and the UI both read, so the printed line always equals the charge. */
export function fixtureUnitPrice(id: string, cfg: CabinConfig): number {
  const spec = FIXTURE_SIZING[id];
  if (spec) {
    const { wFt, dFt } = fixtureSizeOf(cfg, id);
    return Math.round(Math.max(spec.base, wFt * dFt * spec.ratePerSqft));
  }
  if (id === "pantry") {
    const { wFt } = fixtureSizeOf(cfg, id);
    return Math.round(Math.max(PANTRY_MIN_FT, wFt) * PANTRY_RATE_PER_FT);
  }
  return ADDONS.find((a) => a.id === id)?.price ?? 0;
}

/** Short size label for a sized fixture, for the quote / plan (e.g. "4′×4′" or "6′ counter"). */
export function fixtureSizeLabel(id: string, cfg: CabinConfig): string {
  const { wFt, dFt } = fixtureSizeOf(cfg, id);
  if (id === "pantry") return `${formatFeet(wFt)} counter`;
  if (FIXTURE_SIZING[id]) return `${formatFeet(wFt)}×${formatFeet(dFt)}`;
  return "";
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

/* ------------------------------------------------------------------ *
 * Room-wise socket (plug-point) placement helpers. SPEC-ONLY positioning;
 * the priced count is electrical.plug. Invariant held everywhere:
 *   totalPlacedPlugs(cfg) === (electrical.plug || 0)
 * ------------------------------------------------------------------ */

/** Display label for room `i`: purpose-aware. "Office Room" (single room) / "Room 2 · Pantry
 *  Area" (multi-room) / "Room 3" when no purpose is set. */
export function roomLabelFor(cfg: CabinConfig, i: number): string {
  const purpose = cfg.roomPurposes?.[i];
  const multi = (Math.round(cfg.roomCount) || 1) > 1;
  if (!purpose || purpose === "other") return `Room ${i + 1}`;
  const label = roomPurposeLabel(purpose);
  return multi ? `Room ${i + 1} · ${label}` : label;
}

/** Legacy wall id (upper/down/left/right/table) → new PlugWall. "table" folds onto the front wall. */
const LEGACY_PLUG_WALL: Record<string, PlugWall> = {
  upper: "top", down: "bottom", left: "left", right: "right", table: "bottom",
};

const clampPlugPos = (p: number): number => Math.min(Math.max(Number.isFinite(p) ? p : 0.5, 0), 1);

/** Sum of every plug point placed across all rooms in the raw socketPlan. */
export function totalPlacedPlugs(cfg: CabinConfig): number {
  const plan = Array.isArray(cfg.socketPlan) ? cfg.socketPlan : [];
  let n = 0;
  for (const room of plan) for (const g of room ?? []) n += Math.max(0, Math.round(g?.plugCount) || 0);
  return n;
}

/** Room-wise socket plan, ALWAYS exactly roomCount lists, sanitized (valid walls, ≥1 count,
 *  0..1 pos). When socketPlan is absent (older saves), synthesise one from the legacy
 *  plugPointWalls + electrical.plug so the plan still draws — spread across the chosen walls,
 *  all in Room 1. Returns empty rooms when there are no plug points. */
export function plugPlanFor(cfg: CabinConfig): PlugGroup[][] {
  const n = Math.max(1, Math.round(cfg.roomCount) || 1);
  const sanitize = (room: PlugGroup[] | undefined): PlugGroup[] =>
    (Array.isArray(room) ? room : [])
      .map((g) => ({
        wall: (PLUG_WALLS.some((w) => w.id === g?.wall) ? g.wall : "bottom") as PlugWall,
        plugCount: Math.max(0, Math.round(g?.plugCount) || 0),
        pos: clampPlugPos(g?.pos),
      }))
      .filter((g) => g.plugCount > 0);

  if (Array.isArray(cfg.socketPlan)) {
    return Array.from({ length: n }, (_, i) => sanitize(cfg.socketPlan![i]));
  }

  // ---- migrate legacy global placement into Room 1 ----
  const out: PlugGroup[][] = Array.from({ length: n }, () => []);
  const total = Math.max(0, Math.round(cfg.electrical?.plug ?? 0) || 0);
  if (total <= 0) return out;
  const mapped = (cfg.plugPointWalls ?? []).map((w) => LEGACY_PLUG_WALL[w]).filter(Boolean) as PlugWall[];
  const walls = mapped.length ? [...new Set(mapped)] : (["bottom"] as PlugWall[]);
  walls.forEach((wall, k) => {
    const cnt = Math.floor(total / walls.length) + (k < total % walls.length ? 1 : 0);
    if (cnt > 0) out[0].push({ wall, plugCount: cnt, pos: 0.5 });
  });
  return out;
}

/** Return a socketPlan (roomCount lists) whose plug total equals `newTotal`, starting from the
 *  current plan: trims from the end when reducing, tops up Room 1's last group (or a new Down-wall
 *  group) when increasing. Used when the Electrical Plug-Points stepper sets the total directly. */
export function reconcileSocketPlan(cfg: CabinConfig, newTotal: number): PlugGroup[][] {
  const target = Math.min(Math.max(Math.round(newTotal) || 0, 0), 200);
  const plan = plugPlanFor(cfg).map((room) => room.map((g) => ({ ...g })));
  const cur = plan.reduce((s, room) => s + room.reduce((a, g) => a + g.plugCount, 0), 0);
  if (target === cur) return plan;
  if (target > cur) {
    const add = target - cur;
    const room0 = plan[0] ?? (plan[0] = []);
    const last = room0[room0.length - 1];
    if (last) last.plugCount += add;
    else room0.push({ wall: "bottom", plugCount: add, pos: 0.5 });
    return plan;
  }
  // target < cur — trim from the end (last room first, last group first).
  let remove = cur - target;
  for (let ri = plan.length - 1; ri >= 0 && remove > 0; ri--) {
    const room = plan[ri];
    for (let gi = room.length - 1; gi >= 0 && remove > 0; gi--) {
      const take = Math.min(remove, room[gi].plugCount);
      room[gi].plugCount -= take;
      remove -= take;
      if (room[gi].plugCount <= 0) room.splice(gi, 1);
    }
  }
  return plan;
}

/** THE choke point for keeping socketPlan consistent after any structural change (room count,
 *  plug on/off). Returns a cfg whose socketPlan has exactly roomCount lists — folding any dropped
 *  rooms' groups into the new last room so the priced plug count never silently drops — and whose
 *  total equals electrical.plug. Clears the plan when there are no plug points. */
export function withSocketPlan(cfg: CabinConfig): CabinConfig {
  const n = Math.max(1, Math.round(cfg.roomCount) || 1);
  const plug = Math.max(0, Math.round(cfg.electrical?.plug ?? 0) || 0);
  if (plug <= 0) return { ...cfg, socketPlan: [] };
  const raw = Array.isArray(cfg.socketPlan) ? cfg.socketPlan : plugPlanFor(cfg);
  const rooms: PlugGroup[][] = raw.map((room) => (Array.isArray(room) ? room : []).map((g) => ({ ...g })));
  let plan: PlugGroup[][];
  if (rooms.length > n) {
    plan = rooms.slice(0, n);
    const overflow = rooms.slice(n).flat();
    plan[n - 1] = [...(plan[n - 1] ?? []), ...overflow];
  } else {
    plan = [...rooms];
    while (plan.length < n) plan.push([]);
  }
  const synced = reconcileSocketPlan({ ...cfg, socketPlan: plan }, plug);
  return { ...cfg, socketPlan: synced };
}

/** One-line room-wise socket summary for the WhatsApp quote / PDF, e.g.
 *  "Office Room: 3 (Down×2, Left×1); Room 2 · Pantry Area: 1 (Right×1)". "" when none placed. */
export function socketPlanSummary(cfg: CabinConfig): string {
  const plan = plugPlanFor(cfg);
  const parts: string[] = [];
  plan.forEach((room, i) => {
    const rn = room.reduce((a, g) => a + g.plugCount, 0);
    if (rn <= 0) return;
    const walls = room.map((g) => `${plugWallLabel(g.wall)}×${g.plugCount}`).join(", ");
    const label = (Math.round(cfg.roomCount) || 1) > 1 ? roomLabelFor(cfg, i) : "Cabin";
    parts.push(`${label}: ${rn} (${walls})`);
  });
  return parts.join("; ");
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
      : `Doors/Windows: ${cfg.doorQty} × ${door}${cfg.doorPlacements?.length ? ` (${cfg.doorPlacements.map((d) => `${placementLabel(d)} · ${doorOpeningLabel(d)}`).join(", ")})` : ""}, ${cfg.windowQty} × ${win} ${formatFeet(cfg.windowWidthFt ?? 3)}×${formatFeet(cfg.windowHeightFt ?? 3)} ${findWindowTrack(cfg.windowTrackId).label}${isOpenableWindow(cfg.windowTypeId) ? ` (${windowOpeningLabel(cfg.windowOpening)})` : ""}${cfg.windowPlacements?.length ? ` (${cfg.windowPlacements.map(placementLabel).join(", ")})` : ""}`,
    isToilet ? `Ventilation: ${vent || "Exhaust Fan (1 no.)"}` : ``,
    isToilet ? `Window: Not Applicable (toilet cabin)` : (isStorage && cfg.windowQty === 0 ? `Window: Not Applicable (add if required)` : ``),
    `Electrical: ${elec}`,
    cfg.roomCount > 1
      ? `Rooms: ${cfg.roomCount} (${cfg.roomLengths.map((l, i) => { const p = cfg.roomPurposes?.[i]; const nm = p && p !== "other" ? ` ${roomPurposeLabel(p)}` : ""; return `R${i + 1} ${Math.round(l)}ft${nm}`; }).join(" · ")}) — ${cfg.roomCount - 1} × ${partitionSpecLabel(cfg)}`
      : `Rooms: Single`,
    `Add-ons: ${furn}`,
    isToilet ? `` : `Furniture Position: ${furniturePositionLabel(cfg.furniturePosition)}`,
    roomFurn ? `Furniture Layout: ${roomFurn}` : ``,
    (() => { const s = socketPlanSummary(cfg); return s ? `Socket Placement (Plug Points): ${s}` : (cfg.electrical?.plug ? `Plug Points: ${cfg.electrical.plug} (placement as per site)` : ``); })(),
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
