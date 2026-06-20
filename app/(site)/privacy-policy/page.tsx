export const revalidate = 3600; // 1 hour

import PrivacyPolicyPage from "@/views/PrivacyPolicy";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = buildPageMetadata({
  title: "Privacy Policy",
  description:
    "Read the privacy policy of Portable Office Cabin. Learn how we collect, use, and protect your personal information when you use our website or services.",
  path: "/privacy-policy",
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: "https://portableofficecabin.com" },
          { name: "Privacy Policy", url: "https://portableofficecabin.com/privacy-policy" },
        ])}
      />
      <PrivacyPolicyPage />
    </>
  );
}
