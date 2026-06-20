export const revalidate = 3600; // 1 hour

import CareersPage from "@/views/Careers";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = buildPageMetadata({
  title: "Careers — Join Our Team",
  description:
    "Explore career opportunities at Portable Office Cabin, India's leading portable cabin and modular building manufacturer. We're hiring talented professionals.",
  path: "/careers",
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: "https://portableofficecabin.com" },
          { name: "Careers", url: "https://portableofficecabin.com/careers" },
        ])}
      />
      <CareersPage />
    </>
  );
}
