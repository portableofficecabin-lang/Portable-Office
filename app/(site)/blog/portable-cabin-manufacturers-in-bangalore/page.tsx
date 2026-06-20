import PortableCabinManufacturersBangalore from "@/views/blog/PortableCabinManufacturersBangalore";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 86400; // 24 hours

export const metadata = buildPageMetadata({
  absoluteTitle: "Portable Cabin Manufacturers in Bangalore | Portable Office Cabin",
  description:
    "Find reliable portable cabin manufacturers in Bangalore. Types, pricing (2025–2026), features, customization options, and step-by-step process from enquiry to installation across Bengaluru.",
  keywords:
    "portable cabin manufacturers Bangalore, portable cabin Bengaluru, portable office cabin Bangalore, MS portable cabin, container office Bangalore, site office cabin, security cabin Bangalore, portable cabin price Bangalore",
  path: "/blog/portable-cabin-manufacturers-in-bangalore",
  ogType: "article",
});

export default function Page() {
  return <PortableCabinManufacturersBangalore />;
}
