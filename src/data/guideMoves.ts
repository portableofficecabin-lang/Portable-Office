/**
 * GUIDE MOVES (D5, 2026-11) — informational portable-cabin guides move out of the product tree
 * to /guides/<slug>.
 *
 * WHY: /products/** is the buying path (category → product → size). Eight of the eleven
 * portable-cabin child pages answer an INFORMATIONAL question (what does it cost, how big, how is
 * it installed, how long does it last …); under /products they sit beside the product pages that
 * own the commercial queries, and the hub /products/portable-cabin links them as if they were
 * models. A /guides section separates "learn" from "buy" in the URL, the breadcrumb and the
 * sitemap. The three children with commercial intent — a configuration (with toilet & pantry), a
 * use case (schools & classrooms) and a product type (insulated cabins) — stay under
 * /products/portable-cabin. Agreed with the site-wide SEO session (df) 2026-11-26.
 *
 * WHAT DOES NOT CHANGE: each guide's title, H1, copy, FAQs and price table (src/data/
 * productChildPages.ts stays the content registry — the entries are not edited here).
 *
 * The new slug carries the parent ("portable-cabin-…") because /guides is not nested under the
 * product, so the URL must still say what the guide is about.
 *
 * Used by: productChildPages.ts (paths + params), app/(site)/guides/** (pages), app/sitemap.ts,
 * next.config.ts (one-hop 301s, checked by src/data/guideMoves.test.ts).
 */

export interface GuideMove {
  parentSlug: string;
  /** The child's slug in the registry (and its old URL segment under /products/<parent>/). */
  childSlug: string;
  /** New URL segment: /guides/<guideSlug>. */
  guideSlug: string;
}

export const GUIDES_PATH = "/guides";

export const GUIDE_MOVES: readonly GuideMove[] = [
  { parentSlug: "portable-cabin", childSlug: "price-and-cost-guide", guideSlug: "portable-cabin-price-and-cost" },
  { parentSlug: "portable-cabin", childSlug: "sizes-and-dimensions", guideSlug: "portable-cabin-sizes-and-dimensions" },
  { parentSlug: "portable-cabin", childSlug: "materials-ms-vs-puf", guideSlug: "portable-cabin-materials-ms-vs-puf" },
  { parentSlug: "portable-cabin", childSlug: "installation-and-site-preparation", guideSlug: "portable-cabin-installation-and-site-preparation" },
  { parentSlug: "portable-cabin", childSlug: "maintenance-and-lifespan", guideSlug: "portable-cabin-maintenance-and-lifespan" },
  { parentSlug: "portable-cabin", childSlug: "transport-and-delivery", guideSlug: "portable-cabin-transport-and-delivery" },
  { parentSlug: "portable-cabin", childSlug: "layouts-and-interiors", guideSlug: "portable-cabin-layouts-and-interiors" },
  { parentSlug: "portable-cabin", childSlug: "buying-guide-new-vs-used", guideSlug: "portable-cabin-new-vs-used" },
];

/** The /guides slug of a registry child, or undefined when the child stays under /products. */
export function movedGuideSlug(parentSlug: string, childSlug: string): string | undefined {
  return GUIDE_MOVES.find((m) => m.parentSlug === parentSlug && m.childSlug === childSlug)?.guideSlug;
}
