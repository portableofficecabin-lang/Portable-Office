import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/JsonLd";
import { ProductChildPageView } from "@/components/products/ProductChildPageView";
import { ProductDetailServer } from "@/views/ProductDetailServer";
import { ProductVariantView } from "@/views/ProductVariantView";
import { allChildParams, getChildPage } from "@/data/productChildPages";
import { products, getProductSlug, type Product } from "@/data/products";
import {
  allVariantParams,
  getParentRenderedVariant,
  getVariantByPath,
  variantAsProduct,
  type VariantHit,
} from "@/data/productFamilies";
import { buildProductPageMetadata } from "@/lib/seo/productPageMeta";
import { buildVariantPageMetadata } from "@/lib/seo/variantPageMeta";
import { getProductBySlugMerged, getProductReviewData, getAllProductsMerged } from "@/lib/products/server";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";

/**
 * NESTED PRODUCT URLS — /products/<parent>/<child>
 *
 * The nested tier of the product hierarchy. THREE kinds of child live here, and the route
 * resolves them in a FIXED PRIORITY ORDER so a new one can never silently shadow an old one:
 *
 *  1. REGISTRY children (src/data/productChildPages.ts) — informational guide pages, one
 *     keyword each, price-free by rule. No Product/Offer JSON-LD on purpose: offers belong
 *     to product pages, so the Merchant-feed price surface stays exactly as audited.
 *     e.g. price-and-cost-guide, sizes-and-dimensions, specifications.
 *  2. PRODUCT children (a catalog product with `parentSlug`, e.g. Prefab Marketing Office
 *     under Marketing Office) — FULL product pages: same ProductDetailServer, commerce
 *     price box, cart CTAs and Product JSON-LD as /products/<slug>, rendered at the nested
 *     canonical that getProductDetailPath() emits. The flat slug 308-redirects here.
 *  3. STANDARD SIZE VARIANTS (src/data/productFamilies.ts) — one standard size of a product
 *     family, e.g. /products/container-office/20x10-ft. Its own H1, price, SKU, canonical,
 *     ProductGroup + Product JSON-LD and Merchant feed row.
 *
 * ── RESERVED CHILD SLUGS ───────────────────────────────────────────────────────────────
 * Kinds 1 and 2 are RESERVED and always win. A size slug that collided with an existing
 * guide page would take that page's URL away, which is why the size ladder is checked LAST
 * and why scripts/product-variants.test.ts fails the build if any family ever declares a
 * size slug that a registry child or a product child already owns. Size slugs are shaped
 * `<L>x<W>-ft`, which no guide slug uses, so the two namespaces do not overlap today.
 *
 * Fully static (SSG + ISR): every path of all three kinds is prerendered, and unknown or
 * UNPUBLISHED combinations 404 for real (dynamicParams=false) rather than soft-rendering an
 * empty product page. Works under dedicated static parents too (e.g. /products/portable-cabin)
 * because the router falls through to this route for the second segment.
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

/**
 * A size variant, but ONLY when the slug is not already claimed by a reserved child. The
 * priority order lives here, in one function, so generateStaticParams, generateMetadata and
 * the page body can never disagree about which kind of page a URL is.
 */
function sizeVariantFor(slug: string, child: string): VariantHit | undefined {
  if (getChildPage(slug, child)) return undefined; // reserved: registry guide page
  if (productChildFor(slug, child)) return undefined; // reserved: full product child
  return getVariantByPath(slug, child);
}

export function generateStaticParams() {
  const reserved = new Set<string>();
  const params: { slug: string; child: string }[] = [];

  for (const p of allChildParams()) {
    reserved.add(`${p.slug}/${p.child}`);
    params.push(p);
  }
  for (const p of products.filter((p) => p.parentSlug)) {
    const entry = { slug: p.parentSlug as string, child: getProductSlug(p) };
    reserved.add(`${entry.slug}/${entry.child}`);
    params.push(entry);
  }
  /* Size variants last: a reserved slug keeps its existing page, and the collision is
   * reported by the test harness rather than silently resolving one way or the other.
   *
   * NOTE `parentRenderedVariantParams()` are deliberately NOT prerendered here. Those sizes
   * are served by their family's parent page, and their ladder-shaped URL 301s there via
   * next.config.ts. Prerendering them would defeat that: with dynamicParams:false Next
   * generates the path and answers it at HTTP 200 instead of letting the redirect fire. */
  for (const p of allVariantParams()) {
    if (reserved.has(`${p.slug}/${p.child}`)) {
      console.error(
        `[products/[slug]/[child]] size slug "${p.slug}/${p.child}" is already a reserved child page — the size page was NOT generated`,
      );
      continue;
    }
    params.push(p);
  }

  return params;
}

/* Only registry combinations, product children and PUBLISHED size variants exist — anything
   else 404s instead of soft-rendering. An unpublished size is absent from
   generateStaticParams, so with dynamicParams=false its URL returns a genuine 404. */
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
  if (hit) {
    return buildPageMetadata({
      title: hit.page.title,
      description: hit.page.metaDescription,
      path: `/products/${slug}/${child}`,
    });
  }

  // A parent-rendered size 301s from this URL, so it has no metadata of its own here.
  if (getParentRenderedVariant(slug, child)) return {};

  const variantHit = sizeVariantFor(slug, child);
  if (variantHit) {
    // The variant inherits the family parent's gallery, so og:image tracks an admin image
    // edit exactly as the parent product page does.
    const parent =
      (await getProductBySlugMerged(variantHit.family.slug)) ??
      products.find((p) => p.id === variantHit.family.parentProductId);
    if (!parent) return {};
    return buildVariantPageMetadata(
      variantHit.family,
      variantHit.variant,
      variantAsProduct(variantHit, parent),
    );
  }

  return {};
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
  if (hit) {
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

  /* A size served at the family's PARENT url never reaches here: next.config.ts 301s its
   * ladder-shaped URL to the parent before routing, and it is not prerendered, so with
   * dynamicParams:false there is no page to render. If that redirect were ever removed, the
   * URL would 404 — which is the safe failure: better a 404 than a second, competing copy of
   * the parent page at a second URL. */
  const variantHit = sizeVariantFor(slug, child);
  if (variantHit) {
    const [mergedParent, allProducts] = await Promise.all([
      getProductBySlugMerged(variantHit.family.slug),
      getAllProductsMerged(),
    ]);
    /* Never 404 a live landing URL because of a data hiccup: the family's parent is a real
     * static-catalog product, so a transient DB failure renders the STATIC row rather than
     * freezing an error into the ISR cache on the canonical URL a crawler fetches. */
    const parentProduct =
      mergedParent ?? products.find((p) => p.id === variantHit.family.parentProductId);
    if (!parentProduct) notFound();

    return (
      <ProductVariantView
        hit={variantHit}
        variantProduct={variantAsProduct(variantHit, parentProduct)}
        parentProduct={parentProduct}
        allProducts={allProducts}
      />
    );
  }

  notFound();
}
