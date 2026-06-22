export const revalidate = 3600; // 1 hour

import Index from "@/views/Index";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  absoluteTitle: "Portable Office Cabin Manufacturer in India | PUF Cabins",
  description:
    "Portable Office Cabin manufactures PUF portable cabins, site offices, container offices, prefab homes and labour colonies with turnkey delivery across India.",
  path: "/",
});

export default function Page() {
  return <Index />;
}
