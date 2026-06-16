import type { SEOContent } from "@/data/seoPromotions";
import {
  generateBreadcrumbSchema,
  generateFAQSchema,
  generatePromotionStructuredData,
} from "@/lib/seo/structured-data";

export function PromotionJsonLd({ content }: { content: SEOContent }) {
  const structuredData = [
    generateBreadcrumbSchema([
      { name: "Home", url: "https://portableofficecabin.com/" },
      { name: "Marketplace", url: "https://portableofficecabin.com/marketplace" },
      { name: "Promotions", url: "https://portableofficecabin.com/promotions" },
      { name: content.h1, url: content.canonicalUrl },
    ]),
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
