/**
 * ══════════════════════════════════════════════════════════════════════════════════════
 *  THE COMMERCE CATALOG — the ONE file that controls what is sellable, at what price,
 *  and how it is presented to Google.
 * ══════════════════════════════════════════════════════════════════════════════════════
 *
 * Everything downstream reads from here and therefore cannot disagree with it:
 *   • the price + spec grid on the product page and the product card
 *   • the <title> and meta description
 *   • the Product JSON-LD (name, offers.price, availability, shipping, returns)
 *   • the cart and checkout (what Razorpay actually charges)
 *   • the Google Merchant Center feed (/api/merchant-feed)
 *
 * Google disapproves an offer the moment any of those disagree, so there is exactly ONE
 * number per SKU: `basePrice` (EXCLUSIVE of GST, the way the business quotes and invoices).
 * The customer-facing price is always sellPrice(basePrice) = basePrice + 18% GST.
 *
 * ── TWO GATES — BOTH MUST PASS BEFORE A SKU CAN BE SOLD OR FED ──────────────────────
 *   1. kind === "product"  — a real, standard, stocked item (not a rental, a category
 *                            guide, an SEO location page, a service, or a project build).
 *   2. priceConfirmed      — the owner has verified basePrice is the REAL, FIXED, all-in
 *                            price a customer can pay today and receive the item.
 *
 * A SKU failing either gate stays a normal indexable page — it just shows "Request a
 * Quote" instead of "Add to Cart", emits no `offers`, and never enters the feed.
 */

/**
 * product  — standard stocked item, fixed price. The ONLY kind that can be bought online
 *            or submitted to Merchant Center.
 * custom   — made-to-order / calculator-driven project build. Price depends on the brief.
 * rental   — priced per month, not a one-off purchase. Not a valid Shopping offer.
 * service  — a capability page, not a purchasable good.
 * guide    — a category/education page. Not a single item.
 * location — an SEO landing page for a city. The SAME item as another SKU, so feeding it
 *            would create duplicate offers at conflicting prices.
 */
export type ProductKind = "product" | "custom" | "rental" | "service" | "guide" | "location";

export interface KeySpec {
  label: string;
  value: string;
}

export interface ProductCommerce {
  /** Product.id from src/data/products.ts — the join key. */
  id: string;
  /** UNIQUE. Becomes <g:id> + <g:mpn> in the feed and sku/mpn in JSON-LD. No GTINs exist. */
  sku: string;

  // ── MONEY ─────────────────────────────────────────────────────────────────────────
  /** Price EXCLUDING GST, whole rupees. The customer pays sellPrice(basePrice). */
  basePrice: number;
  /**
   * OPTIONAL strikethrough "was" price, EXCLUDING GST (same convention as basePrice; the
   * page renders sellPrice(compareAtBasePrice), so the struck-through figure is also
   * GST-inclusive).
   *
   * ⚠️ LEAVE THIS UNDEFINED unless the product GENUINELY sold at that price recently.
   * A struck-through price that was never charged is a fake discount — it breaches Google's
   * misrepresentation policy AND India's Consumer Protection Act (misleading advertisement).
   * This is deliberately empty for every SKU today. Set it only where you have real
   * invoices at the higher price.
   */
  compareAtBasePrice?: number;
  /** Owner has verified basePrice is a real, fixed, payable price. Gate #2. */
  priceConfirmed: boolean;

  // ── CLASSIFICATION ────────────────────────────────────────────────────────────────
  kind: ProductKind;
  inStock: boolean;

  // ── PRESENTATION / SEO ────────────────────────────────────────────────────────────
  /** Short, clean product name for the on-page <h1>. Never keyword-stuffed. */
  h1Title: string;
  /**
   * Merchant Center title. Pattern: "Product + Size + Use Case | Portable Office Cabin".
   * Most important keywords first, max 150 chars, NO promotional words (cheap/best/offer/%
   * /sale/discount) — Google disapproves promotional text in titles.
   * Also used as the page <title>, which helps Google match the feed item to the landing page.
   */
  feedTitle: string;

  // ── SPEC CHIPS (real data only — pulled from the product's own specifications) ─────
  /** e.g. "20ft x 10ft x 9.5ft". Empty string when the catalog has no dimension spec. */
  size: string;
  /** Frame / material grade, e.g. "IS 2062 MS Steel". Empty when unknown — never invent. */
  material: string;
  /** Primary use case, e.g. "Site Offices". Drives the "BEST FOR" chip and the feed title. */
  bestFor: string;
  /** Customer-facing delivery window shown near the buy buttons. */
  deliveryDays: string;
  /** Extra chips beyond the six standard ones. Optional. */
  extraSpecs?: KeySpec[];

  // ── FEED TAXONOMY ─────────────────────────────────────────────────────────────────
  /** Google product taxonomy ID. 114 = Business & Industrial > Construction. */
  googleProductCategory: string;
  /** <g:product_type> — your own category path. */
  productType: string;

  /** Why a SKU is not sellable. Surfaced in reviews and the admin. */
  note?: string;
}

/** Everything on this site is manufactured and sold by one brand. */
export const BRAND = "Portable Office Cabin";

/** Default delivery window shown on product pages. Conservative envelope over the zone table. */
const DELIVERY = "7–21 Working Days";

/** Google taxonomy leaves actually used by this catalog. */
const CAT_CONSTRUCTION = "114"; // Business & Industrial > Construction
const CAT_CONTAINERS = "5831"; // Business & Industrial > Industrial Storage > Shipping Containers

export const PRODUCT_COMMERCE: ProductCommerce[] = [
  // ═════════ SELLABLE — price is consistent with the rest of the site ═════════
  {
    id: "1", sku: "POC-PC-20EX", basePrice: 285000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Executive Portable Cabin 20ft",
    feedTitle: "Executive Portable Cabin 20ft x 10ft PUF Insulated for Site Offices | Portable Office Cabin",
    size: "20ft x 10ft x 9.5ft (200 sq ft)", material: "50mm PUF Insulated Panel", bestFor: "Site Offices & Meeting Rooms",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Portable Cabins",
  },
  {
    id: "11", sku: "POC-PC-MSPC", basePrice: 440000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "MS Portable Cabin",
    feedTitle: "MS Portable Cabin 1.5-2mm Mild Steel Insulated for Site Offices | Portable Office Cabin",
    size: "Custom sizes", material: "1.5–2 mm MS Sheet, 30–50 mm Insulation", bestFor: "Site Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Portable Cabins",
  },
  {
    id: "12", sku: "POC-CSC-2040", basePrice: 185000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "20ft & 40ft Storage Container",
    feedTitle: "Storage Container 20ft & 40ft Corten Steel for Secure Site Storage | Portable Office Cabin",
    size: "160 sq ft / 320 sq ft", material: "Corten Weathering Steel", bestFor: "Secure Storage",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Cargo Storage & Shipping Containers",
  },
  {
    id: "13", sku: "POC-PC-PREFAB", basePrice: 275000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Prefabricated Portable Cabin",
    feedTitle: "Prefabricated Portable Cabin Galvanized MS Frame for Site Offices | Portable Office Cabin",
    size: "Custom sizes", material: "Hot-Dip Galvanized MS Framework", bestFor: "Site Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Portable Cabins",
  },
  {
    id: "14", sku: "POC-SC-40HC", basePrice: 135000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Shipping Container for Sale",
    feedTitle: "Shipping Container 20ft & 40ft ISO Steel for Storage & Office Conversion | Portable Office Cabin",
    size: "20ft / 40ft", material: "ISO-Grade Corrugated Steel", bestFor: "Storage & Office Conversion",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Cargo Storage & Shipping Containers",
  },
  {
    id: "15", sku: "POC-SOC-CSPO", basePrice: 300000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Construction Site Portable Office",
    feedTitle: "Construction Site Portable Office MS Frame for Project Control Rooms | Portable Office Cabin",
    size: "Custom sizes", material: "IS-Grade MS Frame, Insulated Panels", bestFor: "Construction Site Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Site Office Containers",
  },
  {
    id: "17", sku: "POC-CC-FS", basePrice: 125000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Cargo Container for Sale",
    feedTitle: "Cargo Container 20ft & 40ft Steel for Storage & Modular Conversion | Portable Office Cabin",
    size: "20ft / 40ft", material: "Corten Steel", bestFor: "Storage & Conversion",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Cargo Storage & Shipping Containers",
  },
  {
    id: "20", sku: "POC-CO-MSCO", basePrice: 240000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "MS Container Office Cabin",
    feedTitle: "MS Container Office Cabin ISMB Frame Insulated for Site Offices | Portable Office Cabin",
    size: "Custom sizes", material: "Heavy-Duty MS ISMB / ISMC Sections", bestFor: "Site Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Container Offices",
  },
  {
    id: "21", sku: "POC-PC-OFFICE", basePrice: 285000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Office Portable Cabin",
    feedTitle: "Office Portable Cabin Insulated Mild Steel Frame for Site Offices | Portable Office Cabin",
    size: "Custom sizes", material: "IS-Standard Mild Steel Frame", bestFor: "Site Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Portable Cabins",
  },
  {
    id: "22", sku: "POC-LH-STAFF", basePrice: 250000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Prefab Labour Hutments & Staff Accommodation",
    feedTitle: "Prefab Labour Hutment IS 800 Steel for Worker & Staff Accommodation | Portable Office Cabin",
    size: "Custom sizes", material: "IS 800 Modular Steel Frame, 3–5mm", bestFor: "Worker Accommodation",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Portable Cabins",
  },
  {
    // id 23 previously duplicated POC-PC-PREFAB (id 13). A duplicate <g:id> is an automatic
    // feed rejection, so it has its own SKU. Keep in step with src/data/products.ts.
    id: "23", sku: "POC-PC-PPCB", basePrice: 280000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Prefab Porta Cabin",
    feedTitle: "Prefab Porta Cabin ISMC Steel Frame Insulated for Site Offices | Portable Office Cabin",
    size: "Custom sizes", material: "MS ISMC / ISMB Sections, 4mm, Epoxy Coated", bestFor: "Site Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Portable Cabins",
  },
  {
    id: "24", sku: "POC-LH-WORKER", basePrice: 200000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Labour Hutments",
    feedTitle: "Labour Hutment Galvanized Steel Insulated for Worker Accommodation | Portable Office Cabin",
    size: "Custom sizes", material: "Galvanized Steel Frame", bestFor: "Worker Accommodation",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Portable Cabins",
  },
  {
    id: "25", sku: "POC-PC-CABPORT", basePrice: 280000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Portable Cabin",
    feedTitle: "Portable Cabin PUF Sandwich Panel 50-75mm for Site Offices | Portable Office Cabin",
    size: "Custom sizes", material: "PUF / EPS / Rockwool Panels (50–75mm)", bestFor: "Site Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Portable Cabins",
  },
  {
    id: "26", sku: "POC-SC-SECAB", basePrice: 280000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Security Cabin",
    feedTitle: "Security Guard Cabin MS Steel Insulated for Gate & Watchman Posts | Portable Office Cabin",
    size: "Custom sizes", material: "MS Steel with PUF Insulation", bestFor: "Gate & Watchman Posts",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Security Cabins",
  },
  {
    id: "27", sku: "POC-CO-CABIN", basePrice: 150000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Office Cabins",
    feedTitle: "Modular Office Cabin with Glass Partitions for Indoor Workspaces | Portable Office Cabin",
    size: "Custom sizes", material: "Steel Frame with Glass Partitions", bestFor: "Indoor Workspaces",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Container Offices",
  },
  {
    id: "28", sku: "POC-SOC-SPOC", basePrice: 160000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Steel Office Container",
    feedTitle: "Steel Office Container 10ft to 40ft Stackable for Site Offices | Portable Office Cabin",
    size: "10ft to 40ft", material: "ISMC / RHS Steel Frame, PUF Insulated", bestFor: "Site Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Site Office Containers",
  },
  {
    /**
     * SIZE PINNED BY THE OWNER (2026-07): the sellable record is the 20ft x 8ft used shipping
     * container configuration. It previously said "20ft / 40ft" — a fixed price cannot honestly
     * describe two container sizes (the same ambiguity that made id 10 quote-only), and its own
     * landing page prices 20ft and 40ft units differently. The 40ft build stays available on
     * quotation; it is copy on the page, not part of this offer. basePrice/priceConfirmed are
     * UNCHANGED — the price was already confirmed and live at ₹2,95,000 incl. GST.
     */
    id: "37", sku: "POC-CSC-PINK", basePrice: 250000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Pink Cargo Storage Container",
    feedTitle: "Pink Cargo Storage Container 20ft x 8ft Used Shipping Container for Retail Kiosks & Cafes | Portable Office Cabin",
    size: "20ft x 8ft x 8.5ft", material: "Corten Steel / Mild Steel (IS 2062)", bestFor: "Retail Kiosks & Cafes",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Cargo Storage & Shipping Containers",
  },
  {
    id: "41", sku: "POC-VIP-40", basePrice: 800000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "VIP Container Office",
    feedTitle: "VIP Container Office 40ft Heavy Gauge Steel for Executive Site Offices | Portable Office Cabin",
    size: "40ft", material: "Heavy-Gauge Corrosion-Resistant Steel", bestFor: "Executive Site Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Container Offices",
  },

  // ═════════ OWNER-PRICED, LANDING PAGE RECONCILED ═════════
  // These were once "NEEDS PRICE": each carried a suspicious basePrice AND its own landing page
  // published a contradicting ₹ range. Both halves are now fixed together — the owner supplied
  // exact ex-GST prices, and the long-form content components (ContainerOfficeContent,
  // PortableToiletContent, PortaCabinContent) are OFFER-AWARE: ProductDetailServer hands them the
  // SKU's real price whenever isPurchasable() is true, and they suppress every generic range /
  // per-sq-ft claim on that page in favour of the one real figure.
  //
  // THE RULE THIS ENCODES (learned from the Merchant Center suspension): a price may only be
  // confirmed together with the page that displays it. If you add a purchasable SKU to a category
  // whose content component publishes ₹ figures, the component must receive `offer` — never ship
  // the price and leave the copy to "fix later".
  {
    /**
     * PRICE CONFIRMED BY THE OWNER: ₹3,40,000 ex-GST → ₹4,01,200 incl. 18% GST.
     * Replaces ₹28,00,000, which was the suspected missing decimal (~10× its peer POC-SOC-MFR).
     *
     * LANDING PAGE AGREES — checked, not assumed. This page renders SiteOfficeContainerContent
     * (ProductDetailServer's `cs === "site-office-containers"` fallback), which publishes
     * "Standard 20 ft with AC and basic furniture — ₹3.5-4.5 lakh". ₹4,01,200 sits inside that
     * band, so the visible copy and the offer do not contradict each other.
     */
    id: "2", sku: "POC-SOC-20ST", basePrice: 340000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Standard Site Office Container",
    feedTitle: "Standard Site Office Container 20ft x 8ft Corten Steel for Construction Sites | Portable Office Cabin",
    size: "20ft x 8ft x 8.5ft (160 sq ft)", material: "Corten Steel, 50mm Rockwool", bestFor: "Construction Site Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Site Office Containers",
  },
  {
    /**
     * PRICE CONFIRMED BY THE OWNER: ₹9,65,000 ex-GST → ₹11,38,700 incl. 18% GST.
     * Replaces ₹28,00,000 (the same suspected missing decimal as POC-SOC-20ST).
     *
     * LANDING PAGE CANNOT CONTRADICT IT — checked, not assumed. This page renders
     * PortableCabinContent (the `cs === "portable-cabins"` fallback), which publishes NO ₹ figure
     * anywhere, so there is nothing on the page for the offer to disagree with.
     */
    id: "7", sku: "POC-PC-40BH", basePrice: 965000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Portable Cabin 40ft Bunkhouse",
    feedTitle: "Portable Cabin 40ft Bunkhouse with Bathroom for Worker Accommodation | Portable Office Cabin",
    size: "40ft x 10ft x 9.5ft", material: "MS Frame with Insulated Panels", bestFor: "Worker Accommodation (8–12)",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Portable Cabins",
  },
  {
    /**
     * PRICE CONFIRMED BY THE OWNER: ₹16,00,000 ex-GST → ₹18,88,000 incl. 18% GST.
     * Replaces ₹18,50,000 (which contradicted the page's own published ranges).
     *
     * LANDING PAGE RECONCILED — the old blocker ("ContainerOfficeContent tells visitors a 40ft
     * container office is ₹4,00,000–₹7,25,000") is resolved structurally, not by deleting the
     * guide: ContainerOfficeContent is now offer-aware. ProductDetailServer passes it this SKU's
     * real price (`contentOffer`), and the component suppresses the ₹7,00,000 hero, the
     * per-sq-ft claims, the indicative range table and the cost-range FAQ on THIS page, showing
     * ₹18,88,000 instead. Quotation-only pages in the category keep the generic ranges.
     */
    id: "3", sku: "POC-CO-40MD", basePrice: 1600000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Modern Container Office",
    feedTitle: "Modern Container Office 40ft x 8ft Insulated for Workspaces | Portable Office Cabin",
    size: "40ft x 8ft x 9.5ft (320 sq ft)", material: "Corten Steel Container Shell", bestFor: "Modern Workspaces",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Container Offices",
  },
  {
    /**
     * PRICE CONFIRMED BY THE OWNER: ₹5,80,000 ex-GST → ₹6,84,400 incl. 18% GST.
     * Replaces ₹9,00,000. THE PRICE IS FOR THE COMPLETE 4-UNIT BLOCK — one 20 ft cabin containing
     * four toilet units — never a per-toilet figure (the "Configuration" spec chip below and the
     * fixed-price callout on the page both say so explicitly).
     *
     * LANDING PAGE RECONCILED — PortableToiletContent (which renders on every portable-toilet
     * product page) is now offer-aware: on THIS page it suppresses the single-unit tier grid
     * (₹8,000…₹1,50,000+), the accessible-toilet "Price Range ₹35,000–₹55,000" chip and the
     * "₹8,500–₹12,000 per piece" prose, showing ₹6,84,400 with a "not a per-toilet figure" note
     * instead. Those single-unit ranges were never this block's price — leaving them visible
     * beside a real offer is how a customer concludes the product costs 12× less than it does.
     */
    id: "5", sku: "POC-PT-4UT", basePrice: 580000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Portable Toilet Block - 4 Unit",
    feedTitle: "Portable Toilet Block 20ft 4-Unit for Construction Sites & Events | Portable Office Cabin",
    size: "20ft x 8ft x 8ft", material: "MS Steel with Ceramic Sanitary Fittings", bestFor: "Construction Sites & Events",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Portable Toilet Cabins",
    extraSpecs: [{ label: "Configuration", value: "Complete block of 4 toilet units in one 20 ft cabin" }],
  },
  {
    /**
     * PRICE CONFIRMED BY THE OWNER: ₹4,80,000 ex-GST → ₹5,66,400 incl. 18% GST.
     * `basePrice` is UNCHANGED from what was already in the catalog — the owner verified the
     * existing figure was correct, so nothing was recalculated.
     *
     * WHY THIS WAS GATED, AND WHY THAT WAS A MISTAKE: the previous note read "NEEDS CONFIRMED GMC
     * PRICE — SecurityCabinContent.tsx quotes ₹90,000–₹1,20,000 per security cabin." That note was
     * wrong on both counts. SecurityCabinContent.tsx contains no ₹ figure at all, and the
     * ₹90,000–₹1,20,000 range lives in PortaCabinContent.tsx describing **4×4 ft** guard cabins
     * (~16 sq ft). This SKU is **20×10 ft** (200 sq ft) — a different product, ~12× the area. The
     * gate was comparing unlike sizes.
     *
     * NO LANDING-PAGE CONFLICT: this SKU's slug is "guard-security-cabin", which is not in
     * ProductDetailServer's slug→content injection map, so no price-quoting content component
     * renders on its page. (SecurityCabinContent renders only on slug "security-cabin", a
     * different product.) Verified against the rendered HTML, not assumed.
     */
    id: "6", sku: "POC-SC-6GD", basePrice: 480000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Guard Security Cabin",
    feedTitle: "Guard Security Cabin 20ft x 10ft with 360 Degree Visibility for Gate Posts | Portable Office Cabin",
    size: "20ft x 10ft x 8ft", material: "MS Steel with Toughened Glass", bestFor: "Gate & Toll Posts",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Security Cabins",
  },
  {
    /**
     * PRICE CONFIRMED BY THE OWNER: ₹14,00,000 ex-GST → ₹16,52,000 incl. 18% GST.
     * Replaces ₹18,00,000.
     *
     * LANDING PAGE RECONCILED — PortaCabinContent (rendered only on this slug) is now
     * offer-aware: on THIS page it suppresses the "₹1,050–₹2,500 per sq.ft." claims, the 2025
     * pricing-reference card, and the guard-cabin / office-cabin price tables, showing
     * ₹16,52,000 instead. Those tables priced 40×10 ft units; this SKU is 40×12 ft, so their
     * figures were never this product's price — but sat close enough to read as one.
     */
    id: "9", sku: "POC-PC-PORTA", basePrice: 1400000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Porta Cabin",
    feedTitle: "Porta Cabin 40ft x 12ft BIS Certified MS Steel for Offices & Accommodation | Portable Office Cabin",
    size: "40ft x 12ft x 9ft", material: "BIS-Certified MS Steel (ISMC, RHS, SHS)", bestFor: "Offices & Accommodation",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Portable Cabins",
  },

  // ═════════ CUSTOM / PROJECT BUILDS — genuinely quote-only, never fed ═════════
  {
    id: "10", sku: "POC-CO-GEN", basePrice: 1200000, priceConfirmed: false, kind: "custom", inStock: true,
    h1Title: "Container Office",
    feedTitle: "Container Office 25ft x 14ft High-Tensile MS Steel for Project Sites | Portable Office Cabin",
    size: "25ft x 14ft x 9ft (160–320+ sq ft)", material: "High-Tensile MS / Corten Steel", bestFor: "Project Site Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Container Offices",
    /**
     * QUOTE-ONLY BY DECISION OF THE OWNER, not merely "awaiting a price".
     *
     * Its `size` is a RANGE (160–320+ sq ft), so there is no single configuration a single
     * checkout price could honestly describe — a fixed price here would necessarily be wrong for
     * most of the sizes the SKU covers. It was previously filed under "NEEDS PRICE (sellable in
     * principle)", which invited someone to flip `priceConfirmed` and start selling it; `custom`
     * makes the gate structural instead, so confirming a price ALONE can never sell it.
     *
     * TO MAKE THIS SELLABLE: create ONE exact size + specification (ideally as its own SKU),
     * then set kind back to "product" with that SKU's own confirmed price. Do not re-point this
     * record at a range.
     *
     * The old note read "NEEDS CONFIRMED GMC PRICE — ContainerOfficeContent.tsx quotes
     * ₹4,00,000–₹7,25,000 for a 40ft unit" — retained here as history only. That range is for a
     * 40ft unit and is NOT this SKU's price: this record is 25ft x 14ft.
     */
    note: "Quote-only: size is a range (160–320+ sq ft), so no single fixed price is honest. Needs one exact size + spec before it can be sold or fed.",
  },
  {
    id: "4", sku: "POC-PH-2BHK", basePrice: 1800000, priceConfirmed: false, kind: "custom", inStock: true,
    h1Title: "Family Prefab Home 2BHK",
    feedTitle: "Family Prefab Home 2BHK Light Gauge Steel for Residential Use | Portable Office Cabin",
    size: "2BHK", material: "Light Gauge Steel Frame", bestFor: "Residential Use",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Prefab Homes",
    note: "Made-to-order home. Price depends on the brief.",
  },
  {
    id: "8", sku: "POC-PH-3LUX", basePrice: 3600000, priceConfirmed: false, kind: "custom", inStock: true,
    h1Title: "Luxury Prefab Villa G+1",
    feedTitle: "Luxury Prefab Villa G+1 3BHK for Residential Use | Portable Office Cabin",
    size: "G+1, 3BHK", material: "Steel Frame with Premium Finishes", bestFor: "Residential Use",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Prefab Homes",
    note: "Made-to-order villa. Price depends on the brief.",
  },
  {
    id: "39", sku: "POC-WA-G1", basePrice: 2000000, priceConfirmed: false, kind: "custom", inStock: true,
    h1Title: "Workmen Accommodation",
    feedTitle: "G+1 Workmen Accommodation Prefab Camp for 50-500 Workers | Portable Office Cabin",
    size: "G+1, 50–500 workers", material: "Modular Steel Frame", bestFor: "Labour Camps",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "G+1 Workmen Accommodation",
    note: "Project-scale build, priced by the labour-colony calculator.",
  },
  {
    id: "40", sku: "POC-LC-PREFAB", basePrice: 2200000, priceConfirmed: false, kind: "custom", inStock: true,
    h1Title: "Labour Colony",
    feedTitle: "Prefab Labour Colony G+1 and G+2 Modular for 50-500 Workers | Portable Office Cabin",
    size: "G+1 / G+2, 50–500+ workers", material: "50–100mm PUF/EPS Panels, PPGI", bestFor: "Labour Colonies",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "G+1 Workmen Accommodation",
    note: "Project-scale build, priced by the labour-colony calculator.",
  },

  // ═════════ RENTAL — a monthly rate, not a purchase. Not a valid Shopping offer. ═════════
  {
    id: "18", sku: "POC-SC-RENT", basePrice: 14000, priceConfirmed: false, kind: "rental", inStock: true,
    h1Title: "Shipping Container Rental",
    feedTitle: "Shipping Container Rental 20ft & 40ft for Storage & Site Use | Portable Office Cabin",
    size: "20ft / 40ft", material: "Corten Steel", bestFor: "Short-Term Storage",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Cargo Storage & Shipping Containers",
    note: "₹14,000 is a MONTHLY rent, not a purchase price.",
  },

  // ═════════ SERVICE — a capability page, not a purchasable good ═════════
  {
    id: "19", sku: "POC-SOC-MFR", basePrice: 280000, priceConfirmed: false, kind: "service", inStock: true,
    h1Title: "Site Office Container Manufacturers",
    feedTitle: "Site Office Container Manufacturing MS Frame for Project Offices | Portable Office Cabin",
    size: "Custom sizes", material: "IS-Grade MS Frame, Insulated Panels", bestFor: "Project Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Site Office Containers",
    note: "Manufacturing-capability page, not a single item.",
  },

  // ═════════ CATEGORY GUIDES — educational SEO pages, not single items ═════════
  {
    id: "35", sku: "POC-CSC-GUIDE", basePrice: 280000, priceConfirmed: false, kind: "guide", inStock: true,
    h1Title: "Cargo Storage Containers",
    feedTitle: "Cargo Storage Container 20ft & 40ft for Industrial Storage | Portable Office Cabin",
    size: "20ft / 40ft", material: "Corten Steel", bestFor: "Industrial Storage",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Cargo Storage & Shipping Containers",
  },
  {
    id: "36", sku: "POC-CC-GUIDE", basePrice: 280000, priceConfirmed: false, kind: "guide", inStock: true,
    h1Title: "Cargo Containers",
    feedTitle: "Cargo Container Corten & Mild Steel for Freight & Storage | Portable Office Cabin",
    size: "20ft / 40ft / 40ft HC", material: "Corten (ASTM A588) / MS (IS 2062)", bestFor: "Freight & Storage",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Cargo Storage & Shipping Containers",
  },
  {
    id: "38", sku: "POC-SC-CARGO", basePrice: 125000, priceConfirmed: false, kind: "guide", inStock: true,
    h1Title: "Cargo Shipping Container",
    feedTitle: "Cargo Shipping Container Corten Steel ISO for Freight & Storage | Portable Office Cabin",
    size: "20ft / 40ft", material: "Corten Weathering Steel (2–4mm)", bestFor: "Freight & Storage",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Cargo Storage & Shipping Containers",
  },

  // ═════════ LOCATION LANDING PAGES — the SAME container at six different prices ═════════
  // Feeding these would submit duplicate offers for one item at conflicting prices, which is
  // exactly the mismatch that gets an account suspended. They stay indexable, quote-only pages.
  {
    id: "29", sku: "POC-SC-KRMG", basePrice: 50000, priceConfirmed: false, kind: "location", inStock: true,
    h1Title: "Shipping Container in Koramangala",
    feedTitle: "Shipping Container 20ft & 40ft in Koramangala for Storage & Offices | Portable Office Cabin",
    size: "20ft / 40ft", material: "Corten Steel", bestFor: "Storage & Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Cargo Storage & Shipping Containers",
  },
  {
    id: "30", sku: "POC-SC-KRSH", basePrice: 150000, priceConfirmed: false, kind: "location", inStock: true,
    h1Title: "Shipping Container in Krishnagiri",
    feedTitle: "Shipping Container 20ft & 40ft in Krishnagiri for Storage & Offices | Portable Office Cabin",
    size: "20ft / 40ft", material: "Corten Steel", bestFor: "Storage & Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Cargo Storage & Shipping Containers",
  },
  {
    id: "31", sku: "POC-SC-SIPCOT", basePrice: 150000, priceConfirmed: false, kind: "location", inStock: true,
    h1Title: "Shipping Container in SIPCOT",
    feedTitle: "Shipping Container 20ft & 40ft for SIPCOT Estates Storage & Offices | Portable Office Cabin",
    size: "20ft / 40ft", material: "Corten Steel", bestFor: "Storage & Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Cargo Storage & Shipping Containers",
  },
  {
    id: "32", sku: "POC-SC-CHN", basePrice: 80000, priceConfirmed: false, kind: "location", inStock: true,
    h1Title: "Shipping Container in Chennai",
    feedTitle: "Shipping Container 20ft & 40ft in Chennai for Storage & Offices | Portable Office Cabin",
    size: "20ft / 40ft", material: "Corten Steel", bestFor: "Storage & Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Cargo Storage & Shipping Containers",
  },
  {
    id: "33", sku: "POC-SC-NRSP", basePrice: 95000, priceConfirmed: false, kind: "location", inStock: true,
    h1Title: "Shipping Container in Narsapura",
    feedTitle: "Shipping Container 20ft & 40ft in Narsapura KIADB for Storage & Offices | Portable Office Cabin",
    size: "20ft / 40ft", material: "Corten Steel — 350 MPa Yield", bestFor: "Storage & Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Cargo Storage & Shipping Containers",
  },
  {
    id: "34", sku: "POC-SC-PNYA", basePrice: 85000, priceConfirmed: false, kind: "location", inStock: true,
    h1Title: "Shipping Container in Peenya",
    feedTitle: "Shipping Container 20ft & 40ft in Peenya for Storage & Offices | Portable Office Cabin",
    size: "20ft / 40ft", material: "Corten Steel, Marine Plywood Floor", bestFor: "Storage & Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Cargo Storage & Shipping Containers",
  },
];

const BY_ID = new Map(PRODUCT_COMMERCE.map((c) => [c.id, c]));

export function getCommerce(productId: string): ProductCommerce | undefined {
  return BY_ID.get(productId);
}

/**
 * Can a customer put this in the cart and pay for it right now?
 * The SINGLE predicate gating Add to Cart, the JSON-LD `offers` block, and feed inclusion —
 * so those three can never drift apart.
 */
export function isPurchasable(productId: string): boolean {
  const c = BY_ID.get(productId);
  return !!c && c.kind === "product" && c.priceConfirmed && c.inStock;
}

/** Everything that may be submitted to Google Merchant Center. */
export function feedEligible(): ProductCommerce[] {
  return PRODUCT_COMMERCE.filter((c) => c.kind === "product" && c.priceConfirmed && c.inStock);
}

/**
 * A genuine sale is on ONLY when compareAtBasePrice is set AND is strictly greater than the
 * current price. Anything else would render a strikethrough that never existed.
 */
export function hasGenuineSalePrice(c: ProductCommerce): boolean {
  return typeof c.compareAtBasePrice === "number" && c.compareAtBasePrice > c.basePrice;
}

/**
 * The six spec chips shown beside the price. Built from real catalog data only — a chip whose
 * value is unknown is DROPPED rather than filled with a guess.
 */
export function getKeySpecs(c: ProductCommerce): KeySpec[] {
  const chips: KeySpec[] = [
    { label: "Size", value: c.size },
    { label: "Range", value: c.productType },
    { label: "Delivery", value: c.deliveryDays },
    { label: "Frame / Material", value: c.material },
    { label: "Brand", value: BRAND },
    { label: "Best For", value: c.bestFor },
    ...(c.extraSpecs ?? []),
  ];
  return chips.filter((chip) => chip.value && chip.value.trim().length > 0);
}
