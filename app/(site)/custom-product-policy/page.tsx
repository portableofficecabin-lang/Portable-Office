export const revalidate = 3600; // 1 hour

import CustomProductPolicyPage from "@/views/CustomProductPolicy";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = buildPageMetadata({
  title: "Customised Product Policy",
  description:
    "Customised product policy of Portable Office Cabin — products are manufactured to order to your size, layout and specification. Indicative starting prices, quotation-based ordering, manufacturing and delivery timelines, and cancellation rules for custom-built units.",
  path: "/custom-product-policy",
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: "https://portableofficecabin.com" },
          { name: "Customised Product Policy", url: "https://portableofficecabin.com/custom-product-policy" },
        ])}
      />
      <CustomProductPolicyPage />
    </>
  );
}
