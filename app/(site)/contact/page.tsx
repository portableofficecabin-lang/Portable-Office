export const revalidate = 3600; // 1 hour

import ContactPage from "@/views/Contact";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = buildPageMetadata({
  title: "Contact Us",
  description:
    "Contact Portable Office Cabin about cabins and containers. Call, WhatsApp, email or send an enquiry — pan-India delivery and installation support.",
  path: "/contact",
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: "https://portableofficecabin.com" },
          { name: "Contact Us", url: "https://portableofficecabin.com/contact" },
        ])}
      />
      <ContactPage />
    </>
  );
}
