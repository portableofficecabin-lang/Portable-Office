import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/JsonLd";
import { ProductChildPageView } from "@/components/products/ProductChildPageView";
import { GUIDES_PATH } from "@/data/guideMoves";
import { allGuidePages, getGuidePage } from "@/data/productChildPages";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";

/**
 * GUIDE PAGES — /guides/<slug> (D5, 2026-11).
 *
 * The informational portable-cabin guides moved here from /products/portable-cabin/<child>
 * (src/data/guideMoves.ts; next.config.ts 301s every old URL in one hop). The content still comes
 * from the src/data/productChildPages.ts registry and renders with the same ProductChildPageView,
 * so title, H1, copy, FAQs and the live price table are byte-for-byte what they were — only the
 * URL, the canonical and the breadcrumb (Home › Guides › …) change.
 *
 * Fully static: only registered guides exist; any other slug is a genuine 404.
 */
export const revalidate = 1800;
export const dynamicParams = false;

const SITE = "https://portableofficecabin.com";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return allGuidePages().map(({ guideSlug }) => ({ slug: guideSlug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const hit = getGuidePage(slug);
  if (!hit) return {};
  return buildPageMetadata({
    title: hit.page.title,
    description: hit.page.metaDescription,
    path: `${GUIDES_PATH}/${slug}`,
  });
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const hit = getGuidePage(slug);
  if (!hit) notFound();
  const { group, page } = hit;
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: SITE },
          { name: "Guides", url: `${SITE}${GUIDES_PATH}` },
          { name: page.h1, url: `${SITE}${GUIDES_PATH}/${slug}` },
        ])}
      />
      <ProductChildPageView group={group} page={page} />
    </>
  );
}
