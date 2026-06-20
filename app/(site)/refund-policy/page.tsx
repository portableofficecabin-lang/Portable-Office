export const revalidate = 3600; // 1 hour

import RefundPolicyPage from "@/views/RefundPolicy";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = buildPageMetadata({
  title: "Refund & Cancellation Policy",
  description:
    "Understand the refund and cancellation policy of Portable Office Cabin — order cancellation rules, advance payment terms, refund timelines and damaged product handling.",
  path: "/refund-policy",
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: "https://portableofficecabin.com" },
          { name: "Refund Policy", url: "https://portableofficecabin.com/refund-policy" },
        ])}
      />
      <RefundPolicyPage />
    </>
  );
}
