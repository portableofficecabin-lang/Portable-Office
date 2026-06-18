export const revalidate = 3600; // 1 hour

import FAQPage from "@/views/FAQ";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Frequently Asked Questions (FAQ)",
  description:
    "Answers to common questions about portable cabins — pricing, materials, delivery time, customization, warranty and installation.",
  path: "/faq",
});

export default function Page() {
  return <FAQPage />;
}
