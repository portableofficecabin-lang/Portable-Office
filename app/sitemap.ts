import type { MetadataRoute } from "next";
import { seoPromotions } from "@/data/seoPromotions";
import { products, getProductSlug, categories } from "@/data/products";

const SITE_URL = "https://portableofficecabin.com";
const LAST_MOD = new Date("2026-06-15");

function entry(
  path: string,
  priority: number,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "weekly",
): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE_URL}${path}`,
    lastModified: LAST_MOD,
    changeFrequency,
    priority,
  };
}

const STATIC_PAGES: MetadataRoute.Sitemap = [
  entry("/", 1.0),
  entry("/products", 0.9),
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
  entry("/blog/labour-shed-prefabricated-structures", 0.8, "monthly"),
  entry("/blog/porta-cabins-on-rent", 0.8, "monthly"),
  entry("/blog/ms-portable-cabin-durable-mild-steel-modular-building", 0.8, "monthly"),
  entry("/blog/prefabricated-labor-colony-bengaluru", 0.8, "monthly"),
  entry("/blog/portable-cabin-manufacturers-in-bangalore", 0.8, "monthly"),
];

export default function sitemap(): MetadataRoute.Sitemap {
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

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}/products/${getProductSlug(product)}.html`,
    lastModified: LAST_MOD,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...STATIC_PAGES, ...categoryPages, ...promotionPages, ...productPages];
}
