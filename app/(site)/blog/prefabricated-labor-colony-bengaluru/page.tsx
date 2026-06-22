import PrefabLabourColonyBengaluru from "@/views/blog/PrefabLabourColonyBengaluru";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 86400; // 24 hours

export const metadata = buildPageMetadata({
  absoluteTitle: "Prefab Labour Colony in Bengaluru | Portable Office Cabin",
  description:
    "Turnkey prefabricated labour colonies in Bengaluru — modular worker accommodation for construction & industrial projects. Fast, relocatable & compliance-ready.",
  keywords:
    "prefabricated labor colony Bengaluru, prefab labour camp Bangalore, modular worker accommodation Karnataka, labour colony construction site, prefab dormitory Bengaluru, worker housing Bangalore",
  path: "/blog/prefabricated-labor-colony-bengaluru",
  ogType: "article",
});

export default function Page() {
  return <PrefabLabourColonyBengaluru />;
}
