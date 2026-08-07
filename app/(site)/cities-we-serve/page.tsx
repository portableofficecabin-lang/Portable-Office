export const revalidate = 3600; // 1 hour

import CitiesWeServe from "@/views/CitiesWeServe";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = buildPageMetadata({
  title: "Cities We Serve | Pan-India Delivery",
  description:
    "Portable cabins, container offices and prefab structures delivered across India — Bengaluru, Chennai, Hyderabad, Mumbai, Pune, Delhi NCR and every serviceable pincode, with transport shown before payment.",
  path: "/cities-we-serve",
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: "https://portableofficecabin.com" },
          { name: "Cities We Serve", url: "https://portableofficecabin.com/cities-we-serve" },
        ])}
      />
      <CitiesWeServe />
    </>
  );
}
