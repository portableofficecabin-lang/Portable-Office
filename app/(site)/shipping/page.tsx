export const revalidate = 3600; // 1 hour

import ShippingDeliveryPage from "@/views/ShippingDelivery";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Shipping & Delivery Information",
  description:
    "Shipping, delivery and installation details for portable cabins and containers — timelines, transport and site requirements.",
  path: "/shipping",
});

export default function Page() {
  return <ShippingDeliveryPage />;
}
