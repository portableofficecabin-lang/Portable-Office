import PortaCabinsOnRentBlog from "@/views/blog/PortaCabinsOnRent";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 86400; // 24 hours

export const metadata = buildPageMetadata({
  absoluteTitle: "Porta Cabins on Rent – Flexible Portable Space | Portable Office Cabin",
  description:
    "Rent porta cabins across India. Office cabins, security cabins, labour accommodation, container offices & portable toilets on hire. 3–7 day delivery. Get a free quote!",
  keywords:
    "porta cabin on rent, portable cabin rental India, site office on hire, container office rent, portable cabin rent Mumbai, porta cabin hire Pune, security cabin rental, labour camp rental India",
  path: "/blog/porta-cabins-on-rent",
  ogType: "article",
});

export default function Page() {
  return <PortaCabinsOnRentBlog />;
}
