import type { MetadataRoute } from "next";
import { allChildParams } from "@/data/productChildPages";
import { publishedFamilies, publishedVariants, variantPath } from "@/data/productFamilies";
import { seoPromotions } from "@/data/seoPromotions";
import { CITY_PAGES } from "@/data/cityPages";
import { products, getProductSlug, getProductDetailPath, categories } from "@/data/products";
import { createStaticClient } from "@/lib/supabase/static";
import { variantIsSearchEligible } from "@/lib/seo/productGroupSchema";

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
  // SEO child pages under each main product (registry-driven — src/data/productChildPages.ts)
  ...allChildParams().map(({ slug, child }) => entry(`/products/${slug}/${child}`, 0.7, "monthly")),
  /* STANDARD SIZE VARIANT pages — one per published size of every published product family
   * (src/data/productFamilies.ts). Each is a distinct, self-canonical, indexable landing
   * page, so every one must be listed here: a variant URL that is crawlable and canonical
   * but absent from the sitemap is a variant Google discovers late or not at all. Priority
   * sits just under the parent product (0.8) because the parent is the group overview.
   * Unpublished sizes are excluded by publishedVariants() — the same gate that keeps them
   * out of generateStaticParams, so a URL is never in the sitemap and 404ing at once.
   *
   * A size served at its family's PARENT url is deliberately SKIPPED here: its canonical is the
   * parent product URL, which the product loop below already emits. Listing it again would put
   * the same <loc> in the sitemap twice. */
  ...publishedFamilies().flatMap((family) =>
    publishedVariants(family)
      .filter((variant) => !variant.rendersAtParent)
      /* A size with no confirmed price is served noindex (see buildVariantPageMetadata), and
       * a noindex URL must never appear here — submitting a page we are asking Google not to
       * index is a direct contradiction. It returns to the sitemap automatically once its
       * commerce record exists. */
      .filter((variant) => variantIsSearchEligible(family, variant))
      .map((variant) => entry(variantPath(family, variant), 0.75, "weekly")),
  ),
  entry("/marketplace", 0.85, "weekly"),
  entry("/promotions", 0.85, "weekly"),
  entry("/rental-service", 0.8, "monthly"),
  entry("/about-us", 0.7, "monthly"),
  entry("/contact", 0.7, "monthly"),
  entry("/gallery", 0.7, "monthly"),
  entry("/cities-we-serve", 0.6, "monthly"),
  // City / area landing pages (data-driven from src/data/cityPages.ts)
  ...CITY_PAGES.map((c) => entry(`/cities-we-serve/${c.slug}`, 0.6, "monthly")),
  entry("/book-appointment", 0.6, "monthly"),
  entry("/faq", 0.5, "monthly"),
  entry("/careers", 0.4, "monthly"),
  entry("/shipping", 0.4, "monthly"),
  entry("/warranty", 0.4, "monthly"),
  entry("/terms-and-conditions", 0.3, "yearly"),
  entry("/privacy-policy", 0.3, "yearly"),
  entry("/refund-policy", 0.3, "yearly"),
  entry("/payment-policy", 0.3, "yearly"),
  entry("/custom-product-policy", 0.3, "yearly"),
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

  // Clean canonical product URL via getProductDetailPath → honours the `slug` override
  // (flipped products emit ONLY their short slug, never the legacy long slug that now
  // redirects) AND the `parentSlug` nesting (product children emit ONLY the nested
  // /products/<parent>/<child> canonical, never the flat slug that 308-redirects there).
  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}${getProductDetailPath(product)}`,
    lastModified: LAST_MOD,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const blogPages = await getBlogEntries();

  return [...STATIC_PAGES, ...blogPages, ...categoryPages, ...promotionPages, ...productPages];
}
