export const revalidate = 3600; // 1 hour

import WarrantyPage from "@/views/Warranty";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = buildPageMetadata({
  title: "Product Warranty & Coverage Details",
  description:
    "Warranty coverage and terms for Portable Office Cabin products — structure, PUF panels, doors, windows and fittings, plus what's covered and how to claim.",
  path: "/warranty",
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: "https://portableofficecabin.com" },
          { name: "Warranty", url: "https://portableofficecabin.com/warranty" },
        ])}
      />
      <WarrantyPage />
    </>
  );
}
