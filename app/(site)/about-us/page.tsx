export const revalidate = 3600; // 1 hour

import AboutPage from "@/views/About";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = buildPageMetadata({
  title: "About Our Company & Factory Units",
  description:
    "Learn about Portable Office Cabin — our Tamil Nadu and Karnataka manufacturing units, build process, quality standards and modular building expertise.",
  path: "/about-us",
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: "https://portableofficecabin.com" },
          { name: "About Us", url: "https://portableofficecabin.com/about-us" },
        ])}
      />
      <AboutPage />
    </>
  );
}
