export const revalidate = 3600; // 1 hour

import ContactPage from "@/views/Contact";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Contact Us & Get a Free Quote",
  description:
    "Contact Portable Office Cabin for a free quotation on cabins and containers. Call, email or send an enquiry — pan-India delivery and installation support.",
  path: "/contact",
});

export default function Page() {
  return <ContactPage />;
}
