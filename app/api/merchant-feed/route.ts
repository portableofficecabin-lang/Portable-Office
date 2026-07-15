import { products, getProductDetailPath, type Product } from "@/data/products";
import { feedEligible, hasGenuineSalePrice, BRAND, type ProductCommerce } from "@/data/productCommerce";
import { sellPrice, priceForFeed } from "@/lib/pricing/gst";
import { SHIPPING_ZONES, DISPATCH_WORKING_DAYS } from "@/data/shippingZones";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import { getBestProductImage } from "@/data/productImages";

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
 * ── GMC IMAGE POLICY ────────────────────────────────────────────────────────────────────────────
 * Result of a visual inspection of EVERY image this feed submits (rendered from the live server and
 * eyeballed one by one, 2026-07). Google disapproves a product image that carries baked-in
 * promotional / brand TEXT or a logo over the product — watermarks, added banners, "SITE OFFICE",
 * "MODU-L", etc. (Real, incidental container ID markings on a genuine container photo are NOT a
 * violation and are left alone; CSS "Featured" badges are not in the image file and never reach
 * Google.)
 *
 * Two levers, both feed-only — NOTHING here touches the product pages, the gallery, the JSON-LD or
 * the on-disk image files:
 *   • `drop`        — remove specific NON-COMPLIANT images (matched by filename fragment) from BOTH
 *                     the primary and the additional slots. If a CLEAN image remains it becomes the
 *                     primary automatically (galleryImagesFor preserves order), which is exactly the
 *                     "use the clean gallery image as the Merchant image" rule.
 *   • `blockReason` — the product has NO clean image at all, so it is TEMPORARILY EXCLUDED from the
 *                     feed with this reason logged. The page stays live and indexable; only the
 *                     Shopping offer pauses until clean photography is supplied. Delete the entry to
 *                     re-enable once a compliant image exists.
 */
const FEED_IMAGE_POLICY: Record<string, { drop?: string[]; blockReason?: string }> = {
  // 4 of 5 exterior shots carry a baked-in "MS PORTABLE CABIN" signboard; the interior is clean and
  // survives as the sole feed image.
  "POC-PC-MSPC": {
    drop: [
      "ms-portable-cabin-front",
      "ms-portable-cabin-side",
      "ms-portable-cabin-back",
      "ms-portable-cabin-angle",
    ],
  },
  // Sole image has "SITE OFFICE" text baked onto the cabin — no clean alternative in the gallery.
  "POC-SOC-CSPO": { blockReason: "GMC image replacement required — only image has 'SITE OFFICE' text baked in" },
  // Sole image carries an embedded 'MST' brand logo on the cabin — no clean alternative.
  "POC-CO-MSCO": { blockReason: "GMC image replacement required — only image has an embedded 'MST' logo" },
  // Sole image has 'SECURITY' text + a small logo baked on the guard cabin — no clean alternative.
  "POC-SC-SECAB": { blockReason: "GMC image replacement required — only image has 'SECURITY' text + a logo baked in" },
  // All five gallery images carry a baked-in 'MODU-L' / 'UNIT 0x' brand wordmark — no clean image.
  "POC-VIP-40": { blockReason: "GMC image replacement required — every gallery image carries a 'MODU-L' brand wordmark" },
};

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
    const kept = sentences.filter((sentence) => !isPromotional(sentence));
    if (kept.length < sentences.length) {
      console.warn(
        `[merchant-feed] ${commerce.sku}: dropped ${sentences.length - kept.length} promotional sentence(s) from the description`,
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
function specAttributes(product: Product): string {
  const specs = (product.specifications || []).filter((s) => s.label?.trim() && s.value?.trim());
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

function buildItem(commerce: ProductCommerce, product: Product, images: string[]): string {
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

  // Must equal the page's rel=canonical exactly — clean URL, no `.html`.
  const link = `${SITE_URL}${getProductDetailPath(product)}`;

  const additional = additionalImages
    .slice(0, 10)
    .map((url) => `      <g:additional_image_link>${xmlEscape(url)}</g:additional_image_link>`)
    .join("\n");

  return `    <item>
      <g:id>${xmlEscape(commerce.sku)}</g:id>
      <g:title>${xmlEscape(feedTitle(commerce))}</g:title>
      <g:description>${xmlEscape(feedDescription(commerce, product))}</g:description>
      <g:link>${xmlEscape(link)}</g:link>
      <g:image_link>${xmlEscape(primaryImage)}</g:image_link>
${additional ? `${additional}\n` : ""}      <g:availability>${commerce.inStock ? "in_stock" : "out_of_stock"}</g:availability>
      <g:price>${listPrice}</g:price>
${salePrice ? `      <g:sale_price>${salePrice}</g:sale_price>\n` : ""}      <g:brand>${xmlEscape(BRAND)}</g:brand>
      <g:mpn>${xmlEscape(commerce.sku)}</g:mpn>
      <g:identifier_exists>no</g:identifier_exists>
      <g:condition>new</g:condition>
      <g:product_type>${xmlEscape(commerce.productType)}</g:product_type>
      <g:google_product_category>${xmlEscape(commerce.googleProductCategory)}</g:google_product_category>
${specAttributes(product)}      <g:min_handling_time>${DISPATCH_WORKING_DAYS.min}</g:min_handling_time>
      <g:max_handling_time>${DISPATCH_WORKING_DAYS.max}</g:max_handling_time>
${shippingElements()}
    </item>`;
}

function generateFeed(): { xml: string; count: number } {
  const byId = new Map(products.map((p) => [p.id, p]));

  // A duplicate <g:id> fails the WHOLE feed, not just the offending item — so we guard rather
  // than trust. Same for a missing product or a product with no usable image (Merchant Center
  // requires image_link): skip the item and log loudly, never emit a broken one.
  const seenIds = new Set<string>();
  const items: string[] = [];

  for (const commerce of feedEligible()) {
    const product = byId.get(commerce.id);
    if (!product) {
      console.error(`[merchant-feed] SKIP ${commerce.sku}: no product with id "${commerce.id}" in products.ts`);
      continue;
    }
    if (seenIds.has(commerce.sku)) {
      console.error(`[merchant-feed] SKIP ${commerce.sku}: duplicate g:id — a duplicate id rejects the entire feed`);
      continue;
    }

    // GMC IMAGE POLICY — a product with no clean image is excluded outright (see FEED_IMAGE_POLICY).
    const policy = FEED_IMAGE_POLICY[commerce.sku];
    if (policy?.blockReason) {
      console.warn(`[merchant-feed] EXCLUDE ${commerce.sku}: ${policy.blockReason}`);
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
    if (policy?.drop?.length) {
      images = images.filter((url) => !policy.drop!.some((frag) => url.includes(frag)));
    }
    if (images.length === 0) {
      console.warn(`[merchant-feed] EXCLUDE ${commerce.sku}: GMC image replacement required — no compliant image left after policy filtering`);
      continue;
    }
    seenIds.add(commerce.sku);
    items.push(buildItem(commerce, product, images));
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
  console.log(`[merchant-feed] generated ${count} item(s)`);

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
