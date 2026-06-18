export const revalidate = 3600; // 1 hour

import WarrantyPage from "@/views/Warranty";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Product Warranty Details",
  description:
    "Warranty coverage and terms for Portable Office Cabin products — structure, panels and fittings.",
  path: "/warranty",
});

export default function Page() {
  return <WarrantyPage />;
}
