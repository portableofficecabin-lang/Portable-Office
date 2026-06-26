import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createStaticClient } from "@/lib/supabase/static";
import DynamicBlogPost from "@/views/blog/DynamicBlogPost";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";

const SITE = "https://portableofficecabin.com";

export const revalidate = 86400; // 24 hours — matches blog layout

// Single cache()-wrapped fetch so generateMetadata and the page body share ONE
// Supabase query for the post instead of two identical round-trips per render.
const getPostBySlug = cache(async (slug: string) => {
  const supabase = createStaticClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data;
});

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const supabase = createStaticClient();
    const { data } = await supabase
      .from("blog_posts")
      .select("slug")
      .eq("status", "published");

    return (data || []).map((page) => ({ slug: page.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return { title: "Blog Post" };
  }

  const url = `${SITE}/blog/${slug}`;
  return {
    // If an admin meta_title is set, use it verbatim (absolute, no template);
    // otherwise let the root layout template append the brand once to post.title.
    title: post.meta_title ? { absolute: post.meta_title } : post.title,
    description: post.meta_description || post.excerpt || post.title,
    keywords: post.meta_keywords || undefined,
    alternates: { canonical: url },
    openGraph: {
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt || undefined,
      images: post.featured_image_url ? [post.featured_image_url] : undefined,
      type: "article",
      url,
    },
    twitter: {
      card: "summary_large_image",
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt || undefined,
      images: post.featured_image_url ? [post.featured_image_url] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const url = `${SITE}/blog/${post.slug}`;
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || post.meta_description || undefined,
    image: post.featured_image_url || undefined,
    author: {
      "@type": "Organization",
      name: "Portable Office Cabin",
      url: SITE,
    },
    publisher: {
      "@type": "Organization",
      name: "Portable Office Cabin",
      url: SITE,
    },
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at,
    mainEntityOfPage: url,
  };

  return (
    <>
      {/* Preload the blog hero (LCP candidate, remote Supabase image) so the
          scanner fetches it at high priority before body parse reaches the <img>. */}
      {post.featured_image_url && (
        <link
          rel="preload"
          as="image"
          href={post.featured_image_url}
          // @ts-expect-error fetchpriority is valid HTML, not yet in React's link types
          fetchpriority="high"
        />
      )}
      <JsonLd
        data={[
          generateBreadcrumbSchema([
            { name: "Home", url: SITE },
            { name: "Blog", url: `${SITE}/blog` },
            { name: post.title, url },
          ]),
          articleSchema,
        ]}
      />
      <DynamicBlogPost post={post} />
    </>
  );
}
