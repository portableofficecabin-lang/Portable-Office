import PortableCabinManufacturersBangalore from "@/views/blog/PortableCabinManufacturersBangalore";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 86400; // 24 hours

export const metadata = buildPageMetadata({
  absoluteTitle: "How to Choose a Portable Cabin Supplier in Bengaluru",
  description:
    "A buyer's guide to choosing a portable cabin supplier in Bengaluru — cabin types, features for the local climate, what decides the price, and the order process.",
  keywords:
    "choose portable cabin supplier Bengaluru, portable cabin buying guide, portable cabin types, portable cabin features, what decides portable cabin price, site office cabin, security cabin",
  path: "/blog/portable-cabin-manufacturers-in-bangalore",
  ogType: "article",
});

export default function Page() {
  return <PortableCabinManufacturersBangalore />;
}
