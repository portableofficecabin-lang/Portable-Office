import LabourShedBlog from "@/views/blog/LabourShedPrefabricatedStructures";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 86400; // 24 hours

export const metadata = buildPageMetadata({
  absoluteTitle:
    "Labour Shed Prefabricated Structures – Portable Cabin Manufacturer | Portable Office Cabin",
  description:
    "Prefabricated labour sheds for construction sites in India. 40–60% faster deployment, 8–15 year lifespan, modular design for 50–1000+ workers. Get a free quote!",
  keywords:
    "labour shed, prefabricated labour shed, labour camp prefab, worker accommodation prefab, construction labour shed, prefab labour colony, labour shed manufacturer India, portable labour shed",
  path: "/blog/labour-shed-prefabricated-structures",
  ogType: "article",
});

export default function Page() {
  return <LabourShedBlog />;
}
