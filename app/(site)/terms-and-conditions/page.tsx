export const revalidate = 3600; // 1 hour

import TermsConditionsPage from "@/views/TermsConditions";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = buildPageMetadata({
  title: "Terms & Conditions",
  description:
    "Read the terms and conditions for purchasing, renting or using products and services from Portable Office Cabin — pricing, orders, liability and more.",
  path: "/terms-and-conditions",
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: "https://portableofficecabin.com" },
          { name: "Terms & Conditions", url: "https://portableofficecabin.com/terms-and-conditions" },
        ])}
      />
      <TermsConditionsPage />
    </>
  );
}
