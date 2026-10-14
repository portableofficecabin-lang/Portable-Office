import type { SEOContent } from "@/data/seoPromotions";

const SITE = "https://portableofficecabin.com";

export interface PromotionCrumb {
  name: string;
  /** Site-relative link for the visible trail. */
  href: string;
  /** Absolute URL for the BreadcrumbList. */
  url: string;
}

/**
 * The promotion pages' breadcrumb trail — ONE list feeding both the visible <nav> in
 * SEOPromotionPage and the BreadcrumbList in PromotionJsonLd, so the markup can never describe a
 * trail the visitor does not see (until 2026-10-14 the pages emitted the BreadcrumbList only).
 * The absolute URLs are exactly the ones the BreadcrumbList has always carried.
 */
export function promotionBreadcrumbs(content: Pick<SEOContent, "h1" | "canonicalUrl">): PromotionCrumb[] {
  return [
    { name: "Home", href: "/", url: `${SITE}/` },
    { name: "Marketplace", href: "/marketplace", url: `${SITE}/marketplace` },
    { name: "Promotions", href: "/promotions", url: `${SITE}/promotions` },
    { name: content.h1, href: content.canonicalUrl.replace(SITE, "") || "/", url: content.canonicalUrl },
  ];
}
