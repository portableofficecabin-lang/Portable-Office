import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryListingWithParams } from "@/views/Products";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema, generateFAQSchema } from "@/lib/seo/structured-data";
import { categories as staticCategories } from "@/data/products";
import { getAllProductsMerged, getMergedCategories } from "@/lib/products/server";
import { getCommerce, isPurchasable } from "@/data/productCommerce";
import { sellPrice } from "@/lib/pricing/gst";
import { portableCabinsFaqs } from "@/components/products/PortableCabinsCategoryContent";

export const revalidate = 1800; // 30 minutes

const SITE = "https://portableofficecabin.com";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return staticCategories.map((c) => ({ slug: c.slug }));
}

/**
 * Per-category SEO metadata overrides. The description prices/claims are the site's REAL figures
 * (₹2.36 lakh = the labour hutment's GST-inclusive sellPrice) — never a copywriter's number.
 */
const CATEGORY_META: Record<string, { title: string; description: string; keywords?: string }> = {
  "portable-cabins": {
    title: "Portable Cabins in India — Prices, Sizes & Manufacturer",
    description:
      "Factory-built portable cabins from ₹2.36 lakh (incl. GST). ISO 9001 manufacturer with 15+ years' experience. 20ft, 40ft & custom sizes, MS & PUF builds, pan-India delivery.",
    keywords:
      "portable cabins, portable cabin manufacturer in India, porta cabin, portable cabin price, "
      + "portable office cabin, prefabricated portable cabin, MS portable cabin, "
      + "20ft portable cabin, 40ft portable cabin bunkhouse",
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const categories = await getMergedCategories();
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) return { title: "Category" };
  const override = CATEGORY_META[slug];
  return buildPageMetadata({
    // No brand suffix here — the root layout title template appends
    // "| Portable Office Cabin" exactly once (avoids a doubled brand).
    title: override?.title ?? `${cat.name} — Models, Specs & Prices`,
    description:
      override?.description ||
      cat.description ||
      `Browse all ${cat.name} models, specifications and prices. Manufactured in-house and delivered installation-ready across India.`,
    keywords: override?.keywords,
    path: `/products/category/${slug}`,
  });
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;

  const [products, categories] = await Promise.all([
    getAllProductsMerged(),
    getMergedCategories(),
  ]);

  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  /* Price-rich results for the portable-cabins category: an ItemList of the category's PURCHASABLE
   * products with their live GST-inclusive prices and REAL /products/<slug> URLs. Gated by the same
   * `isPurchasable` predicate that gates Add-to-Cart, product JSON-LD and the Merchant feed — so a
   * quote-only product can never leak an offer here, and a price here can never differ from the
   * card, the product page or the feed. */
  const itemListSchema = slug === "portable-cabins"
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: category.name,
        itemListElement: products
          .filter((p) => p.categorySlug === slug && isPurchasable(p.id))
          .map((p) => ({ p, price: sellPrice(getCommerce(p.id)!.basePrice) }))
          .sort((a, b) => a.price - b.price)
          .map(({ p, price }, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Product",
              name: p.name,
              url: `${SITE}/products/${p.slug}`,
              offers: {
                "@type": "Offer",
                priceCurrency: "INR",
                price: String(price),
                availability: "https://schema.org/InStock",
              },
            },
          })),
      }
    : null;

  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: SITE },
          { name: "Products", url: `${SITE}/products` },
          { name: category.name, url: `${SITE}/products/category/${slug}` },
        ])}
      />
      {itemListSchema && <JsonLd data={itemListSchema} />}
      {/* FAQPage schema — the SAME array the on-page FAQ renders, so copy and schema always match. */}
      {slug === "portable-cabins" && <JsonLd data={generateFAQSchema(portableCabinsFaqs)} />}
      {/* No searchParams in the page → static/ISR (revalidate=1800 now effective).
          activeCategory comes from the path slug so content stays server-rendered
          and crawlable; ?page deep-links are resolved client-side after hydration. */}
      <CategoryListingWithParams
        products={products}
        categories={categories}
        activeCategory={slug}
        basePath={`/products/category/${slug}`}
      />
    </>
  );
}
