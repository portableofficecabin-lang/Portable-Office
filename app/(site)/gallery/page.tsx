export const revalidate = 3600; // 1 hour

import ProjectsPage from "@/views/Projects";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";

export const metadata = buildPageMetadata({
  title: "Project Gallery — Cabin Installations",
  description:
    "See real installations of our portable cabins, container offices and prefab structures delivered across India — site offices, labour colonies and more.",
  path: "/gallery",
});

export default function Page() {
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: "https://portableofficecabin.com" },
          { name: "Gallery", url: "https://portableofficecabin.com/gallery" },
        ])}
      />
      <ProjectsPage />
    </>
  );
}
