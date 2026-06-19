import { createStaticClient } from "@/lib/supabase/static";
import type { DBProduct, DBCategory } from "@/types/database";
import {
  products as staticProducts,
  categories as staticCategories,
  getProductBySlug,
  getProductSlug,
  type Product,
  type Category,
} from "@/data/products";
import type { ProductReview } from "@/components/products/ProductReviews";
import { convertDBProduct, convertDBCategory, mergeProducts, mergeCategories } from "@/lib/products/merge";

// Server-side product/category/review data, fetched at build / ISR-revalidate time
// via the anon (cookie-less) Supabase client. Every query falls back to the static
// catalog on error so ISR regeneration can never fail if Supabase is unreachable.

const normalizeSlug = (slug: string) => slug.replace(/\.html$/i, "");

/** Full merged catalog (DB overrides static by slug; static fills the gaps). */
export async function getAllProductsMerged(): Promise<Product[]> {
  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) return staticProducts;
    const converted = (data as DBProduct[]).map(convertDBProduct);
    return mergeProducts(converted, staticProducts);
  } catch (err) {
    console.error("getAllProductsMerged: falling back to static catalog:", err);
    return staticProducts;
  }
}

/** Merged categories with product counts derived from the merged catalog. */
export async function getMergedCategories(allProducts?: Product[]): Promise<Category[]> {
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
}

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

/** Approved reviews for a product slug. Mirrors the original client query exactly
 *  (the slug value, incl. any ".html", must match how rows were stored). */
export async function getApprovedReviews(productSlug: string): Promise<ProductReview[]> {
  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("product_reviews")
      .select("id, rating, title, body, reviewer_name, created_at")
      .eq("product_slug", productSlug)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data || []) as ProductReview[];
  } catch (err) {
    console.error("getApprovedReviews: returning empty list:", err);
    return [];
  }
}
