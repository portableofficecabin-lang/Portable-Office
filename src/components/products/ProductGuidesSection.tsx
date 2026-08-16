// SERVER COMPONENT — the parent side of the product SEO hierarchy: a "Guides & buying help"
// grid on the main product page linking every child page under it (registry:
// src/data/productChildPages.ts). Renders nothing for products without children, so it can be
// mounted unconditionally and lights up as groups are added per product.
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import { getChildGroup } from "@/data/productChildPages";

export function ProductGuidesSection({ parentSlug }: { parentSlug: string }) {
  const group = getChildGroup(parentSlug);
  if (!group || group.children.length === 0) return null;

  return (
    <section className="mt-16" aria-labelledby="product-guides-heading">
      <span className="inline-block text-accent font-semibold text-sm uppercase tracking-wider mb-3">
        GUIDES &amp; BUYING HELP
      </span>
      <h2 id="product-guides-heading" className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3">
        {`${group.parentName} Guides`}
      </h2>
      <p className="mb-8 max-w-2xl text-muted-foreground">
        {`Everything worth knowing before you choose a ${group.parentName.toLowerCase()} — prices, sizes, materials, installation and more, each covered in its own detailed guide.`}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {group.children.map((c) => (
          <Link
            key={c.slug}
            href={`/products/${group.parentSlug}/${c.slug}`}
            className="group flex flex-col rounded-2xl border border-border/60 bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg"
          >
            <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
              <BookOpen className="h-[18px] w-[18px] text-accent" aria-hidden="true" />
            </span>
            <span className="font-display font-bold text-foreground">{c.h1}</span>
            <span className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{c.metaDescription}</span>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent">
              Read the guide
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
