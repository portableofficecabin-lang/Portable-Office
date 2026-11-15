import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { CATEGORY_LINKS } from "@/data/categoryLandings";
import { JsonLd } from "@/components/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { PortableToiletContent } from "@/components/products/PortableToiletContent";
import { ProductGuidesSection } from "@/components/products/ProductGuidesSection";

// Dedicated, indexable landing page for the high-intent "portable toilet cabin"
// query. This static segment takes precedence over /products/[slug], so it does NOT
// need a product entry. Single canonical URL: /products/portable-toilet-cabin.

const SITE = "https://portableofficecabin.com";
const PATH = "/products/portable-toilet-cabin";
const H1 = "Portable Toilet Cabin";
const DESCRIPTION =
  "Portable toilet cabin manufacturer in India — MS, GI, FRP & bio-toilet units with water tanks, exhaust and western/Indian pans. Single & multi-seater, fast pan-India delivery.";
const IMAGE = `${SITE}/images/products/portable-toilet.webp`;
const TOILET_LOCATION_LINKS = CATEGORY_LINKS["portable-toilet-cabins"]?.locationLinks ?? [];

export const revalidate = 1800; // 30 minutes

export const metadata: Metadata = buildPageMetadata({
  title: "Portable Toilet Cabin Manufacturer in India",
  description: DESCRIPTION,
  keywords:
    "portable toilet cabin, portable toilet manufacturer India, MS portable toilet, FRP portable toilet, bio toilet cabin, mobile toilet van, portable toilet price India, construction site toilet",
  path: PATH,
  ogImage: IMAGE,
});

export default function PortableToiletCabinPage() {
  return (
    <Layout>
      <JsonLd
        data={[
          generateBreadcrumbSchema([
            { name: "Home", url: SITE },
            { name: "Products", url: `${SITE}/products` },
            /* Through the category, as on every product page and the metal hub — the trail used to
               skip it (2026-10-10). The visible breadcrumb below mirrors this. */
            { name: "Portable Toilet Cabins", url: `${SITE}/products/category/portable-toilet-cabins` },
            { name: "Portable Toilet Cabin", url: `${SITE}${PATH}` },
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
            serviceType: "Portable Toilet Cabins",
            category: "Portable Toilet Cabins",
            url: `${SITE}${PATH}`,
          },
        ]}
      />

      {/* Breadcrumb */}
      <section className="bg-muted/50 py-4 border-b border-border">
        <div className="container-custom">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-accent">Home</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Link href="/products" className="text-muted-foreground hover:text-accent">Products</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Link href="/products/category/portable-toilet-cabins" className="text-muted-foreground hover:text-accent">Portable Toilet Cabins</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground font-medium">Portable Toilet Cabin</span>
          </nav>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          <div className="max-w-3xl mb-12">
            <Link
              href="/products/category/portable-toilet-cabins"
              className="text-accent font-medium text-sm tracking-wider hover:underline"
            >
              PORTABLE TOILET CABINS
            </Link>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mt-3 mb-4">
              {H1}
            </h1>
            <p className="text-lg text-muted-foreground">{DESCRIPTION}</p>
          </div>
          <PortableToiletContent />

          {/* Location pages for the range (2026-11-05): the portable-toilet category's location list
              (CATEGORY_LINKS, the same list the category page and the 4-unit block page show), so
              every portable-toilet city page is linked from this main toilet page as soon as it is
              added there. Place-name anchors, as on the category page. Rendered here, not inside
              PortableToiletContent, which the purchasable 4-unit block page also renders. */}
          {TOILET_LOCATION_LINKS.length > 0 && (
            <nav
              aria-labelledby="toilet-cabin-locations"
              className="mb-12 rounded-2xl border border-border/60 bg-muted/30 p-5 sm:p-7"
            >
              <h2 id="toilet-cabin-locations" className="font-display text-xl sm:text-2xl font-bold text-foreground">
                Portable Toilet Cabins by Location
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2.5">
                {TOILET_LOCATION_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground transition hover:border-accent/60 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <MapPin className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                      {l.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* Child tier of the SEO hierarchy — every guide under /products/portable-toilet-cabin/…
              (registry-driven; the grid and the routes can never go out of sync). Renders nothing
              until a child group is registered for this parent, so it is safe to mount now. */}
          <ProductGuidesSection parentSlug="portable-toilet-cabin" />
        </div>
      </section>
    </Layout>
  );
}
