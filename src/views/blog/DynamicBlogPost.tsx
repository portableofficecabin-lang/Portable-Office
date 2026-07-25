"use client";

import Link from "next/link";
import { formatDateSafe } from "@/utils/formatDate";
import { Layout } from "@/components/layout/Layout";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar } from "lucide-react";
import type { DBBlogPost } from "@/types/database";

interface DynamicBlogPostProps {
  post: DBBlogPost;
}

export default function DynamicBlogPost({ post }: DynamicBlogPostProps) {
  const publishedDate = post.published_at || post.created_at;

  return (
    <Layout>
      <article className="bg-background">
        {/* The hand-rolled band this replaced set `background: var(--gradient-hero)` — which starts
            at hsl(222 47% 11%) — and then wrote the title in `text-primary-foreground`, which IS
            hsl(222 47% 11%) in the default theme. Every post title rendered navy on identical navy
            at 1.0:1, i.e. invisible. PageHero fixes it with explicit navy/white that cannot drift
            with the theme tokens. */}
        <PageHero
          breadcrumbs={[
            { name: "Home", href: "/" },
            { name: "Blog", href: "/blog" },
            { name: post.title },
          ]}
          title={post.title}
          description={post.excerpt || undefined}
          size="compact"
        >
          <div className="flex items-center gap-2 text-sm text-white/75">
            <Calendar className="h-4 w-4 text-accent" />
            {formatDateSafe(publishedDate, "MMMM d, yyyy", "")}
          </div>
        </PageHero>

        {post.featured_image_url && (
          <div className="container mx-auto px-4 max-w-4xl -mt-8 relative z-10">
            <img
              src={post.featured_image_url}
              alt={post.title}
              width={1600}
              height={900}
              fetchPriority="high"
              decoding="async"
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
