import type { MetadataRoute } from "next";
import { allChildParams } from "@/data/productChildPages";
import { publishedFamilies, publishedVariants, variantPath } from "@/data/productFamilies";
import { seoPromotions } from "@/data/seoPromotions";
import { CITY_PAGES } from "@/data/cityPages";
import { products, getProductSlug, getProductDetailPath, categories } from "@/data/products";
import { createStaticClient } from "@/lib/supabase/static";
import { variantIsSearchEligible } from "@/data/productFamilies";

const SITE_URL = "https://portableofficecabin.com";

/**
 * ── WHY MOST ENTRIES CARRY NO <lastmod> ─────────────────────────────────────────────────────
 *
 * This file used to stamp EVERY url with one hardcoded date (`new Date("2026-06-15")`). That is
 * worse than emitting nothing: it told crawlers that ~200 unrelated pages all changed on the
 * same day, and it went stale the moment it was written — a page published in September shipped
 * announced as three months old, which is exactly the signal that makes Google stop trusting a
 * sitemap's lastmod wholesale.
 *
 * lastmod means "when the content last MEANINGFULLY changed". Where this codebase actually knows
 * that — blog posts and products both carry `updated_at` in Supabase — it is emitted. Where it
 * does not (static pages, category and promotion landing pages built from source files), the
 * field is OMITTED. Omitting is explicitly fine and is what Google recommends over guessing;
 * build time would be a lie of a different kind, marking every page as changed on every deploy.
 */
function entry(
  path: string,
  priority: number,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly",
  lastModified?: Date,
): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE_URL}${path}`,
    // Spread so the key is absent (not `undefined`) when there is no real signal.
    ...(lastModified ? { lastModified } : {}),
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
  /* Building Construction Contractor in Bangalore — a dedicated service landing page under the
   * Home Construction category (app/(site)/products/home-construction/...). It is a STATIC route
   * segment, so it is not emitted by the productChildPages loop above and must be listed here.
   * Quote-only service: no Product/Offer schema, no ₹ figure, and no Merchant feed exposure. */
  entry("/products/home-construction/building-construction-contractor", 0.8, "weekly"),
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
      /* A size that is not search-eligible is served noindex (see buildVariantPageMetadata),
       * and a noindex URL must never appear here — submitting a page we are asking Google not
       * to index is a direct contradiction that Search Console reports.
       *
       * It returns to the sitemap when it becomes search-eligible: a confirmed price AND
       * contentComplete. A commerce record on its own is not enough. Being out of stock does
       * NOT remove it — availability is a commerce state, not an indexing one. */
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

/**
 * Real per-product modification times, keyed by product slug.
 *
 * The `products` table carries `slug` and `updated_at`, so a product edited in the admin panel
 * has a genuine lastmod — the one case where this sitemap can honestly claim one for a product
 * URL. A slug with no DB row (static-catalogue-only products) is simply absent from the map and
 * its entry ships without lastmod, which is the correct answer rather than a guess.
 *
 * A DB outage returns an empty map, so the sitemap degrades to no product lastmods rather than
 * failing — same resilience contract as getBlogEntries() below.
 */
async function getProductLastMods(): Promise<Map<string, Date>> {
  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase.from("products").select("slug, updated_at");
    if (error) throw error;
    const map = new Map<string, Date>();
    for (const row of data || []) {
      if (!row.slug || !row.updated_at) continue;
      const d = new Date(row.updated_at);
      if (!Number.isNaN(d.getTime())) map.set(row.slug, d);
    }
    return map;
  } catch (err) {
    console.error("sitemap: product lastmod fetch failed, omitting product lastmod:", err);
    return new Map();
  }
}

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
    return rows.map((r) => {
      // A published post always has one of these; if it somehow has neither, ship no
      // lastmod rather than inventing one. Hoisted so the null is narrowed away.
      const stamp = r.updated_at || r.published_at;
      return entry(`/blog/${r.slug}`, 0.8, "monthly", stamp ? new Date(stamp) : undefined);
    });
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

  // Built from source files — no per-page modification signal exists, so no lastmod.
  const promotionPages: MetadataRoute.Sitemap = seoPromotions.map((promo) => ({
    url: promo.canonicalUrl,
    changeFrequency: "monthly",
    priority: 0.75,
  }));

  // Both DB round-trips at once; each degrades independently if Supabase is unreachable.
  const [productLastMods, blogPages] = await Promise.all([getProductLastMods(), getBlogEntries()]);

  // Clean canonical product URL via getProductDetailPath → honours the `slug` override
  // (flipped products emit ONLY their short slug, never the legacy long slug that now
  // redirects) AND the `parentSlug` nesting (product children emit ONLY the nested
  // /products/<parent>/<child> canonical, never the flat slug that 308-redirects there).
  const productPages: MetadataRoute.Sitemap = products.map((product) => {
    const lastModified = productLastMods.get(getProductSlug(product));
    return {
      url: `${SITE_URL}${getProductDetailPath(product)}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    };
  });

  return [...STATIC_PAGES, ...blogPages, ...categoryPages, ...promotionPages, ...productPages];
}
