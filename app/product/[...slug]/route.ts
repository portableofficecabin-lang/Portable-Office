import { NextResponse } from "next/server";
import { products, categories, getProductDetailPath, getProductSlug } from "@/data/products";

/**
 * ── LEGACY WORDPRESS PRODUCT URLS → 301 ───────────────────────────────────────────────────────
 * The old WordPress site served products at /product/<slug>. Those URLs are still indexed and
 * still linked from Merchant Center history; letting them 404 both leaks crawl equity and leaves
 * Google holding dead landing pages against the account.
 *
 * Each request is redirected to the CLOSEST matching live /products/[slug] page:
 *   1. exact slug match (most WP slugs were the product name slugified — same rule we use);
 *   2. token-overlap best match against every product's slug + name (so
 *      /product/porta-cabin-office-40ft still lands on the Porta Cabin page);
 *   3. a matching CATEGORY when the tokens fit a category better than any single product;
 *   4. otherwise the /products listing — never the homepage, and never a 404 after a 301.
 *
 * Always HTTP 301 (permanent): these URLs are gone for good, and 301 is what transfers the
 * indexed signal to the new page.
 */

const norm = (s: string): string =>
  s
    .toLowerCase()
    .replace(/\.html?$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const tokens = (s: string): Set<string> =>
  new Set(norm(s).split("-").filter((t) => t.length > 2 && !["the", "and", "for", "with"].includes(t)));

/** Jaccard-ish overlap score between a requested slug and a candidate string. */
function overlap(request: Set<string>, candidate: string): number {
  const c = tokens(candidate);
  if (c.size === 0 || request.size === 0) return 0;
  let hit = 0;
  for (const t of request) if (c.has(t)) hit++;
  return hit / Math.max(request.size, c.size);
}

function bestDestination(rawSlug: string): string {
  const wanted = norm(rawSlug);

  // 1. Exact live slug — the common case for a same-name migration.
  const exact = products.find((p) => getProductSlug(p) === wanted);
  if (exact) return getProductDetailPath(exact);

  // 2. Best token-overlap product. The 0.34 floor keeps genuinely unrelated slugs (an old blog
  //    permalink, a spam probe) from being "matched" onto an arbitrary product.
  const req = tokens(wanted);
  let best: { path: string; score: number } | null = null;
  for (const p of products) {
    const score = Math.max(overlap(req, getProductSlug(p)), overlap(req, p.name));
    if (!best || score > best.score) best = { path: getProductDetailPath(p), score };
  }
  if (best && best.score >= 0.34) return best.path;

  // 3. A category match beats dumping on the listing.
  let bestCat: { path: string; score: number } | null = null;
  for (const c of categories) {
    const score = Math.max(overlap(req, c.slug), overlap(req, c.name));
    if (!bestCat || score > bestCat.score) bestCat = { path: `/products/category/${c.slug}`, score };
  }
  if (bestCat && bestCat.score >= 0.34) return bestCat.path;

  // 4. The full product listing — related content, never the homepage.
  return "/products";
}

export function GET(request: Request, { params }: { params: { slug: string[] } }): Response {
  const raw = (params.slug ?? []).join("-");
  const destination = new URL(bestDestination(raw), "https://portableofficecabin.com");
  return NextResponse.redirect(destination, 301);
}
