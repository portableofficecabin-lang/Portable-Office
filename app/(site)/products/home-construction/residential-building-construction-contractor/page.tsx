/**
 * RESIDENTIAL BUILDING CONSTRUCTION CONTRACTOR
 * Canonical URL: /products/home-construction/residential-building-construction-contractor
 *
 * ── THIS IS THE SECOND CONTRACTOR PAGE. READ BEFORE EDITING EITHER. ─────────────────────────
 * Created 2026-09-06 from the owner's supplied copy deck. The owner instructed explicitly that
 * the pre-existing contractor page be left untouched:
 *     /products/home-construction/building-construction-contractor
 * That page still exists, still ranks, and is not modified by this one. The two are SIBLINGS
 * under the Home Construction category.
 *
 * ── URL ─────────────────────────────────────────────────────────────────────────────────────
 * The copy deck originally asked for the top-level slug /building-construction-contractor. The
 * owner changed it on 2026-09-06 to sit under Home Construction with "residential" in the name,
 * which is also what resolves the keyword overlap. Home Construction is a CATEGORY
 * (/products/category/home-construction) and child pages in this codebase live at
 * /products/<parent>/<child> — see src/data/productChildPages.ts for that URL contract. Like its
 * sibling this is a bespoke STATIC route rather than a registry entry, because it carries a hero
 * and its own section rhythm rather than the registry's fixed template. Static segments win over
 * /products/[slug]/[child], so nothing in the registry or the size-variant ladder is shadowed.
 *
 * No redirect exists from the originally-requested /building-construction-contractor: that URL
 * was never deployed, so there is nothing to preserve.
 *
 * ── THE TWO PAGES MUST STAY DISTINGUISHABLE ─────────────────────────────────────────────────
 * They address neighbouring queries, so the split below is what keeps them from competing:
 *   THIS page → RESIDENTIAL intent, Hosur AND Bangalore. H1 "Residential Building Construction
 *               Contractor". The two contract models, the six-stage process, the "what to ask any
 *               contractor" checklist. Its own five photographs.
 *   SIBLING   → the general contractor query, Bangalore only. H1 "Building Construction
 *               Contractor in Bangalore". Technical depth this page does not carry: quality
 *               gates, the written-specification breakdown, cost and time drivers. Its own five
 *               photographs.
 * This page links to the sibling with the anchor "building construction contractor in Bangalore"
 * (see RELATED_LINKS in the content component) — that anchor is deliberate and assigns the
 * city-qualified general query to the sibling.
 *
 * ── SEO SHAPE ───────────────────────────────────────────────────────────────────────────────
 * Fully server-rendered: H1, service body, FAQ text, breadcrumb and internal links are all in the
 * initial HTML.
 *
 * NO Product or Offer-with-price schema. This is a quote-only service with no fixed price — the
 * same reason POC-CIB-RCC carries kind:"service" + priceConfirmed:false and stays out of the
 * Merchant feed. Service + BreadcrumbList + FAQPage are the correct types, and there is not a
 * single ₹ figure on the page.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Phone } from "lucide-react";

import { JsonLd } from "@/components/JsonLd";
import { Layout } from "@/components/layout/Layout";
import { OptimizedImage } from "@/components/OptimizedImage";
import {
  RESIDENTIAL_BUILDING_CONSTRUCTION_CONTRACTOR_FAQS,
  ResidentialBuildingConstructionContractorContent,
} from "@/components/products/ResidentialBuildingConstructionContractorContent";
import { COMPANY } from "@/lib/company";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbSchema, generateFAQSchema } from "@/lib/seo/structured-data";

export const revalidate = 1800; // 30 minutes, matching the other service landing pages

const SITE = "https://portableofficecabin.com";
const PATH = "/products/home-construction/residential-building-construction-contractor";
/* "Residential" is load-bearing, not decoration: it is the whole reason this page and its sibling
 * /products/home-construction/building-construction-contractor do not compete for one query. Do
 * not shorten this H1 to "Building Construction Contractor" — that is the sibling's heading. */
const H1 = "Residential Building Construction Contractor";
const DESCRIPTION =
  "Residential building construction contractor in Hosur & Bangalore for houses, villas and " +
  "factory sheds. Written estimates, stage-wise payments. Call 97318 97976.";
const HERO_IMAGE = `${SITE}/images/products/building-construction-contractor/building-construction-contractor-villa-front-elevation-pool.webp`;

export const metadata: Metadata = buildPageMetadata({
  title: H1,
  description: DESCRIPTION,
  keywords:
    "residential building construction contractor, residential construction contractor, " +
    "house construction contractor, turnkey construction contractor, " +
    "labour contract house construction, residential building contractor Hosur, " +
    "villa construction contractor, apartment construction contractor, home renovation contractor",
  path: PATH,
  image: HERO_IMAGE,
  imageAlt:
    "Residential building construction contractor project — front elevation of a completed G+1 villa with a tiled pitched roof, first-floor balcony and a pool deck",
  ogType: "website",
});

export default function Page() {
  return (
    <Layout>
      <JsonLd
        data={[
          generateBreadcrumbSchema([
            { name: "Home", url: SITE },
            { name: "Products", url: `${SITE}/products` },
            { name: "Home Construction", url: `${SITE}/products/category/home-construction` },
            { name: H1, url: `${SITE}${PATH}` },
          ]),
          /* Service, NOT Product. There is no fixed price and nothing here is purchasable online,
             so an Offer with a price would be a claim this business does not make until after a
             site visit. */
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: H1,
            description: DESCRIPTION,
            image: HERO_IMAGE,
            url: `${SITE}${PATH}`,
            serviceType: "Residential building construction contractor",
            category: "Home Construction",
            provider: {
              "@type": "Organization",
              name: COMPANY.legalName,
              url: COMPANY.url,
              telephone: COMPANY.phones[0].e164,
              email: COMPANY.email.sales,
              address: {
                "@type": "PostalAddress",
                streetAddress: COMPANY.addresses.bangaloreOffice.street,
                addressLocality: COMPANY.addresses.bangaloreOffice.locality,
                addressRegion: COMPANY.addresses.bangaloreOffice.region,
                postalCode: COMPANY.addresses.bangaloreOffice.postalCode,
                addressCountry: COMPANY.addresses.bangaloreOffice.country,
              },
            },
            /* Two cities, because the page says two cities. Keep these in step with the #coverage
               section — a service area claimed here and not listed there is the kind of mismatch
               that gets structured data ignored. */
            areaServed: [
              {
                "@type": "City",
                name: "Hosur",
                containedInPlace: { "@type": "State", name: "Tamil Nadu" },
              },
              {
                "@type": "City",
                name: "Bengaluru",
                containedInPlace: { "@type": "State", name: "Karnataka" },
              },
            ],
            hasOfferCatalog: {
              "@type": "OfferCatalog",
              name: "Residential building construction services",
              itemListElement: [
                "Houses and villas",
                "Apartments and residential blocks",
                "Shops, showrooms and offices",
                "Factory sheds and industrial buildings",
                "Renovation and extension",
                "Labour contract construction",
                "Turnkey construction — material and labour",
              ].map((name) => ({
                "@type": "Offer",
                // No price and no priceSpecification, deliberately: this is a quote-only service.
                // An Offer node without a price is valid and states availability, not a figure.
                itemOffered: { "@type": "Service", name },
              })),
            },
          },
          /* Legitimate only because every answer is rendered visibly on this same page —
             the array below IS the array the accordion renders. */
          generateFAQSchema(
            RESIDENTIAL_BUILDING_CONSTRUCTION_CONTRACTOR_FAQS.map((f) => ({
              question: f.question,
              answer: f.answer,
            })),
          ),
        ]}
      />

      {/* ── Breadcrumb ─────────────────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-muted/50 py-4">
        <div className="container-custom">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 text-sm">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-accent">
                  Home
                </Link>
              </li>
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <li>
                <Link href="/products" className="text-muted-foreground hover:text-accent">
                  Products
                </Link>
              </li>
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <li>
                <Link
                  href="/products/category/home-construction"
                  className="text-muted-foreground hover:text-accent"
                >
                  Home Construction
                </Link>
              </li>
              <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <li aria-current="page" className="font-medium text-foreground">
                Residential Building Construction Contractor
              </li>
            </ol>
          </nav>
        </div>
      </section>

      {/* ── Hero ───────────────────────────────────────────────────────────────────── */}
      <section className="border-b border-border bg-gradient-to-b from-muted/40 to-background">
        <div className="container-custom py-10 sm:py-14">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
            <div>
              {/* The city qualifier the H1 deliberately does not carry. */}
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium tracking-wider text-accent">
                <Link href="/products/category/home-construction" className="hover:underline">
                  HOME CONSTRUCTION
                </Link>
                <span aria-hidden="true" className="text-muted-foreground">
                  ·
                </span>
                <span>HOSUR &amp; BANGALORE</span>
              </p>
              <h1 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
                {H1}
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Houses, villas, shops and factory sheds built across Hosur and Bangalore — with a
                written estimate, a fixed scope and a payment schedule tied to work actually
                completed.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#quote"
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 font-semibold text-accent-foreground transition-opacity hover:opacity-90"
                >
                  Get a written estimate
                </a>
                <Link
                  href="/book-appointment"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-3 font-semibold transition-colors hover:bg-muted"
                >
                  Schedule a site visit
                </Link>
                <a
                  href={`tel:${COMPANY.phones[0].e164}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-3 font-semibold transition-colors hover:bg-muted"
                >
                  <Phone className="h-5 w-5" aria-hidden="true" />
                  {COMPANY.phones[0].display}
                </a>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                The first site visit and discussion cost you nothing. No published rate per square
                foot — we quote after seeing the plot, with the specification attached, so the
                number describes your build.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
              <OptimizedImage
                src="/images/products/building-construction-contractor/building-construction-contractor-villa-front-elevation-pool.webp"
                alt="Building construction contractor project — front elevation of a completed G+1 villa with a tiled pitched roof, first-floor balcony, full-height glazing and a pool deck"
                aspectRatio="4/3"
                objectFit="cover"
                priority
                sizes="(max-width: 1024px) 100vw, 560px"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Service content ────────────────────────────────────────────────────────── */}
      <section className="section-padding">
        {/* max-w-5xl, not the full container-custom 7xl: this page is mostly prose, and a 1280px
            measure is unreadable. Cards and grids inside still get room at 1024px. */}
        <div className="container-custom">
          <div className="mx-auto max-w-5xl">
            <ResidentialBuildingConstructionContractorContent />
          </div>
        </div>
      </section>
    </Layout>
  );
}
