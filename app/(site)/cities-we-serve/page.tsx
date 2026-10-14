export const revalidate = 3600; // 1 hour

import CitiesWeServe from "@/views/CitiesWeServe";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { cityPageBySlug, type CityPage } from "@/data/cityPages";
import { CLUSTER_STATES, containerOfficeLocationsIn } from "@/data/containerOfficeCluster";
import { cityPagePath, cityPagesByState } from "@/data/cityDirectory";

const SITE = "https://portableofficecabin.com";

export const metadata = buildPageMetadata({
  title: "Cities We Serve | Pan-India Delivery",
  // ≤160 characters (the previous 204-character description was cut off in results).
  description:
    "Where we deliver container offices, portable cabins and shipping containers, with local guides for Karnataka and Tamil Nadu and transport shown before payment.",
  path: "/cities-we-serve",
});

/* Every location guide in the order the page shows them: container-office locations (cluster order,
 * by state), then shipping-container locations, then the service guides. A summary list — position,
 * URL and the page's own H1 — describing links that are visible on the page; no Place or
 * LocalBusiness nodes, because these are delivery areas, not premises. */
const directoryPages = [
  ...CLUSTER_STATES.flatMap((state) => containerOfficeLocationsIn(state).map((loc) => loc.slug)),
  ...cityPagesByState("shipping-container").flatMap((g) => g.pages.map((p) => p.slug)),
  ...cityPagesByState("local-service").flatMap((g) => g.pages.map((p) => p.slug)),
]
  .map((slug) => cityPageBySlug(slug))
  .filter((page): page is CityPage => page !== undefined);

const locationGuidesList = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Location guides",
  itemListElement: directoryPages.map((page, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: `${SITE}${cityPagePath(page.slug)}`,
    name: page.h1,
  })),
};

export default function Page() {
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: SITE },
          { name: "Cities We Serve", url: `${SITE}/cities-we-serve` },
        ])}
      />
      <JsonLd data={locationGuidesList} />
      <CitiesWeServe />
    </>
  );
}
