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
import { variantCommerceRows } from "@/data/productFamilies";

export type ProductKind = "product" | "custom" | "rental" | "service" | "guide" | "location";

/**
 * What the money on a SKU MEANS — orthogonal to `kind`.
 *
 * `kind` answers "can this be bought online" (a rental booking can, so the rental SKU carries
 * kind:"product"). It does NOT answer "is this figure the price of owning the unit". Without
 * that distinction a monthly rent passes every isPurchasable() filter and lands in price
 * tables, category price bands and schema.org Offers beside outright-sale units.
 *
 *  · "outright"       — the price of buying and keeping the unit. The default when absent.
 *  · "monthly-rental" — RECURRING rent. Never a Shopping offer, never in a sale-price table,
 *                       and never shown unqualified next to purchase prices.
 */
export type PriceBasis = "outright" | "monthly-rental";

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
  /**
   * OPT-IN: show an indicative "starting from" price on a QUOTE-ONLY build.
   *
   * By default a quote-only SKU shows NO number — an unconfirmed figure presented as
   * if it were payable is the misrepresentation that got the Merchant account
   * suspended. This flag is the narrow, owner-approved exception described in
   * src/lib/company.ts: a project build MAY show an indicative starting price so long
   * as it is labelled as such, is shown before transport and installation, and the
   * binding figure still comes from a written quotation.
   *
   * It does NOT make the product purchasable and does NOT put it in the Merchant feed
   * — isPurchasable() and feedEligible() both still require priceConfirmed && kind
   * === "product". Set this ONLY where the owner has given you the number.
   */
  showIndicativePrice?: boolean;

  // ── CLASSIFICATION ────────────────────────────────────────────────────────────────
  kind: ProductKind;
  inStock: boolean;
  /**
   * Merchant Center `<g:availability>` OVERRIDE. Omit for every hand-written row — the feed
   * then derives the value from `inStock` exactly as it always has, so existing output is
   * untouched.
   *
   * It exists because `inStock` is a boolean and Merchant Center accepts a third state:
   * a size variant declaring `pre_order` must submit "preorder", which a boolean cannot
   * express and which "out_of_stock" would misreport. Populated only by
   * variantCommerceRows() in src/data/productFamilies.ts, from the one availability mapping
   * shared with the schema.org Offer.
   */
  feedAvailability?: "in_stock" | "out_of_stock" | "preorder";
  /**
   * What basePrice MEANS. Omit for a normal outright sale (the default).
   * Set "monthly-rental" and the SKU is excluded from feedEligible(), from every sale-price
   * table and from the JSON-LD Offer block, while staying bookable on-site.
   */
  priceBasis?: PriceBasis;

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
    /* Steel Portable Cabin (id 46) — the owner's "steel portable cabin" hub page, priced on
     * the 20 × 10 ft insulated build. The content supplied 2026-09-04 states ₹5,19,200
     * incl. 18% GST, and sellPrice(440000) = 519200 exactly, so no price is invented here.
     *
     * Same base as POC-PC-MSPC by design — it is the same cabin sold under its material
     * name. Because two identical fixed-price offers would read as duplicates in Shopping,
     * this SKU is held out of the automated feed in merchantFeedPolicy.ts until the owner
     * decides which of the two is submitted. Purchasable on-site throughout. */
    id: "46", sku: "POC-PC-STEEL", basePrice: 440000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Steel Portable Cabin",
    feedTitle: "Steel Portable Cabin 20ft x 10ft Insulated MS Frame for Site Offices | Portable Office Cabin",
    size: "20 ft × 10 ft × 8.5 ft (200 sq ft)", material: "Welded MS Frame, 1.5–2 mm MS Sheet, 30–50 mm Insulation", bestFor: "Site Offices, Staff Rooms & Security Posts",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Portable Cabins",
  },
  {
    id: "12", sku: "POC-CSC-2040", basePrice: 185000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "20ft Storage Container",
    feedTitle: "Storage Container 20ft Corten Steel for Secure Site Storage | Portable Office Cabin",
    size: "20 ft — 160 sq ft", material: "Corten Weathering Steel", bestFor: "Secure Storage",
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
    h1Title: "Shipping Container GP",
    feedTitle: "Shipping Container 20ft GP ISO Steel for Storage & Office Conversion | Portable Office Cabin",
    size: "20 ft GP", material: "ISO-Grade Corrugated Steel", bestFor: "Storage & Office Conversion",
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
    /**
     * SIZE PINNED BY THE OWNER (2026-07): this listing is the 15ft x 10ft configuration at the
     * confirmed ₹2,40,000 ex-GST → ₹2,83,200 incl. GST. It previously said "Custom sizes" — a
     * fixed-price offer cannot describe an unbounded size range (the id-10 ambiguity), and its
     * products.ts spec table carried a "₹1,40,000 to ₹3,80,000+" Price Range chip that contradicted
     * the checkout price (removed the same day). Other sizes remain available on quotation.
     */
    id: "20", sku: "POC-CO-MSCO", basePrice: 240000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "MS Container Office Cabin",
    feedTitle: "MS Container Office Cabin 15ft x 10ft ISMB Frame Insulated for Site Offices | Portable Office Cabin",
    size: "15ft x 10ft", material: "Heavy-Duty MS ISMB / ISMC Sections", bestFor: "Site Offices",
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

  // ═════════ CUSTOM / PROJECT BUILDS ═════════
  // Aug 2026 OWNER DECISION: every SKU below is purchasable ON-SITE at its stored base price
  // (owner confirmed the figures when directing "all products Buy Now"). They remain BLOCKED
  // from the Merchant feed via FEED_IMAGE_POLICY in app/api/merchant-feed/route.ts until each
  // passes a per-SKU spec/image review — the feed keeps exactly the item set Google approved.
  {
    id: "10", sku: "POC-CO-GEN", basePrice: 1200000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Container Office",
    feedTitle: "Container Office 25 ft x 14 ft High-Tensile MS Steel for Project Sites | Portable Office Cabin",
    /**
     * SIZE PINNED BY THE OWNER (2026-08): this SKU is the 25 ft x 14 ft configuration — one of the
     * Container Office Cabin family's standard sizes (see src/data/productFamilies.ts), served at
     * the family's parent URL.
     *
     * It previously read "25ft x 14ft x 9ft (160–320+ sq ft)". Two things were wrong with that and
     * both are documented in merchantFeedPolicy.ts as reasons this SKU is held out of the feed:
     *   • the "(160–320+ sq ft)" RANGE contradicted the single 25 x 14 dimension the fixed price is
     *     set against — a fixed-price offer cannot describe an unbounded size;
     *   • the "x 9ft" height is not confirmed. The owner has since stated the commonly used
     *     standard is 8 ft 6 in, so 9 ft is neither confirmed nor the standard, and it is omitted
     *     rather than swapped for another unverified figure.
     * The catalogue spec row in products.ts still says "H 9 ft" and needs the owner's decision —
     * it is their copy, not something to rewrite unasked.
     */
    size: "25 ft x 14 ft", material: "High-Tensile MS / Corten Steel", bestFor: "Project Site Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Container Offices",
    /**
     * Was quote-only ("size is a range, no single price is honest") until Aug 2026, when the
     * owner enabled sitewide Buy Now and confirmed this base price. The ₹14,16,000 incl-GST
     * price buys the base 25ft × 14ft configuration; larger layouts remain custom enquiries.
     * Feed-blocked until the size wording and photos are reviewed for one exact deliverable.
     */
    note: "Owner-confirmed fixed price for the base 25ft x 14ft configuration (Aug 2026). Feed-blocked pending spec/image review.",
  },
  {
    id: "4", sku: "POC-PH-2BHK", basePrice: 1800000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Family Prefab Home 2BHK",
    feedTitle: "Family Prefab Home 2BHK Light Gauge Steel for Residential Use | Portable Office Cabin",
    size: "2BHK", material: "Light Gauge Steel Frame", bestFor: "Residential Use",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Prefab Homes",
    note: "Owner-confirmed fixed price for the base 2BHK configuration (Aug 2026); custom briefs quoted separately. Feed-blocked pending review.",
  },
  {
    id: "8", sku: "POC-PH-3LUX", basePrice: 3600000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Luxury Prefab Villa G+1",
    feedTitle: "Luxury Prefab Villa G+1 3BHK for Residential Use | Portable Office Cabin",
    size: "G+1, 3BHK", material: "Steel Frame with Premium Finishes", bestFor: "Residential Use",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Prefab Homes",
    note: "Owner-confirmed fixed price for the base G+1 3BHK configuration (Aug 2026); custom briefs quoted separately. Feed-blocked pending review.",
  },
  {
    id: "39", sku: "POC-WA-G1", basePrice: 2000000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Workmen Accommodation",
    feedTitle: "G+1 Workmen Accommodation Prefab Camp for 50-500 Workers | Portable Office Cabin",
    size: "G+1, 50–500 workers", material: "Modular Steel Frame", bestFor: "Labour Camps",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "G+1 Workmen Accommodation",
    note: "Project-scale build, priced by the labour-colony calculator.",
  },
  {
    // ₹42,00,000 ex-GST → ₹49,56,000 incl. 18% GST for the stated 80ft × 24ft G+2 configuration.
    // Aug 2026: owner reversed the earlier keep-quote-only decision and enabled online purchase
    // at this price (sitewide Buy Now directive). Still OUT of the Merchant feed via
    // FEED_IMAGE_POLICY until the per-SKU review passes. showIndicativePrice is now inert
    // (the purchasable branch renders the real fixed-price block).
    id: "40", sku: "POC-LC-PREFAB", basePrice: 4200000, priceConfirmed: true, kind: "product", inStock: true,
    showIndicativePrice: true,
    h1Title: "Labour Colony",
    feedTitle: "Prefab Labour Colony G+1 and G+2 Modular for 50-500 Workers | Portable Office Cabin",
    // The size chip states the SPECIFIC configuration the indicative ₹42L price covers.
    // It used to read "G+1 / G+2, 50–500+ workers" — a range, which was fine while the
    // product showed no price, but alongside a figure it left the customer unable to
    // tell what that figure actually buys. Price and size must describe the same thing.
    size: "80 ft × 24 ft, Ground + 2 Floors (G+2)", material: "50–100mm PUF/EPS Panels, PPGI", bestFor: "Labour Colonies",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "G+1 Workmen Accommodation",
    note: "Project-scale build, priced by the labour-colony calculator.",
  },

  // ═════════ RENTAL — bookable online since Aug 2026 (owner decision); never a Shopping offer ═════════
  {
    id: "18", sku: "POC-SC-RENT", basePrice: 14000, priceConfirmed: true, kind: "product", inStock: true,
    // basePrice is RECURRING MONTHLY RENT, not a purchase price. This flag is what keeps it out
    // of feedEligible(), sale-price tables and the JSON-LD Offer block — it must not rely on a
    // whitelist entry someone could remove.
    priceBasis: "monthly-rental",
    h1Title: "Shipping Container Rental",
    feedTitle: "Shipping Container Rental 20ft & 40ft for Storage & Site Use | Portable Office Cabin",
    size: "20ft / 40ft", material: "Corten Steel", bestFor: "Short-Term Storage",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Cargo Storage & Shipping Containers",
    note: "₹14,000 base is the MONTHLY rent — the online Buy Now charge is one month's booking (₹16,520 incl. GST), never a sale price. Permanently feed-blocked.",
  },

  // ═════════ SERVICE / CAPABILITY PAGE — purchasable on-site since Aug 2026 (owner decision) ═════════
  {
    id: "19", sku: "POC-SOC-MFR", basePrice: 280000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Site Office Container Manufacturers",
    feedTitle: "Site Office Container Manufacturing MS Frame for Project Offices | Portable Office Cabin",
    size: "Custom sizes", material: "IS-Grade MS Frame, Insulated Panels", bestFor: "Project Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONSTRUCTION, productType: "Site Office Containers",
    note: "Capability page sold as the base custom-size site office at the owner-confirmed price (Aug 2026). Feed-blocked pending review.",
  },

  // ═════════ CATEGORY GUIDES — purchasable on-site since Aug 2026 (owner decision), feed-blocked ═════════
  {
    id: "35", sku: "POC-CSC-GUIDE", basePrice: 280000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Cargo Storage Containers",
    feedTitle: "Cargo Storage Container 20ft & 40ft for Industrial Storage | Portable Office Cabin",
    size: "20ft / 40ft", material: "Corten Steel", bestFor: "Industrial Storage",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Cargo Storage & Shipping Containers",
  },
  {
    id: "36", sku: "POC-CC-GUIDE", basePrice: 280000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Cargo Containers",
    feedTitle: "Cargo Container Corten & Mild Steel for Freight & Storage | Portable Office Cabin",
    size: "20ft / 40ft / 40ft HC", material: "Corten (ASTM A588) / MS (IS 2062)", bestFor: "Freight & Storage",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Cargo Storage & Shipping Containers",
  },
  {
    id: "38", sku: "POC-SC-CARGO", basePrice: 145000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Cargo Shipping Container",
    feedTitle: "Cargo Shipping Container Corten Steel ISO for Freight & Storage | Portable Office Cabin",
    size: "20 ft × 8 ft", material: "Corten Weathering Steel (2–4mm)", bestFor: "Freight & Storage",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Cargo Storage & Shipping Containers",
  },
  {
    // Marketing Office — QUOTE-ONLY by design (2026-08-16). The page copy is explicitly
    // ₹84,00,000 INCL. 18% GST is the owner-supplied FINAL customer price (2026-08-16 — owner
    // chose "incl. GST" explicitly). basePrice 7118644 is derived: it is the whole-rupee base
    // whose sellPrice() rounds to exactly ₹84,00,000, so card, page, cart, checkout, Razorpay
    // and JSON-LD all land on the owner's figure. Never "correct" this base to a round number —
    // the customer price is the spec, the base is derived. Purchasable on-site; kept OUT of the
    // automated Merchant feed via FEED_IMAGE_POLICY until the per-SKU spec/image review passes.
    // size = the 40 ft × 65 ft compound the listed price buys (owner-supplied, 2026-08-16) —
    // NOT the generic size menu; the fixed price must name one exact configuration.
    id: "43", sku: "POC-MO-CNTR", basePrice: 7118644, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Marketing Office",
    feedTitle: "Marketing Office Container Sales Gallery for Project Launches | Portable Office Cabin",
    size: "40 ft × 65 ft", material: "MS container modules, insulated PUF/rockwool panels", bestFor: "Project Sales Galleries & Launches",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Container Offices",
  },
  {
    // PRODUCT CHILD of Marketing Office (id 43) — prefab building system, not a container.
    // ₹1,16,00,000 INCL. 18% GST is the owner-supplied FINAL customer price (2026-08-16,
    // "incl. GST" chosen explicitly). basePrice 9830508.47 is deliberately fractional: it is
    // the ONLY value whose sellPrice() rounds to exactly ₹1,16,00,000 (no whole-rupee base
    // lands there), and every customer surface derives from sellPrice(), so the fraction
    // never leaks. Never "correct" the base — the customer price is the spec. size = the
    // 165 ft × 58 ft build the listed price buys. Purchasable on-site; kept OUT of the
    // automated Merchant feed via FEED_IMAGE_POLICY until the per-SKU spec/image review.
    id: "44", sku: "POC-PMO-165", basePrice: 9830508.47, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Prefab Marketing Office",
    feedTitle: "Prefab Marketing Office Sales Gallery Built to Plan | Portable Office Cabin",
    size: "165 ft × 58 ft", material: "Steel truss-roof frame, insulated PUF/rockwool sandwich panels", bestFor: "Township & Large-Launch Sales Galleries",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Container Offices",
  },
  {
    // Container Site Office — base ₹6,20,000 + 18% GST = ₹7,31,600 total (owner-supplied, 2026-07-29).
    // Aug 2026: purchasable online (sitewide Buy Now directive). Kept OUT of the automated feed
    // via FEED_IMAGE_POLICY — the owner submits this one to Merchant Centre manually, so feeding
    // it automatically would create a duplicate offer.
    id: "42", sku: "POC-CSO-4010", basePrice: 620000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Container Site Office",
    feedTitle: "Container Site Office 40x10 ft MS with 15 Workstations | Portable Office Cabin",
    size: "40 ft × 10 ft", material: "MS (Mild Steel) Container Structure", bestFor: "Site Offices & Project Teams",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Site Office Containers",
  },

  // ═════════ LOCATION LANDING PAGES — the SAME container at six different prices ═════════
  // Aug 2026: purchasable on-site (owner confirmed each city's stored price when directing
  // sitewide Buy Now). PERMANENTLY feed-blocked: feeding six prices for one item is exactly
  // the conflicting-offer mismatch that gets a Merchant account suspended.
  {
    id: "29", sku: "POC-SC-KRMG", basePrice: 50000, priceConfirmed: true, kind: "product", inStock: true,
    // Aug 2026 owner GMC correction: the six city SKUs were near-identical "Shipping Container
    // in <city>" listings at six prices — Google reads that as one product duplicated with
    // conflicting offers. Each is now a DISTINCT configuration (grade ascends with price);
    // the city names the delivery area, not the product.
    h1Title: "Used 20 ft Shipping Container (As-Is Grade)",
    feedTitle: "Used 20 ft Shipping Container As-Is Grade, Koramangala Bangalore Delivery | Portable Office Cabin",
    size: "20 ft × 8 ft — used, as-is grade", material: "Corten Steel", bestFor: "Storage & Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Cargo Storage & Shipping Containers",
  },
  {
    id: "30", sku: "POC-SC-KRSH", basePrice: 150000, priceConfirmed: true, kind: "product", inStock: true,
    // Owner correction (Aug 2026): city removed from the title — the page still serves the
    // Krishnagiri area, but the product is the grade, not the place.
    h1Title: "Refurbished 20 ft Shipping Container (Premium)",
    feedTitle: "Refurbished 20 ft Shipping Container Premium Grade | Portable Office Cabin",
    size: "20 ft × 8 ft — refurbished, premium grade", material: "Corten Steel", bestFor: "Storage & Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Cargo Storage & Shipping Containers",
  },
  {
    id: "31", sku: "POC-SC-SIPCOT", basePrice: 150000, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Refurbished 20 ft Shipping Container (Industrial)",
    feedTitle: "Refurbished 20 ft Shipping Container Industrial Grade | Portable Office Cabin",
    size: "20 ft × 8 ft — refurbished, industrial grade", material: "Corten Steel", bestFor: "Storage & Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Cargo Storage & Shipping Containers",
  },
  {
    // basePrice chosen so sellPrice() = exactly ₹1,49,000 incl. GST — the FINAL price the
    // owner supplied (Aug 2026). Never "correct" this base to a round number: the customer
    // price is the spec, the base is derived.
    id: "32", sku: "POC-SC-CHN", basePrice: 126271, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Used 20 ft Shipping Container (Wind & Water Tight)",
    feedTitle: "Used 20 ft Shipping Container WWT Grade, Chennai Port Delivery | Portable Office Cabin",
    size: "20 ft × 8 ft — used, wind & water tight", material: "Corten Steel", bestFor: "Storage & Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Cargo Storage & Shipping Containers",
  },
  {
    // basePrice chosen so sellPrice() = exactly ₹1,48,000 incl. GST (owner-supplied final price).
    id: "33", sku: "POC-SC-NRSP", basePrice: 125424, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Refurbished 20 ft Shipping Container",
    feedTitle: "Refurbished 20 ft Shipping Container | Portable Office Cabin",
    size: "20ft / 40ft", material: "Corten Steel — 350 MPa Yield", bestFor: "Storage & Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Cargo Storage & Shipping Containers",
  },
  {
    // basePrice 139830.51 is deliberately fractional: it is the ONLY value whose sellPrice()
    // rounds to exactly ₹1,65,000 incl. GST — the final price the owner supplied. Every
    // customer surface derives from sellPrice(), so the fraction never leaks.
    id: "34", sku: "POC-SC-PNYA", basePrice: 139830.51, priceConfirmed: true, kind: "product", inStock: true,
    h1Title: "Used 20 ft Shipping Container (Cargo-Worthy)",
    feedTitle: "Used 20 ft Cargo-Worthy Shipping Container | Portable Office Cabin",
    size: "20ft / 40ft", material: "Corten Steel, Marine Plywood Floor", bestFor: "Storage & Offices",
    deliveryDays: DELIVERY, googleProductCategory: CAT_CONTAINERS, productType: "Cargo Storage & Shipping Containers",
  },

  /**
   * ── STANDARD SIZE VARIANTS ────────────────────────────────────────────────────────────
   * Appended, never hand-written: one row per PUBLISHED size of every published product
   * family in src/data/productFamilies.ts, generated by variantCommerceRows().
   *
   * WHY THEY LIVE IN THIS ARRAY: every surface that decides whether something can be sold
   * — isPurchasable(), isOutrightSale(), feedEligible(), computeTotals(), the JSON-LD
   * Offer gate, the cart's refusal guard, the Razorpay server-side re-price — already
   * keys off getCommerce(id). Registering a variant as a commerce row is therefore the
   * ONLY change needed to carry a chosen size all the way through to payment; not one of
   * those call sites has to learn what a variant is.
   *
   * The two gates apply to a variant EXACTLY as they do to every row above it: a size the
   * owner has not priced carries priceConfirmed:false, so it is refused by isPurchasable()
   * and by feedEligible() and shows no figure anywhere. Nothing here can turn a variant
   * sellable on its own — that decision lives in productFamilies.ts, in one place.
   *
   * NOTE the import is at the FOOT of the module's dependency graph on purpose:
   * productFamilies.ts imports only TYPES from this file, so there is no runtime cycle.
   */
  ...variantCommerceRows(),
  {
    /* CONSTRUCTION INDIVIDUAL BUILDING — a civil-construction SERVICE, deliberately not a product.
     * kind:"service" and priceConfirmed:false make isPurchasable() false, which removes Add to Cart,
     * removes the JSON-LD Offer price and keeps the SKU out of feedEligible() structurally rather
     * than by a merchantFeedPolicy entry. That is correct and must stay: the job is priced PER SQ FT
     * after a site visit, and a per-sq-ft rate is a price signal Google Shopping rejects outright.
     * basePrice is 0 because there is no unit price to state — do not put a placeholder figure here. */
    id: "45", sku: "POC-CIB-RCC", basePrice: 0, priceConfirmed: false, kind: "service", inStock: true,
    h1Title: "Construction Individual Building",
    feedTitle: "Construction Individual Building — RCC Individual House Construction | Portable Office Cabin",
    size: "Built to your plot — G+1 to G+5",
    material: "RCC frame with block masonry walls",
    bestFor: "Owners building a permanent individual house on their own plot",
    deliveryDays: "Programme agreed after the site visit",
    googleProductCategory: "Hardware > Building Consumables",
    productType: "Home Construction",
    note: "Priced per sq ft of built-up area after a site visit; rate depends on the agreed specification.",
  },
];

const BY_ID = new Map(PRODUCT_COMMERCE.map((c) => [c.id, c]));

export function getCommerce(productId: string): ProductCommerce | undefined {
  return BY_ID.get(productId);
}

/**
 * Can a customer put this in the cart and pay for it right now?
 * Gates Add to Cart / Buy Now. TRUE for a rental booking too — the rental IS payable online.
 *
 * NOT the right predicate for anything that presents a price as the cost of OWNING the unit.
 * Use isOutrightSale() for that (price tables, category price bands, ItemList/Offer schema,
 * the Merchant feed). See PriceBasis on ProductCommerce.
 */
export function isPurchasable(productId: string): boolean {
  const c = BY_ID.get(productId);
  return !!c && c.kind === "product" && c.priceConfirmed && c.inStock;
}

/** What the money on a SKU actually means. Absent = "outright". */
export function priceBasisOf(productId: string): PriceBasis {
  return BY_ID.get(productId)?.priceBasis ?? "outright";
}

/** True when the figure is RECURRING RENT, not the price of owning the unit. */
export function isRentalPrice(productId: string): boolean {
  return priceBasisOf(productId) === "monthly-rental";
}

/**
 * Suffix that must follow ANY human-visible price for this SKU.
 *
 * A rental figure is not hidden — the unit is genuinely bookable — but it is never shown bare,
 * because "₹16,520 incl. GST" beside outright-sale cards reads as the cost of owning it.
 * Returns "" for a normal sale, so call sites can append unconditionally.
 */
export function priceUnitSuffix(productId: string): string {
  return isRentalPrice(productId) ? " / month" : "";
}

/**
 * Payable online AND the figure is the outright purchase price of the unit.
 *
 * This is the predicate for every surface that states or compares a SALE price: price tables,
 * category price bands, ItemList/Offer structured data and the Merchant feed. A monthly rent
 * shown beside outright-sale units — or emitted as a schema.org Offer, which is what Google
 * reads into Shopping — misstates what the customer is buying.
 */
export function isOutrightSale(productId: string): boolean {
  return isPurchasable(productId) && !isRentalPrice(productId);
}

/**
 * Everything that may be submitted to Google Merchant Center.
 *
 * Rentals are excluded STRUCTURALLY, not by whitelist: a recurring rent can never be a
 * Shopping offer, so this must not depend on someone remembering to block the SKU in
 * FEED_IMAGE_POLICY. That block still exists as a second layer.
 */
export function feedEligible(): ProductCommerce[] {
  return PRODUCT_COMMERCE.filter(
    (c) => c.kind === "product" && c.priceConfirmed && c.inStock && (c.priceBasis ?? "outright") === "outright",
  );
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
