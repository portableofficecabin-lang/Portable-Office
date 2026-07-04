
import { getSEOPromotionBySlug, seoPromotions } from "@/data/seoPromotions";
import { PromotionJsonLd } from "@/components/seo/PromotionJsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { SEOPromotionPage } from "@/views/SEOPromotionPage";
import { notFound } from "next/navigation";

export const dynamicParams = true;

// Slugs that have a dedicated, rich static route (app/(site)/promotions/<slug>/) which
// takes precedence over this [slug] route. Excluded here so the build does not also try
// to pre-generate the same path under the dynamic route.
const BESPOKE_SLUGS = new Set(["shipping-container-in-bangalore"]);

export async function generateStaticParams() {
  return seoPromotions
    .map(promo => ({
      slug: `${promo.keyword.toLowerCase().replace(/\s+/g, "-")}-in-${promo.location.toLowerCase().replace(/\s+/g, "-")}`,
    }))
    .filter(({ slug }) => !BESPOKE_SLUGS.has(slug));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = getSEOPromotionBySlug(slug);

  if (!content) return {};

  return buildPageMetadata({
    absoluteTitle: content.title,
    description: content.metaDescription,
    keywords: content.metaKeywords,
    path: `/promotions/${slug}`,
    ogImage: content.imageUrl.startsWith("http")
      ? content.imageUrl
      : `https://portableofficecabin.com${content.imageUrl}`,
    geo: {
      region: content.geoRegion,
      placename: content.geoPlacename,
      position: content.geoPosition,
      icbm: content.icbm,
    },
  });
}

export default async function PromotionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = getSEOPromotionBySlug(slug);

  if (!content) {
    notFound();
  }

  return (
    <>
      <PromotionJsonLd content={content} />
      <SEOPromotionPage content={content} />
    </>
  );
}
