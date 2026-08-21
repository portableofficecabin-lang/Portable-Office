/**
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 *  MERCHANT CENTER FEED POLICY — which purchasable SKUs may be ADVERTISED, and with which images.
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 *
 * TWO DIFFERENT QUESTIONS, DELIBERATELY KEPT APART:
 *
 *   1. "Can a customer buy this online?"      → `isPurchasable()` / `feedEligible()` in
 *                                               productCommerce.ts. Commerce identity, price and
 *                                               stock. NOTHING in this file affects that.
 *   2. "May we submit it to Google Shopping?" → THIS FILE.
 *
 * Since the Aug 2026 sitewide "Buy Now" decision every SKU answers YES to (1) — all 41 are
 * purchasable on-site. Being purchasable does NOT make a product advertisable: Google judges the
 * IMAGE, the landing copy and whether the offer is one exact, deliverable, fixed-price
 * configuration. This account has already been suspended once for misrepresentation, so the feed
 * carries exactly the item set that was reviewed and approved, and a SKU joins it only after its
 * own review passes.
 *
 * THE ONLY WAY A SKU LEAVES THE FEED IS AN ENTRY BELOW. The feed route contains no product list
 * and no per-SKU branching — it iterates `feedEligible()` and consults this policy. Add a product
 * to the catalog and it is fed automatically; add it here and it is held back, with the reason
 * printed in the build log.
 *
 * TO FEED A HELD-BACK SKU: delete its entry. Before doing so, confirm all four:
 *   • one exact deliverable configuration at one fixed GST-inclusive price;
 *   • a clean product photo — no baked-in text, banner, watermark or brand wordmark over the unit;
 *   • landing copy carrying no second price signal (no "starting from", no ₹ figure in prose);
 *   • `node scripts/merchant-url-audit.mjs` passes for its URL.
 */

/** Why a purchasable SKU is nevertheless held out of the Shopping feed. */
export type FeedExclusionCategory =
  /** The only available photo carries baked-in text, a logo or a watermark over the product. */
  | "image-policy"
  /** Not a Shopping product at all: a rental, or an informational / guide page. */
  | "not-a-product"
  /** A city / location landing page — the same unit sold from a second URL. */
  | "city-page"
  /** Purchasable on-site, but the per-SKU spec + image review has not been done yet. */
  | "pending-review"
  /** Deliberately submitted to Merchant Center by hand; feeding it too would duplicate the offer. */
  | "manual-submission";

export interface FeedExclusion {
  category: FeedExclusionCategory;
  /** Printed in the build log when the SKU is skipped. Say what must change to lift it. */
  reason: string;
}

/**
 * ── THE EXCLUSION LIST ────────────────────────────────────────────────────────────────────────
 * One entry per held-back SKU. Grouped by category purely for reading; order is irrelevant.
 */
export const FEED_EXCLUSIONS: Readonly<Record<string, FeedExclusion>> = {
  /* ── Image policy: no compliant photograph exists yet ────────────────────────────────────────
   * Verified by eye against the live server, 2026-07. Google disapproves a product image carrying
   * promotional or brand TEXT over the product. (Genuine, incidental container ID markings on a
   * real container photo are NOT a violation and are left alone.) The page stays live and
   * indexable throughout — only the Shopping offer pauses until clean photography is supplied. */
  "POC-SOC-CSPO": {
    category: "image-policy",
    reason: "only image has 'SITE OFFICE' text baked in — supply a clean photo",
  },
  "POC-CO-MSCO": {
    category: "image-policy",
    reason: "only image has an embedded 'MST' logo — supply a clean photo",
  },
  "POC-SC-SECAB": {
    category: "image-policy",
    reason: "only image has 'SECURITY' text + a logo baked in — supply a clean photo",
  },
  "POC-VIP-40": {
    category: "image-policy",
    reason: "every gallery image carries a 'MODU-L' brand wordmark — supply a clean photo",
  },

  /* ── Not a Shopping product ──────────────────────────────────────────────────────────────── */
  "POC-SC-RENT": {
    category: "not-a-product",
    reason: "monthly rental charged as a one-time booking on-site — a recurring charge is never a GMC product offer",
  },
  "POC-CC-GUIDE": {
    category: "not-a-product",
    reason: "informational guide page, not a single purchasable unit",
  },
  "POC-CSC-GUIDE": {
    category: "not-a-product",
    reason: "informational guide page, not a single purchasable unit",
  },

  /* ── City / location landing pages ───────────────────────────────────────────────────────────
   * Each sells the same container from a location-specific URL. Feeding them would submit the
   * same unit several times over; one exact unit/config must be defined per page first. */
  "POC-SC-KRMG": { category: "city-page", reason: "city landing page — define one exact unit/config before feeding" },
  "POC-SC-KRSH": { category: "city-page", reason: "city landing page — define one exact unit/config before feeding" },
  "POC-SC-SIPCOT": { category: "city-page", reason: "city landing page — define one exact unit/config before feeding" },
  "POC-SC-CHN": { category: "city-page", reason: "city landing page — define one exact unit/config before feeding" },
  "POC-SC-NRSP": { category: "city-page", reason: "city landing page — define one exact unit/config before feeding" },
  "POC-SC-PNYA": { category: "city-page", reason: "city landing page — define one exact unit/config before feeding" },

  /* ── Awaiting the per-SKU spec + image review (Aug 2026 Buy Now batch) ────────────────────────
   * RELEASED 2026-08-18 after review, at the owner's confirmed fixed GST-inclusive prices (each
   * verified to equal sellPrice(basePrice) exactly, so no price data changed):
   *   POC-SC-CARGO  POC-SOC-MFR   POC-CO-GEN ₹14,16,000   POC-PH-2BHK ₹21,24,000
   *   POC-WA-G1 ₹23,60,000        POC-PH-3LUX ₹42,48,000
   *   POC-MO-CNTR ₹84,00,000 (with an image drop, below)  POC-PMO-165 ₹1,16,00,000
   * Each was checked for: a clean primary photo, a title and description free of any price claim,
   * and a feed image URL that is stable (a public path, not a bundler-hashed asset). */
  /* POC-CO-GEN — RE-HELD 2026-08-18 after image confirmation.
   * The five renders are clean (no baked-in text, logo or watermark) but they do not depict the
   * product as listed: all five show one dark timber/composite-clad module with a fully glazed
   * front, standing on paving in a landscaped garden. The listing sells a "Container Office
   * 25ft x 14ft HIGH-TENSILE MS STEEL for Project Sites". Cladding material and setting both
   * contradict the copy, and Google judges the image against the landing page, not only against
   * its own image rules. Release once a render of the actual MS steel unit is supplied. */
  "POC-CO-GEN": {
    category: "image-policy",
    reason:
      "ONE issue remaining (was two). RESOLVED 2026-08-21: the owner confirmed this SKU is the "
      + "25 ft x 14 ft configuration, and it is now catalogued as that size of the Container Office "
      + "Cabin family (src/data/productFamilies.ts). Its commerce record states 'Size: 25 ft x 14 ft' "
      + "with no range and no unconfirmed height, so the old 'the spec table offers a RANGE' blocker "
      + "is gone. STILL BLOCKING: the images are clean but not product-accurate — all five show a "
      + "timber/composite-clad garden module, while the listing sells a high-tensile MS steel "
      + "container office for project sites. Fix: supply a photograph or render of the actual MS "
      + "steel unit and delete this entry. NOTE public/images/products/container-office-1..5.webp "
      + "are owner-supplied, watermark-free steel container-office renders that look like the right "
      + "subject — they are NOT wired in yet because it has not been confirmed which size (if any) "
      + "they depict. Two catalogue rows in products.ts also still carry the old ranges "
      + "('Sizes Available: 20ft x 8ft / 40ft x 8ft / Custom', 'Floor Area: 160-320+ sq ft') and "
      + "one unconfirmed 'H 9 ft'; those are owner copy and need the owner's decision.",
  },

  /* POC-WA-G1 — HELD 2026-08-18 on the fixed-configuration audit, not on images (its render is
   * clean and representative). The listing does not describe one deliverable thing: "Configuration:
   * Single-storey & G+1 double-storey modular blocks" and "Capacity Range: 50-500+ workers per
   * colony", with no built-up area or overall dimension anywhere. One fixed price of ₹23,60,000
   * cannot honestly cover a 50-worker single-storey block AND a 500-worker G+1 camp. Compare
   * POC-LC-PREFAB, which solves exactly this by naming a "Priced Configuration" row; do the same
   * here and it can be released. */
  "POC-WA-G1": {
    category: "pending-review",
    reason:
      "no single priced configuration — spec table offers single-storey OR G+1 for 50 to 500+ "
      + "workers with no built-up area. State one priced configuration (as POC-LC-PREFAB does) "
      + "before feeding a fixed price.",
  },

  /* ── Submitted to Merchant Center manually by the owner ──────────────────────────────────── */
  "POC-CSO-4010": {
    category: "manual-submission",
    reason:
      "owner submits this SKU to Merchant Center by hand — feeding it would create a duplicate offer. "
      + "UNVERIFIED: whether the manual item is currently ACTIVE in Merchant Center cannot be checked "
      + "from this codebase. If it has lapsed, the product is in NEITHER the feed nor the account — "
      + "confirm in Merchant Center, and if it is gone, delete this entry to feed it automatically.",
  },
};

/**
 * ── PER-IMAGE DROPS (the product is still fed) ────────────────────────────────────────────────
 * When only SOME of a product's photos carry baked-in text, the offending files are removed from
 * the feed and the remaining clean ones are submitted. Gallery order is preserved, so the first
 * surviving clean image automatically becomes the primary `g:image_link`.
 *
 * Matched by FILENAME FRAGMENT against the resolved image URL. Feed-only: the product page, the
 * gallery, the JSON-LD and the files on disk are all untouched.
 */
export const FEED_IMAGE_DROPS: Readonly<Record<string, readonly string[]>> = {
  // 4 of 5 exterior shots carry a baked-in "MS PORTABLE CABIN" signboard; the interior is clean
  // and survives as the sole feed image.
  "POC-PC-MSPC": [
    "ms-portable-cabin-front",
    "ms-portable-cabin-side",
    "ms-portable-cabin-back",
    "ms-portable-cabin-angle",
  ],
  /* Reviewed 2026-08-18, all 8 images by eye. Two render a fictitious tenant's brand onto the
   * facade — "NORTHLINE / MARKETING · STRATEGY · BRAND" — which is both a baked-in wordmark and a
   * third party's name on our product. The other six (double-storey, elevation, interior,
   * gallery-hall, lounge-view, mezzanine) are clean, so dropping these two leaves a full gallery
   * and promotes the clean double-storey exterior to the primary image automatically. */
  "POC-MO-CNTR": [
    "marketing-office-main",
    "marketing-office-front-branded",
  ],
};

/** The exclusion for a SKU, or undefined when it may be fed. */
export function feedExclusionFor(sku: string): FeedExclusion | undefined {
  return FEED_EXCLUSIONS[sku];
}

/** Filename fragments to strip from this SKU's feed images. Empty when there are none. */
export function feedImageDropsFor(sku: string): readonly string[] {
  return FEED_IMAGE_DROPS[sku] ?? [];
}

/** Every held-back SKU, for audit scripts and the feed's own summary log. */
export function excludedSkus(): string[] {
  return Object.keys(FEED_EXCLUSIONS);
}
