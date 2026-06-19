"use client";

import Link from "next/link";
import { formatDateSafe } from "@/utils/formatDate";
import { Layout } from "@/components/layout/Layout";
import { SEOHead } from "@/components/SEOHead";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, ChevronRight } from "lucide-react";
import type { DBBlogPost } from "@/types/database";

interface DynamicBlogPostProps {
  post: DBBlogPost;
}

export default function DynamicBlogPost({ post }: DynamicBlogPostProps) {
  const publishedDate = post.published_at || post.created_at;
  const canonicalUrl = `https://portableofficecabin.com/blog/${post.slug}`;

  const articleStructuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || post.meta_description,
    image: post.featured_image_url,
    author: {
      "@type": "Organization",
      name: "Portable Office Cabin",
      url: "https://portableofficecabin.com",
    },
    publisher: {
      "@type": "Organization",
      name: "Portable Office Cabin",
      url: "https://portableofficecabin.com",
    },
    datePublished: publishedDate,
    dateModified: post.updated_at,
    mainEntityOfPage: canonicalUrl,
  };

  return (
    <Layout>
      <SEOHead
        title={post.meta_title || `${post.title} | Portable Office Cabin Blog`}
        description={post.meta_description || post.excerpt || post.title}
        keywords={post.meta_keywords || undefined}
        canonicalUrl={canonicalUrl}
        structuredData={[
          generateBreadcrumbSchema([
            { name: "Home", url: "https://portableofficecabin.com" },
            { name: "Blog", url: "https://portableofficecabin.com/blog" },
            { name: post.title, url: canonicalUrl },
          ]),
          articleStructuredData,
        ]}
      />

      <article className="bg-background">
        <section className="relative py-12 md:py-16 overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
          <div className="container mx-auto px-4 max-w-4xl relative z-10">
            <nav className="flex items-center gap-2 text-sm mb-6">
              <Link href="/" className="text-primary-foreground/70 hover:text-primary-foreground">
                Home
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-primary-foreground/50" />
              <Link href="/blog" className="text-primary-foreground/70 hover:text-primary-foreground">
                Blog
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-primary-foreground/50" />
              <span className="text-accent font-medium line-clamp-1">{post.title}</span>
            </nav>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="text-lg text-primary-foreground/85 mb-6 max-w-3xl">
                {post.excerpt}
              </p>
            )}

            <div className="flex items-center gap-2 text-sm text-primary-foreground/75">
              <Calendar className="h-4 w-4 text-accent" />
              {formatDateSafe(publishedDate, "MMMM d, yyyy", "")}
            </div>
          </div>
        </section>

        {post.featured_image_url && (
          <div className="container mx-auto px-4 max-w-4xl -mt-8 relative z-10">
            <img
              src={post.featured_image_url}
              alt={post.title}
              className="w-full rounded-2xl shadow-xl border border-border/50 aspect-[16/9] object-cover"
            />
          </div>
        )}

        <section className="py-10 md:py-14">
          <div className="container mx-auto px-4 max-w-4xl">
            {post.content ? (
              <div
                className="prose prose-lg dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-accent"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            ) : (
              <p className="text-muted-foreground text-lg">{post.excerpt}</p>
            )}

            <div className="mt-12 pt-8 border-t border-border">
              <Button variant="outline" asChild>
                <Link href="/blog">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Blog
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </article>
    </Layout>
  );
}
