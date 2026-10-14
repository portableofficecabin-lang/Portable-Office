import type { SEOContent } from "@/data/seoPromotions";
import {
  generateBreadcrumbSchema,
  generateFAQSchema,
  generatePromotionStructuredData,
} from "@/lib/seo/structured-data";
import { promotionBreadcrumbs } from "@/lib/seo/promotionBreadcrumbs";

export function PromotionJsonLd({ content }: { content: SEOContent }) {
  const structuredData = [
    // Same list as the visible trail in SEOPromotionPage (one source, identical output to before).
    generateBreadcrumbSchema(promotionBreadcrumbs(content).map(({ name, url }) => ({ name, url }))),
    generateFAQSchema(content.faqs),
    generatePromotionStructuredData(content),
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
