export const revalidate = 3600; // 1 hour

import FAQPage from "@/views/FAQ";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { generateFAQSchema, generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { faqCategories } from "@/data/faqs";

export const metadata = buildPageMetadata({
  title: "Frequently Asked Questions (FAQ)",
  description:
    "Answers to common questions about portable cabins — pricing, materials, delivery time, customization, warranty and installation.",
  path: "/faq",
});

const faqSchema = generateFAQSchema(
  faqCategories.flatMap((cat) =>
    cat.faqs.map((f) => ({ question: f.q, answer: f.a })),
  ),
);

export default function Page() {
  return (
    <>
      <JsonLd
        data={[
          faqSchema,
          generateBreadcrumbSchema([
            { name: "Home", url: "https://portableofficecabin.com" },
            { name: "FAQ", url: "https://portableofficecabin.com/faq" },
          ]),
        ]}
      />
      <FAQPage />
    </>
  );
}
