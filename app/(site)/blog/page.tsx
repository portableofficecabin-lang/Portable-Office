import BlogPage from "@/views/Blog";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Blog — Prefab Cabin Guides & Insights",
  description:
    "Guides, cost breakdowns and comparisons on portable cabins, prefab homes, labour colonies and container offices from Portable Office Cabin.",
  path: "/blog",
});

export default function Page() {
  return <BlogPage />;
}
