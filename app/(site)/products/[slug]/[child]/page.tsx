import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/JsonLd";
import { ProductChildPageView } from "@/components/products/ProductChildPageView";
import { ProductDetailServer } from "@/views/ProductDetailServer";
import { allChildParams, getChildPage } from "@/data/productChildPages";
import { products, getProductSlug, type Product } from "@/data/products";
import { buildProductPageMetadata } from "@/lib/seo/productPageMeta";
import { getProductBySlugMerged, getProductReviewData, getAllProductsMerged } from "@/lib/products/server";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";

/**
 * SEO CHILD PAGES — /products/<parent>/<child>
 *
 * The nested tier of the product hierarchy. TWO kinds of child live here:
 *
 *  1. REGISTRY children (src/data/productChildPages.ts) — informational guide pages, one
 *     keyword each, price-free by rule. No Product/Offer JSON-LD on purpose: offers belong
 *     to product pages, so the Merchant-feed price surface stays exactly as audited.
 *  2. PRODUCT children (a catalog product with `parentSlug`, e.g. Prefab Marketing Office
 *     under Marketing Office) — FULL product pages: same ProductDetailServer, commerce
 *     price box, cart CTAs and Product JSON-LD as /products/<slug>, rendered at the nested
 *     canonical that getProductDetailPath() emits. The flat slug 308-redirects here.
 *
 * Fully static (SSG + ISR): every path of both kinds is prerendered, and unknown
 * combinations 404 (dynamicParams=false). Works under dedicated static parents too (e.g.
 * /products/portable-cabin) because the router falls through to this route for the second
 * segment.
 */
export const revalidate = 1800;

const SITE = "https://portableofficecabin.com";

interface PageProps {
  params: Promise<{ slug: string; child: string }>;
}

/** The catalog product served at /products/<slug>/<child>, if this combo is a product child. */
function productChildFor(slug: string, child: string): Product | undefined {
  return products.find((p) => p.parentSlug === slug && getProductSlug(p) === child);
}

export function generateStaticParams() {
  return [
    ...allChildParams(),
    ...products
      .filter((p) => p.parentSlug)
      .map((p) => ({ slug: p.parentSlug as string, child: getProductSlug(p) })),
  ];
}

/* Only registry combinations and product children exist — anything else 404s instead of
   soft-rendering. */
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, child } = await params;

  const staticProduct = productChildFor(slug, child);
  if (staticProduct) {
    // Same merged row the page body renders; cache()-shared with the page's query.
    const product = (await getProductBySlugMerged(child)) ?? staticProduct;
    return buildProductPageMetadata(product, `/products/${slug}/${child}`);
  }

  const hit = getChildPage(slug, child);
  if (!hit) return {};
  return buildPageMetadata({
    title: hit.page.title,
    description: hit.page.metaDescription,
    path: `/products/${slug}/${child}`,
  });
}

export default async function Page({ params }: PageProps) {
  const { slug, child } = await params;

  const staticProduct = productChildFor(slug, child);
  if (staticProduct) {
    const [merged, reviewData, allProducts] = await Promise.all([
      getProductBySlugMerged(child),
      getProductReviewData(child),
      getAllProductsMerged(),
    ]);
    /* Same never-404-on-a-data-hiccup fallback as the flat product route: this is a real
     * static-catalog product, so a transient DB failure renders the STATIC row rather than
     * freezing an error into the ISR cache on the canonical URL. */
    const product = merged ?? staticProduct;

    return (
      <ProductDetailServer
        product={product}
        reviews={reviewData.reviews}
        reviewSummary={reviewData.summary}
        allProducts={allProducts}
        slug={child}
      />
    );
  }

  const hit = getChildPage(slug, child);
  if (!hit) notFound();

  const { group, page } = hit;
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: SITE },
          { name: "Products", url: `${SITE}/products` },
          { name: group.parentName, url: `${SITE}/products/${group.parentSlug}` },
          { name: page.h1, url: `${SITE}/products/${group.parentSlug}/${page.slug}` },
        ])}
      />
      <ProductChildPageView group={group} page={page} />
    </>
  );
}
