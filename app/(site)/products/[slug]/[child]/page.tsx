import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/JsonLd";
import { ProductChildPageView } from "@/components/products/ProductChildPageView";
import { allChildParams, getChildPage } from "@/data/productChildPages";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";

/**
 * SEO CHILD PAGES — /products/<parent>/<child>
 *
 * The nested tier of the product hierarchy: each main product page is the parent, and the
 * children under it each target one distinct keyword/search intent (registry:
 * src/data/productChildPages.ts — the single source for the route, sitemap and all
 * interlinking). Fully static (SSG + ISR): every path is prerendered from the registry, and
 * unknown combinations 404. Works under dedicated static parents too (e.g.
 * /products/portable-cabin) because the router falls through to this route for the second
 * segment.
 *
 * No Product/Offer JSON-LD here on purpose: these are informational pages. Offers belong to
 * the product pages themselves, so the Merchant-feed price surface stays exactly as audited.
 */
export const revalidate = 3600;

const SITE = "https://portableofficecabin.com";

interface PageProps {
  params: Promise<{ slug: string; child: string }>;
}

export function generateStaticParams() {
  return allChildParams();
}

/* Only registry combinations exist — anything else 404s instead of soft-rendering. */
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, child } = await params;
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
