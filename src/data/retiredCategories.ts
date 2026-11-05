/**
 * RETIRED CATEGORY SLUGS — leftover rows in the admin `categories` table that duplicate a catalogue
 * category and hold no products of their own.
 *
 * Verified 2026-11-04 on production (build 1136067):
 *   /products/category/portable-toilets  → "Showing 0–0 of 0 products"; duplicates portable-toilet-cabins
 *   /products/category/site-offices      → "Showing 0–0 of 0 products"; duplicates site-office-containers
 * Both were indexable, self-canonical and linked from the /products and category-page grids, so they
 * read as empty "soft 404" pages that competed with the real categories.
 *
 * The database rows are NOT deleted or renamed (owner rule: no database changes without approval;
 * src/lib/products/merge.ts, which merges them in, is a protected file and is unchanged). Instead:
 *   • next.config.ts 301s each retired slug to its catalogue category, before routing;
 *   • withoutRetiredCategories() keeps them out of the category lists the site renders, so no
 *     internal link points at a redirect.
 * src/data/retiredCategories.test.ts keeps the two in step and fails on a chain or a loop.
 *
 * This is not the general empty-category rule (owner decision 2026-10-13: empty catalogue categories
 * keep their index status). It covers only these duplicate database-only slugs, on the owner's
 * instruction of 2026-11-04.
 */
export const RETIRED_CATEGORY_REDIRECTS: Readonly<Record<string, string>> = {
  "portable-toilets": "portable-toilet-cabins",
  "site-offices": "site-office-containers",
};

/** The category list without the retired database-only duplicates (order preserved). */
export function withoutRetiredCategories<T extends { slug: string }>(categories: T[]): T[] {
  return categories.filter((c) => !Object.hasOwn(RETIRED_CATEGORY_REDIRECTS, c.slug));
}
