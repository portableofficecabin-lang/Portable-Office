export const revalidate = 3600; // 1 hour

import RentalServicePage from "@/views/RentalService";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = buildPageMetadata({
  title: "Porta Cabin & Portable Cabin on Rent",
  description:
    "Porta cabins and portable cabins on rent — site offices and shipping containers on flexible monthly terms with delivery, setup and maintenance support across India.",
  path: "/rental-service",
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: "https://portableofficecabin.com" },
          { name: "Rental Service", url: "https://portableofficecabin.com/rental-service" },
        ])}
      />
      <RentalServicePage />
    </>
  );
}
