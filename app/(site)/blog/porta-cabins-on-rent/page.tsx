import PortaCabinsOnRentBlog from "@/views/blog/PortaCabinsOnRent";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 86400; // 24 hours

export const metadata = buildPageMetadata({
  absoluteTitle: "Renting a Porta Cabin: Costs & Terms | Portable Office Cabin",
  description:
    "What renting a porta cabin involves — rental types, monthly terms, delivery, installation and what to check before you hire.",
  keywords:
    "renting a porta cabin, porta cabin rental terms, portable cabin hire guide, site office hire, security cabin rental, labour accommodation rental",
  path: "/blog/porta-cabins-on-rent",
  ogType: "article",
});

export default function Page() {
  return <PortaCabinsOnRentBlog />;
}
