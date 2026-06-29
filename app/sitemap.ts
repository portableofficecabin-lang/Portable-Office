import type { MetadataRoute } from "next";
import { seoPromotions } from "@/data/seoPromotions";
import { products, getProductSlug, categories } from "@/data/products";
import { createStaticClient } from "@/lib/supabase/static";

const SITE_URL = "https://portableofficecabin.com";
const LAST_MOD = new Date("2026-06-15");

function entry(
  path: string,
  priority: number,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly",
  lastModified: Date = LAST_MOD,
): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  };
}

// All clean, final, indexable URLs. NO query-parameter URLs, NO `.html` URLs, NO
// private routes (admin/cart/checkout/login/register/my-account/auth) and NO
// redirecting URLs (e.g. legacy long product slugs that 301 → short slugs).
const STATIC_PAGES: MetadataRoute.Sitemap = [
  entry("/", 1.0),
  entry("/products", 0.9),
  // Dedicated product landing pages (static routes that win over /products/[slug]).
  // NOTE: /products/vip-container-office is a real catalog product now, so it is
  // emitted by the product loop below — do not list it here (avoids a duplicate).
  entry("/products/portable-cabin", 0.8, "weekly"),
  entry("/products/portable-toilet-cabin", 0.8, "weekly"),
  entry("/marketplace", 0.85, "weekly"),
  entry("/promotions", 0.85, "weekly"),
  entry("/rental-service", 0.8, "monthly"),
  entry("/about-us", 0.7, "monthly"),
  entry("/contact", 0.7, "monthly"),
  entry("/gallery", 0.7, "monthly"),
  entry("/book-appointment", 0.6, "monthly"),
  entry("/faq", 0.5, "monthly"),
  entry("/careers", 0.4, "monthly"),
  entry("/shipping", 0.4, "monthly"),
  entry("/warranty", 0.4, "monthly"),
  entry("/terms-and-conditions", 0.3, "yearly"),
  entry("/privacy-policy", 0.3, "yearly"),
  entry("/refund-policy", 0.3, "yearly"),
  entry("/blog", 0.7, "weekly"),
];

// Known published blog slugs — used as the fallback if the DB is unreachable at
// build/ISR time so the sitemap always lists the core blog content.
const FALLBACK_BLOG_SLUGS = [
  "labour-shed-prefabricated-structures",
  "porta-cabins-on-rent",
  "ms-portable-cabin-durable-mild-steel-modular-building",
  "prefabricated-labor-colony-bengaluru",
  "portable-cabin-manufacturers-in-bangalore",
];

/** Published blog posts from Supabase (clean /blog/<slug> URLs). Falls back to the
 *  known core posts if the query fails, so a DB outage never empties the sitemap. */
async function getBlogEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("status", "published");
    if (error) throw error;
    const rows = (data || []).filter((r) => r.slug);
    if (rows.length === 0) throw new Error("no published posts");
    return rows.map((r) =>
      entry(
        `/blog/${r.slug}`,
        0.8,
        "monthly",
        new Date(r.updated_at || r.published_at || LAST_MOD),
      ),
    );
  } catch (err) {
    console.error("sitemap: blog fetch failed, using fallback slugs:", err);
    return FALLBACK_BLOG_SLUGS.map((slug) => entry(`/blog/${slug}`, 0.8, "monthly"));
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Dedicated path-based category pages (SSR/ISR) — the canonical category URLs.
  const categoryPages: MetadataRoute.Sitemap = categories.map((category) =>
    entry(`/products/category/${category.slug}`, 0.8, "weekly"),
  );

  const promotionPages: MetadataRoute.Sitemap = seoPromotions.map((promo) => ({
    url: promo.canonicalUrl,
    lastModified: LAST_MOD,
    changeFrequency: "monthly",
    priority: 0.75,
  }));

  // Clean canonical product URL via getProductSlug → honours the `slug` override,
  // so flipped products emit ONLY their short slug (the 301 target), never the
  // legacy long slug that now redirects.
  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}/products/${getProductSlug(product)}`,
    lastModified: LAST_MOD,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const blogPages = await getBlogEntries();

  return [...STATIC_PAGES, ...blogPages, ...categoryPages, ...promotionPages, ...productPages];
}
