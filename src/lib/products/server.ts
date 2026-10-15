import { cache } from "react";
import { createStaticClient } from "@/lib/supabase/static";
import type { DBCategory } from "@/types/database";
import {
  categories as staticCategories,
  getProductBySlug,
  getProductSlug,
  type Product,
  type Category,
} from "@/data/products";
import { fetchProductReviewData, type ProductReviewData } from "@/lib/reviews/data";
import { EMPTY_RATING_SUMMARY } from "@/lib/reviews/summary";
import { convertDBCategory, mergeCategories } from "@/lib/products/merge";
import { loadAllProductsMerged } from "@/lib/products/catalogue";

// Server-side product/category/review data, fetched at build / ISR-revalidate time
// via the anon (cookie-less) Supabase client. Every query falls back to the static
// catalog on error so ISR regeneration can never fail if Supabase is unreachable.

const normalizeSlug = (slug: string) => slug.replace(/\.html$/i, "");

/** Full merged catalog (DB overrides static by slug; static fills the gaps).
 *  Wrapped in React cache() so the many call sites within a single ISR render
 *  (page body + getProductBySlugMerged + getMergedCategories) share ONE Supabase
 *  query instead of issuing 2-3 identical `select * from products` round-trips.
 *  The loader itself lives in catalogue.ts (unchanged), so code that runs outside the
 *  Next.js runtime — the sitemap under the variants test — can use it without cache(). */
export const getAllProductsMerged = cache(loadAllProductsMerged);

/** Merged categories with product counts derived from the merged catalog.
 *  cache()-wrapped so list/category pages don't re-fetch the catalog/categories. */
export const getMergedCategories = cache(async (allProducts?: Product[]): Promise<Category[]> => {
  const products = allProducts ?? (await getAllProductsMerged());
  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    const converted = (data && data.length > 0)
      ? (data as DBCategory[]).map((c) =>
          convertDBCategory(c, products.filter((p) => p.categorySlug === c.slug).length),
        )
      : [];
    return mergeCategories(converted, staticCategories, products);
  } catch (err) {
    console.error("getMergedCategories: falling back to static categories:", err);
    return mergeCategories([], staticCategories, products);
  }
});

/** Resolve a single product by slug (or id), DB-first, static fallback. */
export async function getProductBySlugMerged(slug: string): Promise<Product | undefined> {
  const normalized = normalizeSlug(slug);
  const all = await getAllProductsMerged();
  return (
    all.find((p) => getProductSlug(p) === normalized || p.id === normalized) ??
    getProductBySlug(normalized)
  );
}

/** All products in a category (merged). */
export async function getProductsByCategory(categorySlug: string): Promise<Product[]> {
  const all = await getAllProductsMerged();
  return all.filter((p) => p.categorySlug === categorySlug);
}

/** Approved reviews for a product slug + the authoritative rating aggregate (count +
 *  average over ALL approved reviews, not just the returned page). The same query is
 *  re-run live in the browser, so the server HTML, JSON-LD and client stay consistent.
 *  The slug value (incl. any ".html") must match how rows were stored. */
export async function getProductReviewData(productSlug: string): Promise<ProductReviewData> {
  try {
    return await fetchProductReviewData(createStaticClient(), productSlug);
  } catch (err) {
    console.error("getProductReviewData: returning empty reviews:", err);
    return { reviews: [], summary: EMPTY_RATING_SUMMARY };
  }
}
