import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { JsonLd } from "@/components/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { getAllProductsMerged } from "@/lib/products/server";
import { PortableCabinContent } from "@/components/products/PortableCabinContent";
import { PortableCabinModelsTable } from "@/components/products/PortableCabinModelsTable";
import { ProductGuidesSection } from "@/components/products/ProductGuidesSection";

/**
 * PORTABLE CABIN — the range hub of the Portable Cabins category.
 * Canonical URL: /products/portable-cabin. A STATIC segment that wins over /products/[slug], so it
 * needs no catalogue entry; it sells nothing itself (Service schema, no Offer).
 *
 * ── INTENT (retargeted 2026-10-10) ──────────────────────────────────────────────────────────
 * This page was titled "Portable Cabin Manufacturer in India" — the same intent as the home page
 * ("Portable Office Cabin Manufacturer in India"), which already holds that query: Search Console
 * showed the home page with ~1,460 impressions for "portable cabin" and this URL with 4. The page
 * now owns the PRODUCT intent: sizes, specifications, materials and prices of the range, with a
 * live models table above the buyer's guide. Home page = manufacturer; category page = compare
 * and buy; this page = the specification overview. Do not put "manufacturer" back in the H1.
 *
 * ── LINKS ───────────────────────────────────────────────────────────────────────────────────
 * Being outside the catalogue, no catalogue-driven surface (cards, A–Z index, related rail) can
 * link here, and until 2026-10-10 nothing on the home page, /products or the category page did.
 * Inbound links now come from the home-page hub (InternalLinkingHub), the category intro
 * (PortableCabinsCategoryContent), every Portable Cabins product page (PortableCabinGuideLinks)
 * and the guide children. This page links DOWN to every purchasable model
 * (PortableCabinModelsTable) and to the guides (ProductGuidesSection).
 *
 * Breadcrumb goes THROUGH the category — visible trail and BreadcrumbList agree — exactly as on
 * every product page and on the metal hub. It used to skip the category.
 */

const SITE = "https://portableofficecabin.com";
const PATH = "/products/portable-cabin";
const CATEGORY_PATH = "/products/category/portable-cabins";
/* The root layout appends " | Portable Office Cabin" once. */
const TITLE = "Portable Cabin Sizes, Specifications & Prices";
/* Mirrored by PortableCabinGuideLinks (HUB_LABEL) as the anchor text pointing here — change both. */
const H1 = "Portable Cabin: Sizes, Specifications & Prices";
const DESCRIPTION =
  "Portable cabin sizes, MS, GI and PUF-panel builds, insulation, layouts and fixed GST-inclusive prices for every model. Compare and order online across India.";
/* Visible intro under the H1. Every claim is backed by the catalogue: standard and custom sizes,
   MS / hot-dip galvanised / PUF-panel builds and a fixed GST-inclusive price exist on the models
   listed in the table directly below. */
const INTRO =
  "Every portable cabin we make, in one place: standard and custom sizes, the mild steel, galvanised and PUF-panel builds, insulation and layout options, and the fixed GST-inclusive price of each model. Pick a model below for its full specification, or read the guides further down the page.";
const IMAGE = `${SITE}/images/products/portable-cabin.webp`;

export const revalidate = 1800; // 30 minutes

export const metadata: Metadata = buildPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  keywords:
    "portable cabin, portable cabin sizes, portable cabin specifications, portable cabin price, portable cabin price India, prefab portable cabin, MS portable cabin, PUF portable cabin, site office cabin",
  path: PATH,
  ogImage: IMAGE,
});

export default async function PortableCabinPage() {
  // The same ISR-cached merged catalogue the category and product pages read, so the models table
  // shows exactly the names and prices the cards, the product pages and the feed show.
  const products = await getAllProductsMerged();

  return (
    <Layout>
      <JsonLd
        data={[
          generateBreadcrumbSchema([
            { name: "Home", url: SITE },
            { name: "Products", url: `${SITE}/products` },
            { name: "Portable Cabins", url: `${SITE}${CATEGORY_PATH}` },
            { name: "Portable Cabin", url: `${SITE}${PATH}` },
          ]),
          /* Service, not Product. This is a RANGE hub, not a sellable unit: it carries no
               offer, and Google rejects a Product node that has none ("Either 'offers',
               'review' or 'aggregateRating' should be specified"). The individual cabins are
               marked up as Products with real offers on their own pages. */
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: H1,
            description: DESCRIPTION,
            image: IMAGE,
            brand: { "@type": "Brand", name: "Portable Office Cabin" },
            provider: { "@type": "Organization", name: "Portable Office Cabin", url: SITE },
            serviceType: "Portable Cabins",
            category: "Portable Cabins",
            url: `${SITE}${PATH}`,
          },
        ]}
      />

      {/* Breadcrumb — mirrors the JSON-LD above so the visible trail and the markup agree. */}
      <section className="bg-muted/50 py-4 border-b border-border">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-accent">Home</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Link href="/products" className="text-muted-foreground hover:text-accent">Products</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Link href={CATEGORY_PATH} className="text-muted-foreground hover:text-accent">Portable Cabins</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-foreground font-medium" aria-current="page">Portable Cabin</span>
          </nav>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          <div className="max-w-3xl mb-12">
            <Link
              href={CATEGORY_PATH}
              className="text-accent font-medium text-sm tracking-wider hover:underline"
            >
              PORTABLE CABINS
            </Link>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mt-3 mb-4">
              {H1}
            </h1>
            <p className="text-lg text-muted-foreground">{INTRO}</p>
          </div>

          {/* The products this hub is the overview for — live names, sizes, builds and prices. */}
          <PortableCabinModelsTable products={products} />

          <div className="mt-16">
            <PortableCabinContent />
          </div>

          {/* Child tier of the SEO hierarchy — every guide under /products/portable-cabin/…
              (registry-driven; the grid and the routes can never go out of sync). */}
          <ProductGuidesSection parentSlug="portable-cabin" />
        </div>
      </section>
    </Layout>
  );
}
