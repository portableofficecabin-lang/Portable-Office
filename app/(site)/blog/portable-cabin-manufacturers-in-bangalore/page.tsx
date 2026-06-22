import PortableCabinManufacturersBangalore from "@/views/blog/PortableCabinManufacturersBangalore";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 86400; // 24 hours

export const metadata = buildPageMetadata({
  absoluteTitle: "Portable Cabin Manufacturers in Bangalore | Prices",
  description:
    "Reliable portable cabin manufacturers in Bangalore — types, pricing (2025–2026), features, customization & full process from enquiry to installation.",
  keywords:
    "portable cabin manufacturers Bangalore, portable cabin Bengaluru, portable office cabin Bangalore, MS portable cabin, container office Bangalore, site office cabin, security cabin Bangalore, portable cabin price Bangalore",
  path: "/blog/portable-cabin-manufacturers-in-bangalore",
  ogType: "article",
});

export default function Page() {
  return <PortableCabinManufacturersBangalore />;
}
