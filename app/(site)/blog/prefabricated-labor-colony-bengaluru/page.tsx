import PrefabLabourColonyBengaluru from "@/views/blog/PrefabLabourColonyBengaluru";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 86400; // 24 hours

export const metadata = buildPageMetadata({
  absoluteTitle: "Prefab Labour Colony in Bengaluru: A Planning Guide",
  description:
    "A planning guide to prefabricated labour colonies in Bengaluru — layout, capacity, materials, compliance and the setup process for construction and industrial projects.",
  keywords:
    "prefab labour colony planning guide, labour colony layout Bengaluru, worker accommodation capacity, prefab dormitory design, labour colony compliance, modular worker accommodation Karnataka",
  path: "/blog/prefabricated-labor-colony-bengaluru",
  ogType: "article",
});

export default function Page() {
  return <PrefabLabourColonyBengaluru />;
}
