import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createStaticClient } from "@/lib/supabase/static";
import DynamicBlogPost from "@/views/blog/DynamicBlogPost";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";

const SITE = "https://portableofficecabin.com";

export const revalidate = 86400; // 24 hours — matches blog layout

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
  const supabase = createStaticClient();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("title, excerpt, meta_title, meta_description, meta_keywords, featured_image_url")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!post) {
    return { title: "Blog Post | Portable Office Cabin" };
  }

  const url = `${SITE}/blog/${slug}`;
  return {
    title: post.meta_title || `${post.title} | Portable Office Cabin Blog`,
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
  const supabase = createStaticClient();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

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
