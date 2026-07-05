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
  { id: "porta-cabin",     label: "Porta Cabin",         icon: "building",   baseRatePerSqft: 1700, def: { length: 20, width: 10, height: 9 }, badge: "Most Chosen", blurb: "All-purpose modular cabin" },
  { id: "office-cabin",    label: "Office Cabin",        icon: "briefcase",  baseRatePerSqft: 1850, def: { length: 20, width: 10, height: 9 }, badge: "Best Value",  blurb: "Furnished workspace cabin" },
  { id: "security-cabin",  label: "Security Cabin",      icon: "shield",     baseRatePerSqft: 2150, def: { length: 6,  width: 6,  height: 8 }, blurb: "Guard booth / gate post" },
  { id: "toilet-cabin",    label: "Toilet Cabin",        icon: "bath",       baseRatePerSqft: 2450, def: { length: 8,  width: 6,  height: 8 }, blurb: "Portable washroom block" },
  { id: "accommodation",   label: "Accommodation Cabin", icon: "bedDouble",  baseRatePerSqft: 1600, def: { length: 24, width: 10, height: 9 }, blurb: "Bunkhouse / staff stay" },
  { id: "container-office", label: "Container Office",   icon: "container",  baseRatePerSqft: 2000, def: { length: 20, width: 8,  height: 8.5 }, badge: "Premium", blurb: "Insulated container workspace" },
  { id: "site-office",     label: "Site Office",         icon: "layout",     baseRatePerSqft: 1750, def: { length: 20, width: 10, height: 9 }, blurb: "On-site project office" },
  { id: "storage-cabin",   label: "Storage Cabin",       icon: "warehouse",  baseRatePerSqft: 1250, def: { length: 20, width: 10, height: 9 }, blurb: "Secure store / tool room" },
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
  { id: "container", label: "Shipping Container Conversion",  multiplier: 1.28, note: "Corten container base — most rugged" },
];

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

export const WALL_MATERIALS: Material[] = [
  { id: "particle", label: "Particle Board", delta: -12 },
  { id: "pvc",      label: "PVC",            delta: -4 },
  { id: "mdf",      label: "MDF",            delta: 0, standard: true },
  { id: "hdhmr",    label: "HDHMR",          delta: 18 },
  { id: "wpc",      label: "WPC",            delta: 26 },
  { id: "spc",      label: "SPC",            delta: 34 },
  { id: "uv",       label: "UV Sheet",       delta: 52 },
  { id: "acp",      label: "ACP",            delta: 70 },
];

export const CEILING_MATERIALS: Material[] = [
  { id: "pvc",   label: "PVC",      delta: 0, standard: true },
  { id: "mdf",   label: "MDF",      delta: 6 },
  { id: "hdhmr", label: "HDHMR",    delta: 16 },
  { id: "wpc",   label: "WPC",      delta: 22 },
  { id: "spc",   label: "SPC",      delta: 30 },
  { id: "uv",    label: "UV Sheet", delta: 46 },
];

export const FLOORING_MATERIALS: Material[] = [
  { id: "vinyl",   label: "Vinyl",           delta: 0, standard: true },
  { id: "pvc",     label: "PVC",             delta: 8 },
  { id: "spc",     label: "SPC",             delta: 28 },
  { id: "laminate", label: "Wooden Laminate", delta: 40 },
  { id: "tiles",   label: "Tiles",           delta: 55 },
];

/* ------------------------------------------------------------------ *
 * Step 5 — Doors & Windows (price each)
 * ------------------------------------------------------------------ */
export interface Priced {
  id: string;
  label: string;
  price: number;
}

export const DOOR_TYPES: Priced[] = [
  { id: "pvc",   label: "PVC Door",              price: 3500 },
  { id: "flush", label: "Flush Door",            price: 4500 },
  { id: "steel", label: "Steel Door",            price: 7500 },
  { id: "glass", label: "Glass / Aluminium Door", price: 12000 },
];

export const WINDOW_TYPES: Priced[] = [
  { id: "sliding",  label: "Sliding Aluminium",  price: 3500 },
  { id: "openable", label: "Openable Aluminium", price: 4200 },
  { id: "upvc",     label: "uPVC Window",        price: 5500 },
  { id: "fixed",    label: "Fixed Glass",        price: 3000 },
];

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
  { id: "led",     label: "LED Lights",  unitPrice: 350,  defaultQty: (a) => Math.max(1, Math.ceil(a / 45)), preselect: true },
  { id: "fan",     label: "Fan",         unitPrice: 1800, defaultQty: (a) => Math.max(1, Math.ceil(a / 120)), preselect: true },
  { id: "exhaust", label: "Exhaust Fan", unitPrice: 1200, defaultQty: () => 1, preselect: false },
  { id: "ac",      label: "AC Point",    unitPrice: 2500, defaultQty: () => 1, preselect: false },
  { id: "plug",    label: "Plug Points", unitPrice: 450,  defaultQty: (a) => Math.max(2, Math.ceil(a / 55)), preselect: true },
];

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
  { id: "partition",   label: "Partition",        price: 8000,  hasQty: true },
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
  wallId: string;
  ceilingId: string;
  flooringId: string;
  doorTypeId: string;
  doorQty: number;
  windowTypeId: string;
  windowQty: number;
  /** id -> quantity. Presence with qty>0 means selected. */
  electrical: Record<string, number>;
  /** id -> quantity. Presence with qty>0 means selected. */
  addons: Record<string, number>;
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
  interior: number;
  interiorLines: LineDelta[];
  openings: number;
  openingLines: LineDelta[];
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
}

const findById = <T extends { id: string }>(list: T[], id: string): T | undefined =>
  list.find((x) => x.id === id);

export function buildDefaultConfig(productId = PRODUCTS[0].id): CabinConfig {
  const product = findById(PRODUCTS, productId) ?? PRODUCTS[0];
  const area = product.def.length * product.def.width;
  const electrical: Record<string, number> = {};
  ELECTRICAL_ITEMS.forEach((e) => {
    if (e.preselect) electrical[e.id] = e.defaultQty(area);
  });
  return {
    productId: product.id,
    length: product.def.length,
    width: product.def.width,
    height: product.def.height,
    quantity: 1,
    structureId: STRUCTURES[0].id,
    wallId: WALL_MATERIALS.find((m) => m.standard)!.id,
    ceilingId: CEILING_MATERIALS.find((m) => m.standard)!.id,
    flooringId: FLOORING_MATERIALS.find((m) => m.standard)!.id,
    doorTypeId: DOOR_TYPES[1].id, // Flush Door
    doorQty: 1,
    windowTypeId: WINDOW_TYPES[0].id, // Sliding
    windowQty: 2,
    electrical,
    addons: {},
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

  // Base cabin
  const base = round(product.baseRatePerSqft * area * structure.multiplier);

  // Interior deltas (₹/sqft over the standard finish)
  const wall = findById(WALL_MATERIALS, cfg.wallId) ?? WALL_MATERIALS[0];
  const ceiling = findById(CEILING_MATERIALS, cfg.ceilingId) ?? CEILING_MATERIALS[0];
  const flooring = findById(FLOORING_MATERIALS, cfg.flooringId) ?? FLOORING_MATERIALS[0];
  const wallAmt = round(wall.delta * wallArea);
  const ceilAmt = round(ceiling.delta * area);
  const floorAmt = round(flooring.delta * area);
  const interior = wallAmt + ceilAmt + floorAmt;
  const interiorLines: LineDelta[] = [
    { label: "Internal Wall", detail: wall.label, amount: wallAmt },
    { label: "Ceiling", detail: ceiling.label, amount: ceilAmt },
    { label: "Flooring", detail: flooring.label, amount: floorAmt },
  ].filter((l) => l.amount !== 0);

  // Doors & windows
  const door = findById(DOOR_TYPES, cfg.doorTypeId) ?? DOOR_TYPES[0];
  const win = findById(WINDOW_TYPES, cfg.windowTypeId) ?? WINDOW_TYPES[0];
  const doorQty = clamp(Math.round(cfg.doorQty), 0, 50);
  const windowQty = clamp(Math.round(cfg.windowQty), 0, 100);
  const doorAmt = round(door.price * doorQty);
  const winAmt = round(win.price * windowQty);
  const openings = doorAmt + winAmt;
  const openingLines: LineDelta[] = [
    { label: "Doors", detail: `${doorQty} × ${door.label}`, amount: doorAmt },
    { label: "Windows", detail: `${windowQty} × ${win.label}`, amount: winAmt },
  ].filter((l) => l.amount !== 0);

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

  const perCabin = base + interior + openings + electrical + furniture;
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
    interior,
    interiorLines,
    openings,
    openingLines,
    electrical,
    electricalLines,
    furniture,
    furnitureLines,
    perCabin,
    cabinsSubtotal,
    transport,
    installation,
    subtotal,
    gst,
    total,
  };
}

/** Human-readable configuration summary — reused for the lead message, the
 *  WhatsApp share text and the PDF. */
export function summariseConfig(cfg: CabinConfig, est: Estimate): string {
  const product = findById(PRODUCTS, cfg.productId)?.label ?? "Cabin";
  const structure = findById(STRUCTURES, cfg.structureId)?.label ?? "";
  const wall = findById(WALL_MATERIALS, cfg.wallId)?.label ?? "";
  const ceiling = findById(CEILING_MATERIALS, cfg.ceilingId)?.label ?? "";
  const flooring = findById(FLOORING_MATERIALS, cfg.flooringId)?.label ?? "";
  const door = findById(DOOR_TYPES, cfg.doorTypeId)?.label ?? "";
  const win = findById(WINDOW_TYPES, cfg.windowTypeId)?.label ?? "";
  const elec = est.electricalLines.map((l) => `${l.label} (${l.detail})`).join(", ") || "None";
  const furn = est.furnitureLines.map((l) => `${l.label}${l.detail.includes("×") ? " " + l.detail.split(" ")[0] : ""}`).join(", ") || "None";

  return [
    `Product: ${product} (${structure})`,
    `Size: ${est.dimLength} × ${est.dimWidth} ft, H ${est.dimHeight} ft — ${est.area} sq.ft × ${est.quantity} unit(s)`,
    `Interior: Wall ${wall}, Ceiling ${ceiling}, Flooring ${flooring}`,
    `Doors/Windows: ${cfg.doorQty} × ${door}, ${cfg.windowQty} × ${win}`,
    `Electrical: ${elec}`,
    `Add-ons: ${furn}`,
    `Delivery: Transport ${cfg.transport ? "Yes" : "No"}, Installation ${cfg.installation ? "Yes" : "No"}`,
    ``,
    `Base Cabin: ${formatINR(est.base)}`,
    est.interior ? `Interior: ${formatINR(est.interior)}` : ``,
    est.openings ? `Doors & Windows: ${formatINR(est.openings)}` : ``,
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
