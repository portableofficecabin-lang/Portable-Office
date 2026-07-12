export const revalidate = 3600; // 1 hour

import PaymentPolicyPage from "@/views/PaymentPolicy";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = buildPageMetadata({
  title: "Payment Policy",
  description:
    "Payment policy of Portable Office Cabin — indicative starting prices exclusive of GST, GST charged extra, accepted payment methods (NEFT/RTGS/IMPS, UPI, cheque, demand draft), 40-50% advance and GST tax invoice. No payment is taken through this website.",
  path: "/payment-policy",
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: "https://portableofficecabin.com" },
          { name: "Payment Policy", url: "https://portableofficecabin.com/payment-policy" },
        ])}
      />
      <PaymentPolicyPage />
    </>
  );
}
