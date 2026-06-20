import MSPortableCabinBlog from "@/views/blog/MSPortableCabinBlog";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 86400; // 24 hours

export const metadata = buildPageMetadata({
  absoluteTitle: "MS Portable Cabin - Durable Mild Steel Modular Building | Portable Office Cabin",
  description:
    "Complete guide to MS portable cabins. Heavy-duty mild steel construction, advanced insulation, weather-resistant coatings, modular design for offices, security booths & site accommodation.",
  keywords:
    "MS portable cabin, mild steel portable cabin, modular building solution, portable office cabin, steel portable cabin, prefabricated portable cabin, portable site office, MS porta cabin",
  path: "/blog/ms-portable-cabin-durable-mild-steel-modular-building",
  ogType: "article",
});

export default function Page() {
  return <MSPortableCabinBlog />;
}
