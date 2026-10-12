// SERVER COMPONENT — category-matched context links on a product page: where the product is
// delivered (location pages for THIS category only), the buying guides that apply to it, and a
// way back up to the category's comparison table.
//
// The links come from CATEGORY_LINKS in src/data/categoryLandings.ts — the same lists the
// category page shows — so a product and its category always point at the same pages. A product
// whose category has no entry renders nothing. Location anchors are the place name under a
// category heading ("Security cabins by location" → "Bangalore"), not a repeated exact-match
// phrase on every link.
import Link from "next/link";
import { ArrowRight, BookOpen, MapPin } from "lucide-react";

import { CATEGORY_LINKS } from "@/data/categoryLandings";

const chip =
  "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground transition hover:border-accent/60 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export function ProductContextLinks({
  categorySlug,
  categoryName,
}: {
  categorySlug: string;
  categoryName: string;
}) {
  const links = CATEGORY_LINKS[categorySlug];
  if (!links || (links.locationLinks.length === 0 && links.guideLinks.length === 0)) return null;

  const headingId = `context-links-${categorySlug}`;

  return (
    <section aria-labelledby={headingId} className="mt-16 rounded-2xl border border-border/60 bg-muted/30 p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={headingId} className="font-display text-xl sm:text-2xl font-bold text-foreground">
          {links.locationLinks.length > 0 && links.guideLinks.length > 0
            ? "Delivery Areas and Buying Guides"
            : links.locationLinks.length > 0
              ? "Delivery Areas"
              : "Buying Guides"}
        </h2>
        <Link
          href={`/products/category/${categorySlug}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
        >
          {`Compare all ${categoryName} by size and price`}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {links.locationLinks.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {links.locationHeading ?? `${categoryName} by location`}
          </h3>
          <ul className="flex flex-wrap gap-2.5">
            {links.locationLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={chip}>
                  <MapPin className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                  {l.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {links.guideLinks.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Buying guides
          </h3>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {links.guideLinks.map((l) => (
              <li key={l.href} className="flex items-start gap-2.5">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <div>
                  <Link
                    href={l.href}
                    className="font-medium text-foreground hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                  >
                    {l.name}
                  </Link>
                  {l.description && <p className="text-sm text-muted-foreground">{l.description}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
