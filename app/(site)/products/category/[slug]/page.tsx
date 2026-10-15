import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryListingWithParams } from "@/views/Products";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema, generateFAQSchema } from "@/lib/seo/structured-data";
import { categories as staticCategories, getProductDetailPath } from "@/data/products";
import { getAllProductsMerged, getMergedCategories } from "@/lib/products/server";
import { getCommerce, isOutrightSale } from "@/data/productCommerce";
import { sellPrice } from "@/lib/pricing/gst";
import { portableCabinsFaqs } from "@/components/products/PortableCabinsCategoryContent";
import { prefabBuildingFaqs } from "@/components/products/PrefabBuildingCategoryContent";
import { ContainerOfficesCategoryContent } from "@/components/products/ContainerOfficesCategoryContent";
import {
  CONTAINER_OFFICES_SLUG,
  containerOfficeFaqs,
  containerOfficeModels,
  containerOfficesMetaDescription,
} from "@/components/products/containerOfficesCategoryData";
import { CategoryLandingContent } from "@/components/products/CategoryLandingContent";
import { categoryLandingMetaDescription, resolveCategoryLanding } from "@/data/categoryLandings";

/** Categories that ship a rich landing page (copy + FAQ + ItemList schema), keyed by slug. */
const RICH_CATEGORY_FAQS: Record<string, { question: string; answer: string }[]> = {
  "portable-cabins": portableCabinsFaqs,
  "prefab-building": prefabBuildingFaqs,
};

/* CONTAINER OFFICES — the category's manufacturer landing page (2026-10-11).
 *
 * Kept OUT of RICH_CATEGORY_FAQS on purpose: that map also switches on the priced ItemList below,
 * which nests Product + Offer nodes inside a category page. Google evaluates merchant listings on the
 * individual product pages (each container office already carries its own Product + Offer JSON-LD),
 * so this category publishes a SUMMARY ItemList instead — position, URL and name only, no offers —
 * plus its own FAQPage built from the same array the page renders.
 *
 * Title: absolute, so the layout does not append the 24-character brand suffix and the 55-character
 * title displays in full. Description: built from the live catalogue (model count + lowest
 * GST-inclusive price), so it can never quote a figure the cards do not show. Image: the Modern
 * Container Office front elevation — the same clean photo Merchant Center already accepts as that
 * product's image_link — instead of the site default, which is not present in public/. */
const CONTAINER_OFFICES_META = {
  absoluteTitle: "Container Office Manufacturer in India | Prices & Sizes",
  image: "/images/products/modern-container-office-40ft-front.webp",
  imageAlt: "Modern Container Office, 40 ft x 8 ft, front elevation",
  keywords:
    "container office, container office manufacturer in India, container office price, "
    + "container office sizes, MS container office, fabricated container office, "
    + "converted shipping container office",
};

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
  "container-offices": {
    title: "Container Office Manufacturer in India — Prices & Sizes",
    description:
      "Explore container office cabins in custom sizes with MS steel construction, insulation, electrical fittings and flexible layouts. Request a factory-direct quote.",
    keywords:
      "container office, container office manufacturer, container office price, " +
      "container office cabin, portable container office, container office India",
  },
  "portable-cabins": {
    title: "Portable Cabins in India — Prices, Sizes & Manufacturer",
    description:
      "Factory-built portable cabins from ₹2.36 lakh (incl. GST). ISO 9001 manufacturer with 15+ years' experience. 20ft, 40ft & custom sizes, MS & PUF builds, pan-India delivery.",
    keywords:
      "portable cabins, portable cabin manufacturer in India, porta cabin, portable cabin price, "
      + "portable office cabin, prefabricated portable cabin, MS portable cabin, "
      + "20ft portable cabin, 40ft portable cabin bunkhouse",
  },
  /* HOME CONSTRUCTION — a HUB, not a competitor. Rewritten 2026-09-07.
   *
   * The old copy was wrong twice over. It sold "steel structure, insulated walls, roofing" —
   * that is the PREFAB range, not the RCC civil work this category actually holds — and it
   * claimed an "ISO 9001 manufacturer", a claim being withdrawn from public surfaces (commits
   * 53d483d, e84cecd) and one that describes manufacturing rather than construction anyway.
   *
   * Its job now is to ROUTE, so the title and description deliberately avoid the head terms its
   * own children are competing for ("building construction contractor in Bangalore",
   * "construction contractor in Hosur", "house construction cost per sq ft"). A hub that
   * out-ranks its own children for their keyword is the cannibalisation, not the cure. */
  "home-construction": {
    // 41 chars, so the rendered tag (+ the 24-char brand suffix the layout template appends)
    // lands at 65 and displays in full. An earlier draft ran to 92 and was truncated.
    title: "Home Construction Services in Bangalore",
    description:
      "RCC houses built on your own plot in Bangalore and Hosur. Find the right page: contractor "
      + "services, what a build includes and what it costs, or the area you are building in.",
    keywords:
      "home construction services, house construction company, RCC house construction, "
      + "home construction Bangalore Hosur, house building services",
  },
  "prefab-building": {
    title: "Prefab Buildings — Panel-Built Structures, Made to Your Plan",
    description:
      "Prefab buildings assembled on your site in days — insulated panels, steel truss roof, clear-span width and any footprint. ISO 9001 manufacturer, built in Tamil Nadu, delivered pan-India.",
    keywords:
      "prefab building, prefabricated building manufacturer, prefab building system, "
      + "panel built structure, prefab office building, prefab sales gallery, "
      + "prefab marketing office, modular building India",
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const categories = await getMergedCategories();
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) return { title: "Category" };
  if (slug === CONTAINER_OFFICES_SLUG) {
    return buildPageMetadata({
      absoluteTitle: CONTAINER_OFFICES_META.absoluteTitle,
      description: containerOfficesMetaDescription(await getAllProductsMerged()),
      keywords: CONTAINER_OFFICES_META.keywords,
      path: `/products/category/${slug}`,
      image: CONTAINER_OFFICES_META.image,
      imageAlt: CONTAINER_OFFICES_META.imageAlt,
    });
  }
  const override = CATEGORY_META[slug];
  /* Categories with a shared landing section (src/data/categoryLandings.ts) get a real meta
   * description in place of the one-line tagline (36–69 characters before). Computed from the
   * merged catalogue, so its model count always matches the grid. */
  const mergedProducts = await getAllProductsMerged();
  const landingDescription = override
    ? undefined
    : categoryLandingMetaDescription(slug, mergedProducts, cat.name);
  return buildPageMetadata({
    // No brand suffix here — the root layout title template appends
    // "| Portable Office Cabin" exactly once (avoids a doubled brand).
    title: override?.title ?? `${cat.name} — Models, Specs & Prices`,
    description:
      override?.description ||
      landingDescription ||
      cat.description ||
      `Browse all ${cat.name} models, specifications and prices. Manufactured in-house and delivered installation-ready across India.`,
    keywords: override?.keywords,
    path: `/products/category/${slug}`,
    // Empty categories keep their current index status and sitemap entry (owner decision
    // 2026-10-13: no noindex until their Search Console performance has been reviewed).
    // src/lib/seo/categoryIndexing.ts holds the proposed rule, deliberately not wired in.
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
  const itemListSchema = RICH_CATEGORY_FAQS[slug]
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: category.name,
        itemListElement: products
          .filter((p) => p.categorySlug === slug && isOutrightSale(p.id))
          .map((p) => ({ p, price: sellPrice(getCommerce(p.id)!.basePrice) }))
          .sort((a, b) => a.price - b.price)
          .map(({ p, price }, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Product",
              name: p.name,
              // p.slug is an optional OVERRIDE most products don't set — the canonical URL comes
              // from getProductDetailPath(), which also nests a product child under its parent
              // (/products/marketing-office/prefab-marketing-office). getProductSlug() gave the
              // flat child slug, which 308-redirects, so the list pointed at a redirect.
              url: `${SITE}${getProductDetailPath(p)}`,
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

  /* Container offices (PR #82): a summary list (no Product / Offer nodes — see CONTAINER_OFFICES_META)
   * and the FAQ array the page renders, both from the same merged catalogue the cards use. */
  const isContainerOffices = slug === CONTAINER_OFFICES_SLUG;
  const containerSummaryList = isContainerOffices
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Container office models",
        itemListElement: containerOfficeModels(products).map((m, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE}${m.path}`,
          name: m.name,
        })),
      }
    : null;

  /* Shared landing section for categories without hand-built content (PR #86). Resolved ONCE: the same
   * object feeds the rendered section, its FAQPage and its summary ItemList, so the visible FAQ and
   * the markup are one array. The ItemList carries position, URL and name only — no Product/Offer
   * nodes on a category page; each product page carries its own offer. container-offices is not one
   * of the landing categories, so at most one of the two lists exists on any page. */
  const landing = resolveCategoryLanding(slug, products, categories);
  const landingItemList = landing
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `${category.name} models`,
        itemListElement: landing.models.map((m, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE}${m.path}`,
          name: m.name,
        })),
      }
    : null;
  const containerFaqs = isContainerOffices ? containerOfficeFaqs(products) : null;

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
      {RICH_CATEGORY_FAQS[slug] && <JsonLd data={generateFAQSchema(RICH_CATEGORY_FAQS[slug])} />}
      {containerSummaryList && <JsonLd data={containerSummaryList} />}
      {containerFaqs && <JsonLd data={generateFAQSchema(containerFaqs)} />}
      {landingItemList && <JsonLd data={landingItemList} />}
      {landing && <JsonLd data={generateFAQSchema(landing.faqs)} />}
      {/* No searchParams in the page → static/ISR (revalidate=1800 now effective).
          activeCategory comes from the path slug so content stays server-rendered
          and crawlable; ?page deep-links are resolved client-side after hydration. */}
      <CategoryListingWithParams
        products={products}
        categories={categories}
        activeCategory={slug}
        basePath={`/products/category/${slug}`}
        categoryContent={
          isContainerOffices ? (
            <ContainerOfficesCategoryContent products={products} />
          ) : landing ? (
            <CategoryLandingContent landing={landing} />
          ) : undefined
        }
      />
    </>
  );
}
