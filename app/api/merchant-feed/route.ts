import { products, getProductById, getProductDetailPath, type Product } from "@/data/products";
import {
  getVariantById,
  variantFeedHoldReason,
  type VariantHit,
} from "@/data/productFamilies";
import { feedEligible, hasGenuineSalePrice, isPurchasable, BRAND, type ProductCommerce } from "@/data/productCommerce";
import { sellPrice, priceForFeed } from "@/lib/pricing/gst";
import { SHIPPING_ZONES, DISPATCH_WORKING_DAYS } from "@/data/shippingZones";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import { getBestProductImage } from "@/data/productImages";
import { excludedSkus, feedExclusionFor, feedImageDropsFor } from "@/data/merchantFeedPolicy";

/**
 * ══════════════════════════════════════════════════════════════════════════════════════
 *  THE Google Merchant Center product feed.  https://portableofficecabin.com/api/merchant-feed
 * ══════════════════════════════════════════════════════════════════════════════════════
 *
 * This is the ONE feed. The old Supabase edge function (supabase/functions/google-merchant-feed)
 * is deprecated and serves zero items — two feeds means two sources of truth, and that is
 * precisely how this account got suspended for misrepresentation the first time.
 *
 * Nothing is hardcoded here. Every item is derived from:
 *   • feedEligible()            — WHICH SKUs may be submitted (kind:"product" + priceConfirmed
 *                                 + inStock). That is the same predicate as isPurchasable(), so
 *                                 the feed cannot contain anything the customer cannot actually
 *                                 add to the cart and pay for.
 *   • productCommerce.ts        — the commerce + presentation truth: feedTitle, productType,
 *                                 googleProductCategory, basePrice, compareAtBasePrice.
 *   • src/data/products.ts      — the long-form description and the gallery images.
 *   • sellPrice()               — the GST-INCLUSIVE price, rounded once, identical to the price
 *                                 on the landing page, in the JSON-LD offers and at checkout.
 *   • SHIPPING_ZONES            — the REAL zone freight table + per-zone transit times.
 *   • DISPATCH_WORKING_DAYS     — the REAL manufacturing handling time (7–15 working days).
 *
 * Rentals, category guides, SEO location pages, service pages, made-to-order project builds and
 * every SKU whose price the owner has not confirmed are excluded automatically by feedEligible().
 * Do not add a product to this feed by any other route. Because <g:product_type> is now read off
 * the SKU's own commerce record, a category with zero eligible SKUs simply never appears — there
 * is no separate category list that could leak an empty one.
 */

const SITE_URL = "https://portableofficecabin.com";

/**
 * ── WHICH SKUs ARE HELD OUT OF THE FEED ─────────────────────────────────────────────────────────
 * The exclusion list is NOT in this file. It lives as declarative data in
 * `src/data/merchantFeedPolicy.ts` — one entry per SKU, each carrying a category and the reason it
 * is held back — so the rule "may we advertise this?" is reviewable in one place, in a diff,
 * without reading XML-generation code. This route only asks the policy; it never names a product.
 *
 * Two levers, both feed-only — NOTHING there touches the product pages, the gallery, the JSON-LD or
 * the on-disk image files:
 *   • an EXCLUSION   — the SKU is skipped entirely, with its reason logged.
 *   • an IMAGE DROP  — specific non-compliant images (matched by filename fragment) are removed
 *                      from both the primary and the additional slots. If a CLEAN image remains it
 *                      becomes the primary automatically (galleryImagesFor preserves order), which
 *                      is exactly the "use the clean gallery image as the Merchant image" rule.
 */

/**
 * ── STABLE FEED IMAGES ──────────────────────────────────────────────────────────────────────────
 * FEED-ONLY image-URL stabilisation.
 *
 * WHY: the catalog's imported assets resolve to bundler-hashed paths
 * (/_next/static/media/<name>.<hash>.webp). The hash changes whenever the asset pipeline
 * re-fingerprints, so the image URL Google crawled yesterday can 404 after today's deploy —
 * which surfaces in Merchant Center as "Unable to show image". A file under public/ has a
 * permanent URL that survives every build.
 *
 * HOW: any feed image whose basename appears below is rewritten to its permanent
 * /images/products/<name> URL (those public files are the pre-optimised web variants of the very
 * same photos — e.g. office-portable-cabin-main is the square 800×800 cut). The set is explicit,
 * not an fs scan, so the feed's behaviour is identical in every environment and reviewable in a
 * diff. After rewriting, ANY image still on /_next/ is dropped from the item rather than
 * submitted — the feed structurally cannot emit a hash-rotating URL. If dropping leaves an item
 * imageless, the existing "no compliant image" exclusion takes over.
 *
 * Feed-only by design: the PAGE keeps using the imported asset (next/image serves it and the
 * page's URL is always in sync with its own build); only the URLs submitted to Google change.
 *
 * TO ADD A PRODUCT IMAGE: put the optimised copy in public/images/products/ and list its
 * basename here.
 */
const STABLE_IMAGE_BASENAMES = new Set<string>([
  "office-portable-cabin-main.webp",              // POC-PC-OFFICE  (GMC "Unable to show image", 2026-07)
  "cabin-portable-site.webp",                     // POC-PC-CABPORT
  "cabins-in-office-modern.webp",                 // POC-CO-CABIN
  "cargo-container-for-sale-main.webp",           // POC-CC-FS
  "cargo-storage-container-40ft.webp",            // POC-CSC-2040
  "cargo-storage-containers-pink-main.webp",      // POC-CSC-PINK
  "labor-hutments-aerial.webp",                   // POC-LH-WORKER
  "labour-hutments-staff-accommodation-1.webp",   // POC-LH-STAFF
  "prefab-porta-cabin-exterior.webp",             // POC-PC-PREFAB + POC-PC-PPCB (shared photo)
  "shipping-container-stacked.webp",              // POC-SC-40HC
  "steel-portable-office-container-crane.webp",   // POC-SOC-SPOC
  /* POC-LC-PREFAB — its whole gallery is imported, so without these five the feed dropped every
   * image and excluded the item. The aerial is registered as `.png` because that is the import's
   * extension and therefore the basename webpack emits; the public twin was RE-ENCODED to a real
   * PNG (the source file is WebP bytes under a .png name, which would be served as image/png and
   * risk an "Unable to show image" disapproval). */
  "labour-colony-aerial.png",                     // POC-LC-PREFAB
  "labour-colony-new-1.webp",                     // POC-LC-PREFAB
  "labour-colony-new-2.webp",                     // POC-LC-PREFAB
  "labour-colony-new-3.webp",                     // POC-LC-PREFAB
  "labour-colony-new-4.webp",                     // POC-LC-PREFAB
]);

/** Rewrite a bundler-hashed asset URL to its permanent public twin; unknown URLs pass through. */
function stabilizeImageUrl(url: string): string {
  const m = url.match(/\/_next\/static\/media\/(.+)\.[a-f0-9]{8}\.(\w+)$/);
  if (!m) return url;
  const base = `${m[1]}.${m[2]}`;
  return STABLE_IMAGE_BASENAMES.has(base) ? toAbsolute(`/images/products/${base}`) : url;
}

/** Merchant Center hard-rejects a title over 150 characters. feedTitle is written to fit. */
const MAX_TITLE_LENGTH = 150;

/**
 * Feed description budget. Google permits 5000, but Shopping surfaces only the opening of it and
 * a tight, benefit-led description reads better and matches the landing page more obviously.
 */
const MAX_DESCRIPTION_LENGTH = 500;

/** Escape everything that is interpolated into the XML. Unescaped `&` alone invalidates the feed. */
function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Feed descriptions must be plain text: drop any markup, collapse whitespace. */
function toPlainText(html: string): string {
  return (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * ── PROMOTIONAL LANGUAGE — REMOVED AT SENTENCE GRANULARITY ────────────────────────────────────
 * Merchant Center disapproves promotional and comparative-pricing text in <g:title> and
 * <g:description>. We therefore DROP any sentence that makes such a claim rather than rewriting
 * it: rewriting product copy would mean inventing benefits, which is the exact behaviour that got
 * this account suspended. Dropping is lossless in the other direction — the sentence still exists
 * on the landing page, it simply is not submitted to Google.
 *
 * Two deliberate judgement calls:
 *
 *  • ANY "%" claim kills its sentence. The only percentages in the catalog today are
 *    "40–60% cheaper than RCC construction" (POC-PC-PPCB, POC-PC-CABPORT) — an unsubstantiated
 *    comparative price claim, i.e. precisely the class of statement that must never reach Google.
 *
 *  • "for sale" is KEPT. It is a factual statement of availability and is literally the wording of
 *    the landing-page H1 ("Shipping Container for Sale"), not a promotion. Only genuinely
 *    promotional uses of the word — "on sale", "sale price", "clearance" — are matched below.
 *    A blunt /\bsale\b/ would gut three perfectly compliant descriptions.
 */
const PROMO_PATTERNS: RegExp[] = [
  /%/, // comparative pricing / discount claims — see above
  /\bcheap(er|est)?\b/i,
  /\bbest\b/i,
  /\bdiscount(s|ed)?\b/i,
  /\bbargain\b/i,
  /\b(lowest|unbeatable|rock[-\s]bottom)\s+(price|rate|cost)/i,
  /\bsave\s+(up\s+to\s+)?(\d|₹|rs\b)/i,
  /\b(on sale|sale price|flash sale|clearance)\b/i,
  /\bsale\s+(ends|now|today)\b/i,
  /\b(special|limited|introductory|exclusive|festive)\s+offers?\b/i,
  /\boffer\s+(ends|valid)\b/i,
  /\b(limited\s+time|hurry|act\s+now)\b/i,
  /\b(great|hot|top)\s+deals?\b/i,
  // "Free of charge" claims. The negative lookbehind keeps genuine hyphenated specs
  // (maintenance-free, rust-free, hassle-free) — they are properties, not promotions.
  /(?<!-)\bfree\b/i,
];

function isPromotional(sentence: string): boolean {
  return PROMO_PATTERNS.some((pattern) => pattern.test(sentence));
}

/**
 * ── PRICE-CLAIM TEXT — THE STRICT-ELIGIBILITY GUARD ──────────────────────────────────────────
 * A feed item's ONLY price is <g:price> (+ <g:sale_price> on a genuine sale). Any OTHER price
 * signal in the submitted text — a "starting from", a "price on request", a ₹/lakh figure, a
 * per-sq-ft rate — either contradicts <g:price> outright or marks the product as not really
 * fixed-price. Both are Misrepresentation triggers.
 *
 * Applied two ways, deliberately different:
 *   • TITLE: any hit EXCLUDES the item. A title cannot be sentence-trimmed without rewriting it,
 *     and a rewritten title would no longer match the landing page.
 *   • DESCRIPTION: the offending SENTENCE is dropped (same lossless policy as PROMO_PATTERNS —
 *     the sentence still exists on the landing page; it simply is not submitted).
 *
 * "quote"/"quotation" alone is NOT matched: transport-quoted-at-checkout wording is factual and
 * fine. Only the phrases that mark the PRODUCT itself as quote-priced are.
 */
const PRICE_CLAIM_PATTERNS: RegExp[] = [
  /₹/, // any literal rupee figure in feed text can only drift from <g:price>
  /\bRs\.?\s*\d/i,
  /\bINR\s*\d/i,
  /\d[\d,.]*\s*(lakh|lac|crore)s?\b/i,
  /\b(price|cost|rate)s?\s+on\s+request\b/i,
  /\bcall\s+for\s+(a\s+)?price\b/i,
  /\brequest\s+(a\s+)?quot(e|ation)\b/i,
  /\bquotation[-\s]only\b/i,
  /\bstarting\s+(from|at|near|price)\b/i,
  /\bprices?\s+start\b/i,
  /\bper\s+sq\.?\s*\.?\s*(ft|feet|foot|m|metre|meter)\b/i,
  /\bapprox(imate(ly)?)?\.?\s*(₹|rs|inr|\d)/i,
];

function priceClaimIn(text: string): RegExp | undefined {
  return PRICE_CLAIM_PATTERNS.find((pattern) => pattern.test(text));
}

/**
 * Collapse genuine ALL-CAPS shouting, which Merchant Center rejects.
 *
 * Deliberately narrow: it only fires on a RUN of three or more consecutive all-caps words of 4+
 * letters ("LOWEST PRICE GUARANTEED"). The catalog is full of legitimate uppercase product
 * vocabulary — MS, GI, PUF, EPS, FRP, ISMC, RHS, ISMB, EPC, MEP, IS 800 — and mangling those
 * would be worse than the problem. Nothing in the catalog trips this today; it is a guard against
 * a future copy edit, in the same spirit as the duplicate-g:id guard below.
 */
function deShout(text: string): string {
  return text
    .replace(/\b(?:[A-Z]{4,}\s+){2,}[A-Z]{4,}\b/g, (run) => run.toLowerCase())
    .replace(/!{2,}/g, "!");
}

/** Trim to `max` characters on a WORD boundary — never mid-word — appending an ellipsis. */
function trimToWordBoundary(text: string, max: number): string {
  if (text.length <= max) return text;
  // Reserve one character for the ellipsis so the result is never longer than `max`.
  const head = text.slice(0, max - 1);
  const lastSpace = head.lastIndexOf(" ");
  const clipped = (lastSpace > 0 ? head.slice(0, lastSpace) : head).replace(/[\s,;:.\-–—]+$/, "");
  return `${clipped}…`;
}

/**
 * The <g:description>: the product's own copy, as plain text, stripped of any promotional
 * sentence, de-shouted, and trimmed to MAX_DESCRIPTION_LENGTH on a word boundary.
 *
 * The copy itself is NEVER rewritten and no benefit is ever invented. If every sentence turns out
 * to be promotional we fall back to the short description, then to the (promo-free by contract)
 * feedTitle — because <g:description> is required and an empty one fails the item.
 */
function feedDescription(commerce: ProductCommerce, product: Product): string {
  const clean = (source: string): string => {
    const plain = deShout(toPlainText(source));
    if (!plain) return "";

    const sentences = plain.split(/(?<=[.!?])\s+/);
    // Promotional sentences AND price-claim sentences are dropped: a description may carry no
    // price signal at all — the item's only price is <g:price>.
    const kept = sentences.filter((sentence) => !isPromotional(sentence) && !priceClaimIn(sentence));
    if (kept.length < sentences.length) {
      console.warn(
        `[merchant-feed] ${commerce.sku}: dropped ${sentences.length - kept.length} promotional/price-claim sentence(s) from the description`,
      );
    }
    return kept.join(" ").trim();
  };

  const description = clean(product.description) || clean(product.shortDescription);
  if (!description) {
    console.error(`[merchant-feed] ${commerce.sku}: description is empty after sanitising; falling back to the title`);
    return commerce.feedTitle;
  }

  return trimToWordBoundary(description, MAX_DESCRIPTION_LENGTH);
}

/** The purpose-written Merchant Center title. Guarded, never trusted, because >150 chars fails. */
function feedTitle(commerce: ProductCommerce): string {
  if (commerce.feedTitle.length <= MAX_TITLE_LENGTH) return commerce.feedTitle;
  console.error(
    `[merchant-feed] ${commerce.sku}: feedTitle is ${commerce.feedTitle.length} chars (max ${MAX_TITLE_LENGTH}) — trimming`,
  );
  return trimToWordBoundary(commerce.feedTitle, MAX_TITLE_LENGTH);
}

/** Make a resolved image path absolute. Google requires a fully-qualified https URL. */
function toAbsolute(url: string): string {
  return url.startsWith("http") ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * The product's gallery images, absolute — the SAME images, in the SAME order, that the product
 * page's gallery renders. Google compares the feed image against the landing page, so this must
 * mirror ProductDetailServer's `galleryImages` exactly:
 *
 *   1. resolveImageUrl() every entry in `product.images`. This is essential — an entry may be a
 *      plain path string OR a static import (a StaticImageData object whose URL is on `.src`).
 *      Treating only strings as valid silently drops every product that imports its photos.
 *   2. Drop /placeholder.svg entries.
 *   3. If nothing real is left, fall back to getBestProductImage() — the product-specific photo,
 *      else the category photo — which is precisely what the page itself displays. Many catalog
 *      rows still carry `images: ["/placeholder.svg"]` while their real photo lives in the
 *      productImages map, so WITHOUT this fallback most of the catalog would be dropped from the
 *      feed even though its landing page shows a perfectly good image.
 *   4. De-duplicate.
 */
function galleryImagesFor(product: Product): string[] {
  const extras = (product.images || [])
    .map((image) => resolveImageUrl(image))
    .filter((url) => url && !url.includes("placeholder"));

  const list =
    extras.length > 0
      ? extras
      : [getBestProductImage(product.id, product.categorySlug, product.images?.[0], product.sku)];

  return Array.from(new Set(list.filter((url) => url && !url.includes("placeholder")))).map(toAbsolute);
}

/**
 * The real zone freight table, as <g:shipping> elements — one per zone PER PINCODE PREFIX.
 *
 * ── WHY EACH ZONE IS SCOPED BY <g:postal_code> ───────────────────────────────────────────────
 * Merchant Center charges the LOWEST-PRICED <g:shipping> entry that matches the shopper's
 * address. If every entry carried only <g:country>IN</g:country> with no geographic scope, then
 * all four zones would match every Indian shopper, Google would pick the cheapest — Zone 1's
 * 0 INR — and the listing would advertise FREE DELIVERY ACROSS ALL OF INDIA. That is exactly the
 * false free-shipping claim that contributed to the account's suspension, and it would be back
 * even though the zone table itself is correct.
 *
 * So each zone is emitted scoped to its own pincode prefixes ("560" → <g:postal_code>560*</...>).
 * Zone 4 is the nationwide fallback and has no prefixes, so it is emitted country-wide.
 *
 * Because the zone rates rise with distance while the prefixes get more specific
 * (Zone 1 "560" = 0 < Zone 2 "56" = 18,000 < Zone 4 = 45,000), Google's cheapest-match rule lands
 * on the same zone that resolveShippingZone() picks at checkout by longest-prefix. The feed and
 * the checkout therefore quote the SAME freight for any given pincode:
 *   • 560001 (Bengaluru) → matches Zone 1, 2 and 4 → cheapest = 0 INR        ✓ free, genuinely
 *   • 570001 (Mysuru)    → matches Zone 2 and 4    → cheapest = 18,000 INR   ✓
 *   • 110001 (Delhi)     → matches Zone 4 only     → 45,000 INR              ✓ not free
 *
 * ── WHY TRANSIT TIME LIVES IN HERE AND HANDLING TIME LIVES IN BOTH PLACES ────────────────────
 * Google's product data spec exposes min/max_handling_time and min/max_transit_time BOTH as
 * sub-attributes of <g:shipping> AND (handling only) as top-level item attributes. The rule that
 * decides which to use is whether the value varies by shipping service:
 *
 *   • TRANSIT TIME VARIES BY ZONE (1–2 days locally, 5–10 days for the rest of India), so it can
 *     only be expressed per <g:shipping> entry. There is no top-level transit attribute that
 *     could carry four different windows. It is therefore emitted here, from the zone's own
 *     transitDaysMin/Max — the identical numbers deliveryEstimate() shows at checkout.
 *
 *   • HANDLING TIME IS UNIFORM — every SKU is manufactured in DISPATCH_WORKING_DAYS (7–15 working
 *     days) regardless of destination — so its canonical home is the top-level attribute, and
 *     buildItem() emits it there. We ALSO repeat it inside every <g:shipping> entry: when Google
 *     matches a feed-level shipping service it reads that service's handling sub-attributes, and
 *     omitting them there would let it fall back to the account-level shipping settings (default
 *     handling time: same/next day) and advertise a delivery date this factory cannot meet. The
 *     two values are produced from the same constant, so they cannot contradict each other.
 *
 * Both are counted by Google in business days, which is exactly what DISPATCH_WORKING_DAYS and the
 * zone transit windows already are — so the numbers pass through untouched, with no invented
 * calendar-day conversion.
 */
function shippingElements(): string {
  const out: string[] = [];

  for (const zone of SHIPPING_ZONES) {
    const element = (postalCode?: string) => `      <g:shipping>
        <g:country>IN</g:country>${postalCode ? `\n        <g:postal_code>${xmlEscape(postalCode)}</g:postal_code>` : ""}
        <g:service>${xmlEscape(zone.name)}</g:service>
        <g:price>${priceForFeed(zone.rate)} INR</g:price>
        <g:min_handling_time>${DISPATCH_WORKING_DAYS.min}</g:min_handling_time>
        <g:max_handling_time>${DISPATCH_WORKING_DAYS.max}</g:max_handling_time>
        <g:min_transit_time>${zone.transitDaysMin}</g:min_transit_time>
        <g:max_transit_time>${zone.transitDaysMax}</g:max_transit_time>
      </g:shipping>`;

    if (zone.pincodePrefixes.length === 0) {
      // The fallback zone: applies anywhere in India that no tighter prefix claims.
      out.push(element());
      continue;
    }
    for (const prefix of zone.pincodePrefixes) {
      out.push(element(`${prefix}*`));
    }
  }

  return out.join("\n");
}

/**
 * OPTIONAL Merchant Center attributes built ONLY from real, structured per-product data — never
 * invented, never promotional:
 *   • <g:product_detail>    — one (section, name, value) triple per row of the product's own
 *                             `specifications` table (Dimensions, Wall Panels, Flooring, Electrical,
 *                             Windows, Warranty, …). This is the exact spec grid the page renders.
 *   • <g:product_highlight> — the same specs phrased as short "Label: Value" highlights (Google caps
 *                             each at 150 chars). Drawn from `specifications`, NOT from `features`,
 *                             because features carry marketing tone ("handles monsoon heat well")
 *                             which Merchant Center disapproves in this field.
 * A product whose specifications table is empty simply gets neither block.
 */
/**
 * Spec labels that RESTATE a size, an area or a dimension.
 *
 * On a SIZE VARIANT these must never be submitted from the family's catalogue row, because
 * that row describes the family, not the size. Left in, a single item contradicts itself:
 * POC-CO-GEN submits <g:size>25 ft x 14 ft</g:size> while its catalogue spec table would add
 * "Sizes Available: 20ft x 8ft / 40ft x 8ft / Custom" and "Floor Area: 160-320+ sq ft" as
 * product_highlights — a size range and an area range beside one fixed size and one fixed
 * price. That self-contradiction is exactly the class of mismatch documented in
 * merchantFeedPolicy.ts as this SKU's original feed blocker.
 *
 * It also catches the unconfirmed height: "Dimensions: L 25 ft x W 14 ft x H 9 ft" would
 * publish a 9 ft height that nobody has verified (the family standard is 8 ft 6 in and is not
 * confirmed per size), as structured, machine-readable product data.
 *
 * The authoritative size for a variant is already submitted, in <g:size>, <g:variant_option>
 * and the title. Dropping these rows loses nothing and is FEED-ONLY: the landing page, the
 * gallery and the JSON-LD are untouched, exactly like the promotional and price-claim drops
 * above.
 */
const VARIANT_SIZE_SPEC_LABELS =
  /^(dimensions?|sizes?(\s+available)?|floor\s+area|total\s+area|built[-\s]?up\s+area|overall\s+size|carpet\s+area|capacity\s+range)\b/i;

function specAttributes(product: Product, variantHit?: VariantHit): string {
  const all = (product.specifications || [])
    .filter((s) => s.label?.trim() && s.value?.trim())
    .filter((s) => {
      if (!variantHit) return true;
      if (!VARIANT_SIZE_SPEC_LABELS.test(s.label.trim())) return true;
      console.warn(
        `[merchant-feed] ${variantHit.variant.sku}: dropped size-restating spec row "${s.label.trim()}: ${s.value.trim()}" — ` +
          `<g:size>${variantHit.variant.sizeLabelPlain}</g:size> is this item's authoritative size`,
      );
      return false;
    });

  /**
   * ── SPEC ROWS GET THE SAME GUARD AS THE DESCRIPTION ────────────────────────────────────────
   * `g:product_detail` and `g:product_highlight` are submitted product data, judged by exactly the
   * same rules as <g:description> — yet this function used to pass every spec row through
   * untouched while feedDescription() stripped promotional and price-claim sentences. A row such as
   * "Cost Savings: 20–40% lower than conventional RCC construction" therefore reached Google as a
   * highlight: a comparative pricing claim, which is the class of statement that contributed to
   * this account's suspension.
   *
   * Same policy as everywhere else in this file: DROP the offending row, never rewrite it. The
   * spec still appears on the landing page; it simply is not submitted. Both attributes are
   * optional, so dropping a row costs the item nothing.
   */
  const specs = all.filter((s) => {
    const text = `${s.label.trim()}: ${s.value.trim()}`;
    const promo = isPromotional(text);
    const price = priceClaimIn(text);
    if (promo || price) {
      console.warn(
        `[merchant-feed] dropped spec row from product data (${promo ? "promotional" : "price claim"}): "${text}"`,
      );
      return false;
    }
    return true;
  });

  if (specs.length === 0) return "";

  const details = specs
    .map(
      (s) => `      <g:product_detail>
        <g:section_name>Specifications</g:section_name>
        <g:attribute_name>${xmlEscape(trimToWordBoundary(s.label.trim(), 140))}</g:attribute_name>
        <g:attribute_value>${xmlEscape(trimToWordBoundary(s.value.trim(), 1000))}</g:attribute_value>
      </g:product_detail>`,
    )
    .join("\n");

  // Up to 6 highlights, each a factual "Label: Value" spec, deduped and length-capped.
  const highlights = specs
    .slice(0, 6)
    .map((s) => `      <g:product_highlight>${xmlEscape(trimToWordBoundary(`${s.label.trim()}: ${s.value.trim()}`, 150))}</g:product_highlight>`)
    .join("\n");

  return `${highlights}\n${details}\n`;
}

/**
 * One <item>.
 *
 * ── NO <g:mpn> AND NO <g:gtin>, DELIBERATELY ────────────────────────────────────────────────────
 * These cabins are made-to-order steel structures: there is no manufacturer part number and no
 * barcode. `<g:identifier_exists>no</g:identifier_exists>` is the correct, complete declaration of
 * that. The feed previously ALSO emitted `<g:mpn>{sku}</g:mpn>`, which contradicted it — our SKU is
 * an internal code, not a recognised MPN — and Google resolves such a contradiction by trusting the
 * supplied identifier and ignoring the flag, which weakens product matching and can raise an
 * "incorrect identifier" disapproval. One statement about identifiers, not two. Do not re-add an
 * identifier element unless a genuine GTIN/MPN exists, in which case identifier_exists must go.
 */
function buildItem(
  commerce: ProductCommerce,
  product: Product,
  images: string[],
  /**
   * Present when this SKU is one STANDARD SIZE of a product family (src/data/productFamilies.ts).
   *
   * ── WHY A VARIANT NEEDS ITS OWN GROUPING ATTRIBUTES ────────────────────────────────────────
   * Without them Google treats six sizes of one cabin as six unrelated products: it cannot show
   * a size picker, it can rank them against each other, and duplicate-content checks fire on six
   * near-identical titles. With `item_group_id` shared and `size` distinct, they become ONE
   * product offered in several sizes, which is what they are.
   *
   *   • <g:item_group_id>    — the family's stable productGroupId. IDENTICAL for every size.
   *   • <g:item_group_title> — the family's name, identical for every size.
   *   • <g:size> + <g:size_type>/<g:size_system> — the varying attribute itself.
   *   • <g:variant_option>   — the same dimension restated in Google's generic variant slot,
   *                            for feed formats that read it. Consistent with <g:size>.
   *
   * `<g:link>` is the variant's OWN canonical URL, never the parent's: a feed item whose landing
   * page shows a different size is a landing-page mismatch, which is a disapproval.
   */
  variantHit?: VariantHit,
): string {
  const [primaryImage, ...additionalImages] = images;

  /**
   * ── PRICE / SALE PRICE — GOOGLE'S CONVENTION, NOT INTUITION ─────────────────────────────────
   *   <g:price>      = the LIST price (the "was" price when a sale is running)
   *   <g:sale_price> = what the customer is charged RIGHT NOW
   *
   * So on sale, <g:price> rises to sellPrice(compareAtBasePrice) and <g:sale_price> carries
   * sellPrice(basePrice); off sale, <g:price> alone carries sellPrice(basePrice).
   *
   * THE INVARIANT, either way: the amount Google shows as payable — sale_price when present,
   * otherwise price — is ALWAYS sellPrice(basePrice), byte-identical to the landing page, to
   * offers.price in the JSON-LD and to what Razorpay charges. It reads from the same one number.
   *
   * hasGenuineSalePrice() is false for every SKU today (no compareAtBasePrice is set anywhere,
   * deliberately — a strikethrough that was never charged is a fake discount), so no item emits
   * <g:sale_price> yet. The path must still be right for the day one is set.
   */
  const onSale = hasGenuineSalePrice(commerce);
  const listBase = onSale ? (commerce.compareAtBasePrice as number) : commerce.basePrice;
  const listPrice = `${priceForFeed(sellPrice(listBase))} INR`;
  const salePrice = onSale ? `${priceForFeed(sellPrice(commerce.basePrice))} INR` : null;

  /* Must equal the page's rel=canonical exactly — clean URL, no `.html`. For a size variant
   * getProductDetailPath() already returns the NESTED canonical (/products/<family>/<size>),
   * because variantAsProduct() gives the synthesised product a `parentSlug` + `slug`. One
   * function, one URL form, so the feed link, the canonical tag, the JSON-LD offers.url and
   * the internal links cannot drift apart. */
  const link = `${SITE_URL}${getProductDetailPath(product)}`;

  const additional = additionalImages
    .slice(0, 10)
    .map((url) => `      <g:additional_image_link>${xmlEscape(url)}</g:additional_image_link>`)
    .join("\n");

  /* Variant grouping. Emitted ONLY for a size variant — a standalone product must never
   * carry an item_group_id, or Google groups it with nothing and shows a size picker of one. */
  const grouping = variantHit
    ? `      <g:item_group_id>${xmlEscape(variantHit.family.productGroupId)}</g:item_group_id>
      <g:item_group_title>${xmlEscape(variantHit.family.groupTitle)}</g:item_group_title>
      <g:size>${xmlEscape(variantHit.variant.sizeLabelPlain)}</g:size>
      <g:size_type>regular</g:size_type>
      <g:size_system>IN</g:size_system>
      <g:variant_option>Dimensions: ${xmlEscape(variantHit.variant.sizeLabelPlain)}</g:variant_option>
`
    : "";

  return `    <item>
      <g:id>${xmlEscape(commerce.sku)}</g:id>
      <g:title>${xmlEscape(feedTitle(commerce))}</g:title>
      <g:description>${xmlEscape(feedDescription(commerce, product))}</g:description>
      <g:link>${xmlEscape(link)}</g:link>
      <g:image_link>${xmlEscape(primaryImage)}</g:image_link>
${additional ? `${additional}\n` : ""}      <g:availability>${commerce.inStock ? "in_stock" : "out_of_stock"}</g:availability>
      <g:price>${listPrice}</g:price>
${salePrice ? `      <g:sale_price>${salePrice}</g:sale_price>\n` : ""}      <g:brand>${xmlEscape(BRAND)}</g:brand>
      <g:identifier_exists>no</g:identifier_exists>
      <g:condition>new</g:condition>
${grouping}      <g:product_type>${xmlEscape(commerce.productType)}</g:product_type>
      <g:google_product_category>${xmlEscape(commerce.googleProductCategory)}</g:google_product_category>
${specAttributes(product, variantHit)}      <g:min_handling_time>${DISPATCH_WORKING_DAYS.min}</g:min_handling_time>
      <g:max_handling_time>${DISPATCH_WORKING_DAYS.max}</g:max_handling_time>
${shippingElements()}
    </item>`;
}

/**
 * ── A FAMILY'S PARENT PAGE MAY ITSELF BE A PRICED SIZE ──────────────────────────────────────────
 * There is deliberately NO rule here that drops a family's parent SKU once its other sizes become
 * eligible.
 *
 * An earlier revision suppressed it, on the reasoning that a parent page is a ProductGroup overview
 * rather than an extra unit. That is true only when the parent page sells nothing of its own. It is
 * NOT true here: /products/container-office IS the 25 ft x 14 ft build (POC-CO-GEN), an
 * owner-verified configuration at a fixed ₹12,00,000 ex-GST that has been on sale for a long time.
 * Suppressing it would have deleted a real, approved, purchasable offer from the feed the moment an
 * unrelated size was priced — losing a live product, not preventing a duplicate.
 *
 * The duplicate that rule was guarding against cannot arise anyway, because a size is identified by
 * its `size` attribute and its own `link`: the parent carries <g:size>25 ft x 14 ft</g:size> and
 * links to its own self-canonical URL, exactly like every sibling. It is one size among several
 * under one item_group_id, which is precisely what Google's variant model expects.
 *
 * Whether the parent SKU is actually fed stays governed where it always has been — by
 * src/data/merchantFeedPolicy.ts.
 */

function generateFeed(): { xml: string; count: number } {
  const byId = new Map(products.map((p) => [p.id, p]));

  // A duplicate <g:id> fails the WHOLE feed, not just the offending item — so we guard rather
  // than trust. Same for a missing product or a product with no usable image (Merchant Center
  // requires image_link): skip the item and log loudly, never emit a broken one.
  const seenIds = new Set<string>();
  const items: string[] = [];

  for (const commerce of feedEligible()) {
    /* A size variant is not a row in `products` — it is synthesised from its family's parent
     * (see variantAsProduct). getProductById() resolves both, so one lookup covers both kinds,
     * and `variantHit` tells buildItem() whether to emit the grouping attributes. */
    const variantHit = getVariantById(commerce.id);
    const product = byId.get(commerce.id) ?? (variantHit ? getProductById(commerce.id) : undefined);
    if (!product) {
      console.error(`[merchant-feed] SKIP ${commerce.sku}: no product with id "${commerce.id}" in products.ts`);
      continue;
    }

    // A size the family data holds back (no confirmed price, no variant-accurate photo, or an
    // explicit merchantEligible:false) never reaches the feed, whatever its commerce row says.
    if (variantHit) {
      const hold = variantFeedHoldReason(variantHit.family, variantHit.variant);
      if (hold) {
        console.warn(`[merchant-feed] EXCLUDE ${commerce.sku} [size-variant]: ${hold}`);
        continue;
      }
    }
    if (seenIds.has(commerce.sku)) {
      console.error(`[merchant-feed] SKIP ${commerce.sku}: duplicate g:id — a duplicate id rejects the entire feed`);
      continue;
    }

    // STRICT ELIGIBILITY: the item must be genuinely buyable online RIGHT NOW — Add to Cart,
    // checkout and full Razorpay payment all hang off this same predicate, so one check covers
    // all three. feedEligible() applies the identical gates; this belt exists so the whitelist
    // survives even if the two functions ever drift apart.
    if (!isPurchasable(commerce.id)) {
      console.warn(`[merchant-feed] EXCLUDE ${commerce.sku}: not purchasable online (quote-only or price unconfirmed)`);
      continue;
    }

    // A title carrying any price signal ("starting from", "price on request", a ₹/lakh figure)
    // either contradicts <g:price> or marks the product as not fixed-price. Titles cannot be
    // sentence-trimmed, so the item is excluded until the title is fixed.
    const titleClaim = priceClaimIn(feedTitle(commerce));
    if (titleClaim) {
      console.error(`[merchant-feed] EXCLUDE ${commerce.sku}: title carries a price claim (${titleClaim})`);
      continue;
    }

    // FEED POLICY — purchasable on-site does not mean advertisable. A SKU held back by
    // merchantFeedPolicy.ts (no compliant image, not a Shopping product, city page, review
    // pending, or submitted manually) is skipped with its reason logged.
    const exclusion = feedExclusionFor(commerce.sku);
    if (exclusion) {
      console.warn(`[merchant-feed] EXCLUDE ${commerce.sku} [${exclusion.category}]: ${exclusion.reason}`);
      continue;
    }

    // A zero / negative / non-finite price is never a valid Shopping offer — guard rather than emit
    // a "0 INR" item. (feedEligible already requires priceConfirmed, so this only ever catches a
    // data-entry slip like basePrice: 0.)
    const payable = sellPrice(commerce.basePrice);
    if (!Number.isFinite(payable) || payable <= 0) {
      console.error(`[merchant-feed] SKIP ${commerce.sku}: price resolves to ${payable} — a zero/invalid price cannot be fed`);
      continue;
    }

    // The landing URL must be a real absolute https URL, or the item is rejected.
    const link = `${SITE_URL}${getProductDetailPath(product)}`;
    if (!/^https:\/\/[^\s]+$/.test(link)) {
      console.error(`[merchant-feed] SKIP ${commerce.sku}: invalid landing URL "${link}"`);
      continue;
    }

    let images = galleryImagesFor(product);
    // Drop any individually non-compliant image (baked-in text/logo). A surviving clean image keeps
    // its gallery order, so the first clean one becomes the primary automatically.
    const drops = feedImageDropsFor(commerce.sku);
    if (drops.length > 0) {
      images = images.filter((url) => !drops.some((frag) => url.includes(frag)));
    }
    if (images.length === 0) {
      console.warn(`[merchant-feed] EXCLUDE ${commerce.sku}: GMC image replacement required — no compliant image left after policy filtering`);
      continue;
    }

    // Swap every bundler-hashed URL for its stable public twin, then refuse to submit anything
    // still on /_next/ — a hash-rotating URL in the feed is a future "Unable to show image"
    // disapproval, and an absent image is strictly better than a breaking one.
    images = images.map(stabilizeImageUrl);
    const unstable = images.filter((u) => u.includes("/_next/"));
    if (unstable.length > 0) {
      console.warn(
        `[merchant-feed] ${commerce.sku}: dropped ${unstable.length} un-stabilised /_next/ image(s) — ` +
          `add optimised copies to public/images/products/ and list them in STABLE_IMAGE_BASENAMES`,
      );
      images = images.filter((u) => !u.includes("/_next/"));
    }
    if (images.length === 0) {
      console.warn(`[merchant-feed] EXCLUDE ${commerce.sku}: no stable image available`);
      continue;
    }

    seenIds.add(commerce.sku);
    items.push(buildItem(commerce, product, images, variantHit));
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Portable Office Cabin — Product Feed</title>
    <link>${SITE_URL}</link>
    <description>Portable cabins, container offices, site offices, security cabins and shipping containers manufactured by Portable Office Cabin. All prices are in INR and inclusive of 18% GST.</description>
${items.join("\n")}
  </channel>
</rss>`;

  return { xml, count: items.length };
}

/** Rebuilt at most once an hour; the catalog is a static file, so it never needs to be dynamic. */
export const revalidate = 3600;

export function GET(): Response {
  const { xml, count } = generateFeed();
  const eligible = feedEligible().length;
  const held = excludedSkus().length;
  console.log(
    `[merchant-feed] generated ${count} item(s) — ${eligible} purchasable SKU(s), ${held} held back by merchantFeedPolicy.ts`,
  );

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
