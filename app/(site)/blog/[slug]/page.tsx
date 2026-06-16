import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createStaticClient } from "@/lib/supabase/static";
import DynamicBlogPost from "@/views/blog/DynamicBlogPost";

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

  return {
    title: post.meta_title || `${post.title} | Portable Office Cabin Blog`,
    description: post.meta_description || post.excerpt || post.title,
    keywords: post.meta_keywords || undefined,
    openGraph: {
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt || undefined,
      images: post.featured_image_url ? [post.featured_image_url] : undefined,
      type: "article",
      url: `https://portableofficecabin.com/blog/${slug}`,
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

  return <DynamicBlogPost post={post} />;
}
