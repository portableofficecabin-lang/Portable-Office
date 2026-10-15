import type { Product } from "@/data/products";

/**
 * May /products/category/<slug> be indexed and listed in the sitemap?
 *
 * PROPOSED RULE, NOT WIRED IN (owner decision 2026-10-13). The seven empty categories keep their
 * current `index` status and sitemap entries until their Search Console performance has been
 * reviewed. Neither app/sitemap.ts nor the category page calls this function, and
 * scripts/category-landings.test.ts fails if either starts to before that decision. Wiring it in is
 * one filter in the sitemap plus `noindex: !isCategoryIndexable(...)` in generateMetadata.
 *
 * Only while the category actually holds a product. Seven static categories (labour-colony,
 * bunker-bed-container-cabin, peb-building, storage-shed, fabrication, upvc-windows-doors,
 * modular-furniture) had none and rendered "Showing 0–0 of 0 products" — an empty listing that
 * was nonetheless index,follow and submitted in the sitemap, i.e. a thin page offered to Google.
 *
 * The rule is computed, not a list, and it reverses itself: the moment a product is filed under
 * the category (statically or through the admin panel), the page is indexable again and returns
 * to the sitemap on the next revalidation. The page itself stays live and `follow` is kept, so
 * its links still pass through. Nothing is deleted or redirected.
 *
 * Callers must pass the MERGED catalogue (getAllProductsMerged) — the same list the category
 * page renders — so the robots tag and the sitemap can never disagree with the visible grid.
 */
export function isCategoryIndexable(slug: string, products: Product[]): boolean {
  return products.some((p) => p.categorySlug === slug);
}
