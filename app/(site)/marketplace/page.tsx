export const revalidate = 3600; // 1 hour

import { buildPageMetadata } from "@/lib/seo/metadata";
import { MarketplacePage } from "@/views/Marketplace";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = buildPageMetadata({
  absoluteTitle: "Prefab Marketplace | Portable Cabins & Offers India",
  description:
    "Browse 100+ location deals on portable cabins, container offices, cargo storage & prefab structures across India — Bangalore, Chennai, Hyderabad & more.",
  keywords:
    "portable cabin marketplace, prefab structure offers, container office deals India, portable cabin promotions, location specific prefab offers",
  path: "/marketplace",
});

export default function Page() {
  return (
    <>
      {/* SEO-6 (2026-11-22): BreadcrumbList for the visible Home › Marketplace trail (PageHero), as on
          /gallery, /faq and the other index pages. */}
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: "https://portableofficecabin.com" },
          { name: "Marketplace", url: "https://portableofficecabin.com/marketplace" },
        ])}
      />
      <MarketplacePage />
    </>
  );
}
