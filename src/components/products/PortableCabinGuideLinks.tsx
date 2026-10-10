// SERVER COMPONENT — cross-links every product in the Portable Cabins category to the
// category's hub page (/products/portable-cabin) and to three of the guide pages registered
// under it (src/data/productChildPages.ts).
//
// ── WHY THIS EXISTS ──────────────────────────────────────────────────────────────────────
// The hub is a STATIC route with no catalogue entry. Every link surface on this site is
// generated from the catalogue — product cards, the A–Z index, the category price table, the
// related-products rail, the footer — so none of them could ever emit a link to it. Audited on
// 2026-10-10: zero inbound links from the home page, /products, the Portable Cabins category
// page or any product page; Search Console recorded no internal links to it at all. This block
// gives each portable-cabin product a short, relevant set of links upward: the hub plus the
// three guides that best match that product.
//
// Guide slugs are resolved against the registry, so an unknown slug renders nothing rather
// than a broken link, and anchor text is the destination page's own H1 — never a keyword
// pasted in by hand.
import Link from "next/link";
import { ArrowRight, BookOpen, LayoutGrid } from "lucide-react";

import { getChildGroup } from "@/data/productChildPages";

const HUB_PARENT_SLUG = "portable-cabin";
const HUB_HREF = `/products/${HUB_PARENT_SLUG}`;
/* Mirrors the hub page's H1 (app/(site)/products/portable-cabin/page.tsx) so the anchor says
   exactly what the destination is about. Change both together. */
const HUB_LABEL = "Portable Cabin: Sizes, Specifications & Prices";
const HUB_NOTE =
  "Every portable cabin model we build — sizes, materials and current GST-inclusive prices on one page.";

const DEFAULT_GUIDES = ["price-and-cost-guide", "sizes-and-dimensions", "materials-ms-vs-puf"];

/** The three guides most relevant to each product. A slug not listed here gets DEFAULT_GUIDES. */
const GUIDES_BY_PRODUCT_SLUG: Record<string, string[]> = {
  "porta-cabin": ["price-and-cost-guide", "sizes-and-dimensions", "buying-guide-new-vs-used"],
  "office-portable-cabin": ["layouts-and-interiors", "sizes-and-dimensions", "price-and-cost-guide"],
  "ms-portable-cabin": ["materials-ms-vs-puf", "maintenance-and-lifespan", "price-and-cost-guide"],
  "steel-portable-cabin": ["materials-ms-vs-puf", "sizes-and-dimensions", "transport-and-delivery"],
  "prefabricated-portable-cabin": ["installation-and-site-preparation", "transport-and-delivery", "price-and-cost-guide"],
  "prefab-porta-cabin": ["installation-and-site-preparation", "sizes-and-dimensions", "price-and-cost-guide"],
  "cabin-portable": ["insulation-and-cooling", "materials-ms-vs-puf", "price-and-cost-guide"],
  "executive-portable-cabin-20ft": ["layouts-and-interiors", "insulation-and-cooling", "price-and-cost-guide"],
  "portable-cabin-40ft-bunkhouse": ["with-toilet-and-pantry", "sizes-and-dimensions", "price-and-cost-guide"],
  "labor-hutments": ["with-toilet-and-pantry", "insulation-and-cooling", "price-and-cost-guide"],
  "prefabricated-labour-hutments-staff-accommodation": ["with-toilet-and-pantry", "insulation-and-cooling", "price-and-cost-guide"],
};

const cardClass =
  "group flex flex-col rounded-2xl border border-border/60 bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export function PortableCabinGuideLinks({ productSlug }: { productSlug: string }) {
  const group = getChildGroup(HUB_PARENT_SLUG);
  if (!group) return null;

  const wanted = GUIDES_BY_PRODUCT_SLUG[productSlug] ?? DEFAULT_GUIDES;
  const guides = wanted
    .map((slug) => group.children.find((child) => child.slug === slug))
    .filter((child): child is NonNullable<typeof child> => !!child);

  return (
    <section className="mt-16" aria-labelledby="portable-cabin-guides-heading">
      <span className="inline-block text-accent font-semibold text-sm uppercase tracking-wider mb-3">
        GUIDES &amp; BUYING HELP
      </span>
      <h2
        id="portable-cabin-guides-heading"
        className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3"
      >
        Portable Cabin Guides
      </h2>
      <p className="mb-8 max-w-2xl text-muted-foreground">
        Not sure this is the right cabin for your site? Start with the overview of the whole range,
        then read the guides that match what you are planning.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href={HUB_HREF} className={cardClass}>
          <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
            <LayoutGrid className="h-[18px] w-[18px] text-accent" aria-hidden="true" />
          </span>
          <span className="font-display font-bold text-foreground">{HUB_LABEL}</span>
          <span className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{HUB_NOTE}</span>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent">
            See the full range
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </Link>
        {guides.map((child) => (
          <Link key={child.slug} href={`/products/${group.parentSlug}/${child.slug}`} className={cardClass}>
            <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
              <BookOpen className="h-[18px] w-[18px] text-accent" aria-hidden="true" />
            </span>
            <span className="font-display font-bold text-foreground">{child.h1}</span>
            <span className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{child.metaDescription}</span>
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
