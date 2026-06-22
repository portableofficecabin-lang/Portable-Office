export const revalidate = 3600; // 1 hour

import { buildPageMetadata } from "@/lib/seo/metadata";
import { MarketplacePage } from "@/views/Marketplace";

export const metadata = buildPageMetadata({
  absoluteTitle: "Prefab Marketplace | Portable Cabins & Offers India",
  description:
    "Browse 100+ location deals on portable cabins, container offices, cargo storage & prefab structures across India — Bangalore, Chennai, Hyderabad & more.",
  keywords:
    "portable cabin marketplace, prefab structure offers, container office deals India, portable cabin promotions, location specific prefab offers",
  path: "/marketplace",
});

export default function Page() {
  return <MarketplacePage />;
}
