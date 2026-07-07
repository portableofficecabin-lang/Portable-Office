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
export type BadgeType = "Most Chosen" | "Best Value" | "Premium";

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
  { id: "porta-cabin",     label: "Porta Cabin",         icon: "building",   baseRatePerSqft: 1700, def: { length: 20, width: 10, height: 8.5 }, badge: "Most Chosen", blurb: "All-purpose modular cabin" },
  { id: "office-cabin",    label: "Office Cabin",        icon: "briefcase",  baseRatePerSqft: 1850, def: { length: 20, width: 10, height: 8.5 }, badge: "Best Value",  blurb: "Furnished workspace cabin" },
  { id: "security-cabin",  label: "Security Cabin",      icon: "shield",     baseRatePerSqft: 2150, def: { length: 6,  width: 6,  height: 8.5 }, blurb: "Guard booth / gate post" },
  { id: "toilet-cabin",    label: "Toilet Cabin",        icon: "bath",       baseRatePerSqft: 2450, def: { length: 8,  width: 6,  height: 8.5 }, blurb: "Portable washroom block" },
  { id: "accommodation",   label: "Accommodation Cabin", icon: "bedDouble",  baseRatePerSqft: 1600, def: { length: 24, width: 10, height: 8.5 }, blurb: "Bunkhouse / staff stay" },
  { id: "container-office", label: "Container Office",   icon: "container",  baseRatePerSqft: 2000, def: { length: 20, width: 8,  height: 8.5 }, badge: "Premium", blurb: "Insulated container workspace" },
  { id: "site-office",     label: "Site Office",         icon: "layout",     baseRatePerSqft: 1750, def: { length: 20, width: 10, height: 8.5 }, blurb: "On-site project office" },
  { id: "puf-panel-cabin", label: "Puf Panel Cabin",     icon: "panels",     baseRatePerSqft: 2200, def: { length: 20, width: 10, height: 8.5 }, blurb: "PUF-insulated panel cabin" },
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
 * STANDARD default (₹0). A flat roof is optional and costs +6% of the
 * base cabin price.
 * ------------------------------------------------------------------ */
export const ROOF_FLAT_SURCHARGE = 0.06; // flat roof = +6% of base cabin price
export interface RoofType { id: string; label: string; note: string; surchargePct: number; }
export const ROOFS: RoofType[] = [
  { id: "sloped", label: "Sloped Roof (2-side)", note: "Twin-slope roof shedding to both width sides — standard", surchargePct: 0 },
  { id: "flat",   label: "Flat Roof",            note: "Single flat / mono-pitch roof — optional (+6%)",         surchargePct: ROOF_FLAT_SURCHARGE },
];
export const findRoof = (id: string): RoofType => ROOFS.find((r) => r.id === id) ?? ROOFS[0];

/* ------------------------------------------------------------------ *
 * Base cabin rate — SIZE-BASED (INTERNAL). The ₹/sqft below is NEVER
 * shown to customers; the calculator uses it to auto-compute the base
 * price from the entered size. Rate falls as the cabin grows; sizes
 * BETWEEN the sample points get a linearly-interpolated "similar" rate.
 * Above MAX_AUTO_QUOTE_AREA (40×10 = 400 sq.ft) we can't auto-quote →
 * 0 = "contact us directly". Tune the sample points here.
 * ------------------------------------------------------------------ */
export const MAX_AUTO_QUOTE_AREA = 400; // sq.ft (40 × 10). Bigger → contact us.
// [floor area sq.ft, ₹/sqft] — ascending by area.
const CABIN_RATE_POINTS: ReadonlyArray<readonly [number, number]> = [
  [9,   4500], // 3×3
  [16,  3750], // 4×4
  [20,  2300], // 5×4
  [35,  1900], // 7×5
  [36,  1900], // 6×6
  [64,  1565], // 8×8
  [80,  1350], // 10×8
  [100, 1180], // 10×10
  [150, 1025], // 15×10
  [200, 1000], // 20×10
  [400, 1000], // 40×10 (flat ₹1,000 from 200–400 sq.ft)
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
}

// Internal Wall — MDF is the standard finish (~₹40/sqft, already in the base rate);
// every other option's delta is ₹/sqft above that standard.
export const WALL_MATERIALS: Material[] = [
  { id: "particle", label: "Particle Board", delta: 35 },
  { id: "pvc",      label: "PVC",            delta: 68 },
  { id: "mdf",      label: "MDF",            delta: 0, standard: true },
  { id: "hdhmr",    label: "HDHMR",          delta: 52 },
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
 *  PLUS the material's delta (e.g. MDF ≈ ₹40/sqft, PVC ≈ ₹108/sqft). */
export const WALL_LINING_BASE_RATE = 40;

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

// Ceiling — MDF is the standard finish (~₹40/sqft, already in the base rate);
// every other option's delta is ₹/sqft above (or below) that standard.
export const CEILING_MATERIALS: Material[] = [
  { id: "pvc",   label: "PVC",      delta: 68 },
  { id: "mdf",   label: "MDF",      delta: 0, standard: true },
  { id: "hdhmr", label: "HDHMR",    delta: 52 },
  { id: "gypsum", label: "Gypsum",  delta: 90 },
  { id: "wpc",   label: "WPC",      delta: 150 },
  { id: "spc",   label: "SPC",      delta: 460 },
  { id: "uv",    label: "UV Sheet", delta: 395 },
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
  { id: "glasswool", label: "Glasswool",     ratePerSqft: 56, thickness: "25 mm", color: "#facc15",     note: "25 mm glass-wool — high thermal & acoustic insulation" },
  { id: "hitlon",    label: "Hitlon",        ratePerSqft: 28, thickness: "12 mm", color: "#f5f5f5",     note: "12 mm Hitlon (XLPE foil foam) — moisture-safe & lightweight (white / black)" },
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

export const WINDOW_TYPES: Priced[] = [
  { id: "sliding",  label: "Sliding Aluminium",  price: 7500 },
  { id: "openable", label: "Openable Aluminium", price: 8200 },
  { id: "upvc",     label: "uPVC Window",        price: 5500 },
  { id: "fixed",    label: "Fixed Glass",        price: 3500 },
];

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
 *  elevations. Door 3′0″ × 7′0″, Window 4′0″ × 4′0″. A storage container's end
 *  double-door opening is the ISO standard 7′8″ × 7′6″ (2.34 m × 2.29 m). */
export interface OpeningSize { widthFt: number; heightFt: number; }
export const DOOR_SIZE: OpeningSize = { widthFt: 3, heightFt: 7 };
export const WINDOW_SIZE: OpeningSize = { widthFt: 4, heightFt: 4 };
// ISO 668 standard 20ft/40ft container door opening: 7′8″ wide × 7′6″ high.
export const CONTAINER_DOOR_SIZE: OpeningSize = { widthFt: 7 + 8 / 12, heightFt: 7.5 };
/** Compact dimension label, e.g. "3′×7′" or "7′8″×7′6″". */
export const sizeLabel = (s: OpeningSize): string => `${formatFeet(s.widthFt)}×${formatFeet(s.heightFt)}`;

/** Where a window can be placed on the 2D floor plan. The customer toggles positions;
 *  each selected position is one window there, and window count mirrors the selection. */
export interface WindowPosition { id: string; label: string; }
export const WINDOW_POSITIONS: WindowPosition[] = [
  { id: "top-left",   label: "Left Corner" },
  { id: "top-center", label: "Center" },
  { id: "top-right",  label: "Right Corner" },
  { id: "bottom",     label: "Rear (Down)" },
  { id: "left",       label: "Left Side" },
  { id: "right",      label: "Right Side" },
];
export const windowPositionLabel = (id: string): string =>
  WINDOW_POSITIONS.find((p) => p.id === id)?.label ?? id;

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
  { id: "led",     label: "LED Panel Light", unitPrice: 350,  defaultQty: (a) => Math.max(1, Math.ceil(a / 45)), preselect: true },
  { id: "tube",    label: "Tube Light",  unitPrice: 450,  defaultQty: (a) => Math.max(1, Math.ceil(a / 60)), preselect: false }, // SET: tube-light rate
  { id: "fan",     label: "Fan",         unitPrice: 1800, defaultQty: (a) => Math.max(1, Math.ceil(a / 120)), preselect: true },
  { id: "exhaust", label: "Exhaust Fan", unitPrice: 1200, defaultQty: () => 1, preselect: false },
  { id: "ac",      label: "AC Point",    unitPrice: 2500, defaultQty: () => 1, preselect: false },
  { id: "plug",    label: "Plug Points", unitPrice: 450,  defaultQty: (a) => Math.max(2, Math.ceil(a / 55)), preselect: true },
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
export const PLUG_POINT_POSITIONS = [
  { id: "opposite-table", label: "Opposite Table (under-wall)" },
  { id: "near-door", label: "Near Door" },
  { id: "both-sides", label: "Both Side Walls" },
  { id: "as-per-site", label: "As Per Site" },
] as const;
export const MOBILITY_TYPES = [
  { id: "movable", label: "100% Movable (fully relocatable)" },
  { id: "fixed", label: "Fixed / Semi-permanent" },
] as const;
export const furniturePositionLabel = (id: string): string => FURNITURE_POSITIONS.find((o) => o.id === id)?.label ?? id;
export const plugPointPositionLabel = (id: string): string => PLUG_POINT_POSITIONS.find((o) => o.id === id)?.label ?? id;
export const mobilityTypeLabel = (id: string): string => MOBILITY_TYPES.find((o) => o.id === id)?.label ?? id;

/* ------------------------------------------------------------------ *
 * Step 7 — Optional add-ons / furniture (price each; some take a quantity)
 * ------------------------------------------------------------------ */
export interface AddonItem {
  id: string;
  label: string;
  price: number;
  hasQty?: boolean;
}

export const ADDONS: AddonItem[] = [
  { id: "toilet",      label: "Toilet",           price: 22000 },
  { id: "pantry",      label: "Pantry",           price: 18000 },
  { id: "wash-basin",  label: "Wash Basin",       price: 4500 },
  { id: "urinal",      label: "Urinal",           price: 6500 },
  { id: "partition",      label: "Fixed Partition",     price: 17500, hasQty: true },
  { id: "partition-door", label: "Partition with Door", price: 22000, hasQty: true },
  { id: "workstation", label: "Workstation",      price: 9500,  hasQty: true },
  { id: "manager",     label: "Manager Table",    price: 12000, hasQty: true },
  { id: "cupboard",    label: "Cupboard",         price: 8500,  hasQty: true },
  { id: "conference",  label: "Conference Table", price: 22000 },
  { id: "chairs",      label: "Office Chairs",    price: 3500,  hasQty: true },
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
  /** Roof type: "sloped" (2-side, default, ₹0) or "flat" (+6% of base cabin price). */
  roofId: string;
  wallId: string;
  ceilingId: string;
  flooringId: string;
  /** Thermal insulation between the outer body and inner wall/ceiling. "none" = none. */
  insulationId: string;
  doorTypeId: string;
  doorQty: number;
  /** Per-door placement: side (top/bottom/left/right) + offset in ft from the start
   *  corner. Length mirrors doorQty. */
  doorPlacements: { side: string; offset: number }[];
  windowTypeId: string;
  windowQty: number;
  /** Chosen window placements on the 2D plan; window count mirrors this list. */
  windowPositions: string[];
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
   *  furniturePosition: wall | centre · plugPointPosition: opposite-table | near-door
   *  | both-sides | as-per-site · mobilityType: movable | fixed. */
  furniturePosition: string;
  plugPointPosition: string;
  mobilityType: string;
  /** Spec-only (no price impact): which room (1 or 2) each work-furniture add-on is placed
   *  in, for 2-room layouts. addon id -> room number. Captured in the quote/PDF. */
  furnitureRoom: Record<string, number>;
  /** id -> quantity. Presence with qty>0 means selected. */
  addons: Record<string, number>;
  /** Spec-only (no price impact): free drag-and-drop positions for the customer's
   *  chosen items (doors, windows, lights, fans, furniture) on the floor plan.
   *  Key = item instance id, value = fractional {x,y} (0..1) within the cabin.
   *  Optional so older persisted configs stay valid. Captured in the WhatsApp
   *  quote + PDF so the factory builds to the intended layout. */
  layout?: Record<string, { x: number; y: number }>;
  /** Layout: false = single room; true = a partition splits the cabin into two rooms.
   *  When true the Partition add-on (fixed / with-door) is applied automatically. */
  partitioned: boolean;
  /** Room 1's length (ft) along the cabin length; Room 2 = length − room1Length. */
  room1Length: number;
  /** Partition has a door (uses "Partition with Door" price) vs a plain fixed partition. */
  partitionDoor: boolean;
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
  /** Flat-roof premium: base × 6% when roof = flat. 0 for the sloped default. */
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
    structureId: puf ? "puf" : STRUCTURES[0].id,
    // Sloped 2-side roof is the standard default; flat is +6%. Storage containers are
    // ISO shipping containers → ALWAYS flat-roofed (no sloped option, no surcharge).
    roofId: container ? "flat" : "sloped",
    wallId: puf ? WALL_NONE.id : WALL_MATERIALS.find((m) => m.standard)!.id,
    ceilingId: CEILING_MATERIALS.find((m) => m.standard)!.id,
    flooringId: FLOORING_MATERIALS.find((m) => m.standard)!.id,
    insulationId: "none",
    doorTypeId: DOOR_TYPES[0].id, // Steel Door (1 included in base)
    // Containers ship with their own doors — no separate door line.
    doorQty: container ? 0 : 1,
    // Default door placement: one main door on the front (bottom) wall, ~30% along.
    doorPlacements: container ? [] : [{ side: "bottom", offset: Math.round(product.def.length * 0.3) }],
    windowTypeId: WINDOW_TYPES[0].id, // Sliding
    // Toilet & storage products start windowless — toilet uses ventilation instead;
    // containers have no windows.
    windowQty: isToiletCabin(product.id) || container ? 0 : 2,
    // Default window placements (two front-corner windows); count mirrors this list.
    windowPositions: isToiletCabin(product.id) || container ? [] : ["top-left", "top-right"],
    // Toilet cabins default to one exhaust fan (ventilation replaces windows).
    ventilation: isToiletCabin(product.id) ? { exhaust: 1 } : {},
    // Default container grade (2024–2025). Ignored for non-container products.
    containerGradeId: "grade_2024_2025",
    electrical,
    lightColor: "white",
    ledShape: "square",
    furniturePosition: "wall",
    plugPointPosition: "opposite-table",
    mobilityType: "movable",
    furnitureRoom: {},
    addons: {},
    // Drag-and-drop item positions (spec-only) — empty until the customer arranges them.
    layout: {},
    // Layout — single room by default; the 2-room partition is opt-in in the Size step.
    partitioned: false,
    room1Length: Math.round(product.def.length / 2),
    partitionDoor: true,
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

  // Flat-roof premium — +6% of the base cabin price when a flat roof is chosen. The
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
    { label: "Internal Wall", detail: puf && cfg.wallId !== WALL_NONE.id ? `${wall.label} (add-on over PUF)` : wall.label, amount: wallAmt },
    { label: "Ceiling", detail: ceiling.label, amount: ceilAmt },
    { label: "Flooring", detail: flooring.label, amount: floorAmt },
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
  const winAmt = round(win.price * windowQty);
  const openings = doorAmt + winAmt;
  const openingLines: LineDelta[] = [
    { label: "Doors", detail: door.includedQty ? `${doorQty} × ${door.label} · ${door.includedQty} included` : `${doorQty} × ${door.label}`, amount: doorAmt },
    { label: "Windows", detail: `${windowQty} × ${win.label}`, amount: winAmt },
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
export const ROOM_FURNITURE_IDS = ["workstation", "manager", "conference", "cupboard", "chairs"];

/** Which room ("1" | "2") a work-furniture add-on is assigned to (default Room 1). */
export const furnitureRoomOf = (cfg: CabinConfig, addonId: string): number =>
  cfg.furnitureRoom?.[addonId] === 2 ? 2 : 1;

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
  const wall = findWallMaterial(cfg.wallId)?.label ?? "";
  const ceiling = findById(CEILING_MATERIALS, cfg.ceilingId)?.label ?? "";
  const flooring = findById(FLOORING_MATERIALS, cfg.flooringId)?.label ?? "";
  const insul = findById(INSULATION_OPTIONS, cfg.insulationId);
  const door = findById(DOOR_TYPES, cfg.doorTypeId)?.label ?? "";
  const win = findById(WINDOW_TYPES, cfg.windowTypeId)?.label ?? "";
  const elec = est.electricalLines.map((l) => `${l.label} (${l.detail})`).join(", ") || "None";
  const furn = est.furnitureLines.map((l) => `${l.label}${l.detail.includes("×") ? " " + l.detail.split(" ")[0] : ""}`).join(", ") || "None";
  const isToilet = isToiletCabin(cfg.productId);
  const isStorage = isStorageProduct(cfg.productId);
  const vent = est.ventilationLines.map((l) => `${l.label} (${l.detail.split(" ")[0]} no.)`).join(", ");
  const roof = findRoof(cfg.roofId);
  // Per-room furniture placement (only meaningful for a 2-room layout).
  const roomFurn = cfg.partitioned
    ? ROOM_FURNITURE_IDS.filter((id) => cfg.addons?.[id]).map((id) => {
        const a = ADDONS.find((x) => x.id === id);
        return `${a?.label ?? id} → Room ${furnitureRoomOf(cfg, id)}`;
      }).join(", ")
    : "";

  return [
    `Product: ${product} (${structure})`,
    `Size: ${est.dimLength} × ${est.dimWidth} ft, H ${est.dimHeight} ft — ${est.area} sq.ft × ${est.quantity} unit(s)`,
    `Roof: ${roof.label}${cfg.roofId === "flat" ? " (+6%)" : ""}`,
    isStorage ? `Usage: Material Storage / Tool Room` : ``,
    `Interior: Wall ${wall}, Ceiling ${ceiling}, Flooring ${flooring}`,
    insul && insul.id !== "none" ? `Insulation: ${insul.label} (${insul.thickness})` : ``,
    isToilet
      ? `Doors: ${cfg.doorQty} × ${door}`
      : `Doors/Windows: ${cfg.doorQty} × ${door}, ${cfg.windowQty} × ${win}${cfg.windowPositions?.length ? ` (${cfg.windowPositions.map(windowPositionLabel).join(", ")})` : ""}`,
    isToilet ? `Ventilation: ${vent || "Exhaust Fan (1 no.)"}` : ``,
    isToilet ? `Window: Not Applicable (toilet cabin)` : (isStorage && cfg.windowQty === 0 ? `Window: Not Applicable (add if required)` : ``),
    `Electrical: ${elec}`,
    `Add-ons: ${furn}`,
    isToilet ? `` : `Furniture Position: ${furniturePositionLabel(cfg.furniturePosition)}`,
    roomFurn ? `Furniture Layout: ${roomFurn}` : ``,
    `Plug Point: ${plugPointPositionLabel(cfg.plugPointPosition)}`,
    `Shifting / Mobility: ${mobilityTypeLabel(cfg.mobilityType)}`,
    `Delivery: Transport ${cfg.transport ? "Yes" : "No"}, Installation ${cfg.installation ? "Yes" : "No"}`,
    ``,
    `Base Cabin: ${formatINR(est.base)}`,
    est.heightSurcharge ? `Extra Height (${est.dimHeight} ft > 8'6"): ${formatINR(est.heightSurcharge)}` : ``,
    est.roofSurcharge ? `Flat Roof (+6%): ${formatINR(est.roofSurcharge)}` : ``,
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
