export const revalidate = 3600; // 1 hour

import RentalServicePage from "@/views/RentalService";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Portable Cabin & Container Rental Service",
  description:
    "Rent or hire portable cabins, site offices and shipping containers on flexible monthly terms with delivery, setup and maintenance support across India.",
  path: "/rental-service",
});

export default function Page() {
  return <RentalServicePage />;
}
