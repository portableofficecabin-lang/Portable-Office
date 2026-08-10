import BlogPage, { type BlogDbRow } from "@/views/Blog";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { createStaticClient } from "@/lib/supabase/static";

// ISR: the listing re-renders at most hourly, so an admin-published post reaches the
// SERVER HTML (not just the client refresh) within the hour. Static posts are always
// in the HTML regardless.
export const revalidate = 3600;

export const metadata = buildPageMetadata({
  title: "Blog — Prefab Cabin Guides",
  description:
    "Guides, cost breakdowns and comparisons on portable cabins, prefab homes, labour colonies and container offices from Portable Office Cabin.",
  path: "/blog",
});

/**
 * Server-side seed for the listing — the same cookie-less static client the blog detail
 * route uses. On ANY failure it degrades to an empty seed: the page still renders every
 * static post, and the view's client-side refresh remains as the safety net, so this can
 * never make the listing worse than it was before the seed existed.
 */
async function getDbRows(): Promise<BlogDbRow[]> {
  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("slug,title,excerpt,category,author,featured,featured_image_url,published_at,created_at")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (error || !data) return [];
    return data as BlogDbRow[];
  } catch {
    return [];
  }
}

export default async function Page() {
  const initialDbRows = await getDbRows();
  return (
    <>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: "https://portableofficecabin.com" },
          { name: "Blog", url: "https://portableofficecabin.com/blog" },
        ])}
      />
      <BlogPage initialDbRows={initialDbRows} />
    </>
  );
}
