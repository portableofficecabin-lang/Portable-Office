export const revalidate = 3600; // 1 hour

import ShippingDeliveryPage from "@/views/ShippingDelivery";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = buildPageMetadata({
  title: "Shipping & Delivery Information",
  description:
    "Shipping, delivery and installation details for portable cabins and containers — timelines, transport and site requirements.",
  path: "/shipping",
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: "https://portableofficecabin.com" },
          { name: "Shipping & Delivery", url: "https://portableofficecabin.com/shipping" },
        ])}
      />
      <ShippingDeliveryPage />
    </>
  );
}
