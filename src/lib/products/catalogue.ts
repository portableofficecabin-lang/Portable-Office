import { createStaticClient } from "@/lib/supabase/static";
import type { DBProduct } from "@/types/database";
import { products as staticProducts, type Product } from "@/data/products";
import { convertDBProduct, mergeProducts } from "@/lib/products/merge";

/**
 * Full merged catalog (DB overrides static by slug; static fills the gaps), UNCACHED.
 *
 * Moved verbatim out of server.ts so it can be imported without React's `cache()`, which exists
 * only inside the Next.js server runtime. server.ts wraps this exact function in cache() as
 * getAllProductsMerged — use that in pages and components so one render shares one query. This
 * bare form is for code that must also run in plain Node, such as app/sitemap.ts, which the
 * product-variants test suite calls directly.
 *
 * Falls back to the static catalog on any error, so a build or ISR regeneration can never fail
 * because Supabase is unreachable.
 */
export async function loadAllProductsMerged(): Promise<Product[]> {
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
