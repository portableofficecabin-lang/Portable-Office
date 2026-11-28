/**
 * PRODUCT URL RENAMES (D4, 2026-11) — the six fixed-price shipping-container SKUs that carried a
 * PLACE in their URL although each sells one container GRADE.
 *
 * WHY: the slug named a place (Chennai, Krishnagiri, SIPCOT, Peenya, Narsapura, "Kormangala" —
 * misspelt) while the page's H1, title and offer are a grade ("Used 20 ft Shipping Container
 * (Cargo-Worthy)"). Place keywords belong to the city/promotion pages (owner rule: one product ×
 * place intent per page); /products/shipping-container-in-chennai competed with
 * /promotions/shipping-container-in-chennai for "shipping container Chennai". The new slug is the
 * page's own H1, so URL, H1, <title> and JSON-LD name agree. Product 33's H1 carries no grade word,
 * so its slug is the plain H1 — no grade is invented.
 *
 * WHAT DOES NOT CHANGE: the static id and SKU (the commerce identity — cart, checkout, Razorpay
 * order lines and order history key on product_id / product_sku, never on a slug), the price,
 * the page content, and Merchant feed membership (none of the six is in the feed;
 * merchantFeedPolicy.ts).
 *
 * WHERE THIS LIST IS USED
 *   • next.config.ts — one-hop 301s from the old URL AND its .html form, listed before the
 *     generic `/products/:slug.html` rule (src/data/productSlugRenames.test.ts reads the config
 *     source and checks every pair, as scripts/product-variants.test.ts does for size variants);
 *   • app/product/[...slug]/route.ts — the legacy /product/<old> form goes straight to the new URL;
 *   • src/lib/reviews/data.ts — reviews stored under an old slug keep showing on the renamed page;
 *   • supabase/migrations/20261126120000_product_slug_renames.sql — the same six pairs, so the
 *     database can read old slugs too (product_slug_aliases) and admin rows follow the rename.
 */

export interface ProductSlugRename {
  /** Static catalogue id — unchanged by the rename. */
  id: string;
  /** SKU — unchanged by the rename. */
  sku: string;
  from: string;
  to: string;
}

export const PRODUCT_SLUG_RENAMES: readonly ProductSlugRename[] = [
  { id: "29", sku: "POC-SC-KRMG", from: "shipping-container-in-kormangala", to: "used-20ft-shipping-container-as-is-grade" },
  { id: "30", sku: "POC-SC-KRSH", from: "shipping-container-in-krishnagiri", to: "refurbished-20ft-shipping-container-premium" },
  { id: "31", sku: "POC-SC-SIPCOT", from: "shipping-container-in-sipcot", to: "refurbished-20ft-shipping-container-industrial" },
  { id: "32", sku: "POC-SC-CHN", from: "shipping-container-in-chennai", to: "used-20ft-shipping-container-wind-water-tight" },
  { id: "33", sku: "POC-SC-NRSP", from: "shipping-container-in-narsapura-industrial", to: "refurbished-20ft-shipping-container" },
  { id: "34", sku: "POC-SC-PNYA", from: "shipping-container-in-peenya-industrial", to: "used-20ft-shipping-container-cargo-worthy" },
];

const BY_FROM = new Map(PRODUCT_SLUG_RENAMES.map((r) => [r.from, r]));

/** The new slug for a retired product slug, or undefined. */
export function renamedProductSlug(oldSlug: string): string | undefined {
  return BY_FROM.get(oldSlug)?.to;
}

/** Every earlier slug of a product's CURRENT slug (data stored under them still belongs to it). */
export function earlierProductSlugs(currentSlug: string): string[] {
  return PRODUCT_SLUG_RENAMES.filter((r) => r.to === currentSlug).map((r) => r.from);
}
