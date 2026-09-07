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
 *   THIS page → the CONTRACTING DECISION, anchored at Shikaripalya in Electronic City. H1
 *               "Construction Contractor in Shikaripalya". The two contract models, the six-stage
 *               process, the "what to ask any contractor" checklist. Its own five photographs.
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
/* TARGETED ON SHIKARIPALYA, 2026-09-07 (owner's instruction, replacing a same-day Hosur retarget).
 *
 * This page and its sibling /products/home-construction/building-construction-contractor were
 * being held apart by one adjective ("Residential"), and Google was not buying it: the two titles
 * shared "building", "construction" and "contractor", and neither page was indexed. The owner's
 * standing instruction (2026-09-06) is that BOTH pages stay, so they are split by PLACE — a
 * difference a search engine can actually see:
 *
 *     this page → "construction contractor in Shikaripalya"       (a locality inside Electronic City)
 *     sibling   → "building construction contractor in Bangalore" (the city as a whole)
 *
 * ── THE OVERLAP THIS CREATES, STATED PLAINLY ────────────────────────────────────────────────
 * Shikaripalya sits INSIDE Electronic City, so this page now shares a neighbourhood with two
 * city pages: house-construction-…-electronic-city-bangalore (owns the AREA) and
 * building-contractor-neeladri-road-neeladri-nagar (owns Neeladri Road, one street away). Three
 * pages in one pocket of Bengaluru only works if each owns something the others do not:
 *
 *     Electronic City page → the AREA: which authority sanctions a plan where, the locality list
 *     Neeladri Road page   → that STREET: narrow approach, mixed khata, borewell yield
 *     THIS page            → the CONTRACTING DECISION for a Shikaripalya plot: labour vs turnkey,
 *                            the six stages, and what to ask any contractor before signing
 *
 * So this page stays a SERVICE page that happens to be anchored at Shikaripalya — it must not
 * grow an areas-of-Electronic-City list or an approvals explainer, because those belong to the
 * city pages and restating them is exactly the duplication that de-indexed all of them.
 *
 * Do NOT re-add "Bangalore" or "Hosur" to this H1 or title. Hosur remains in the BODY, honestly,
 * because the works genuinely are near Hosur and the company genuinely builds on both sides of
 * the border — it simply no longer competes for either term in the head tags. */
const H1 = "Construction Contractor in Shikaripalya";
const DESCRIPTION =
  "Construction contractor in Shikaripalya, Electronic City — houses, added floors and rental " +
  "blocks on your own plot. Written estimate, stage-wise payments.";
const HERO_IMAGE = `${SITE}/images/products/building-construction-contractor/building-construction-contractor-villa-front-elevation-pool.webp`;

export const metadata: Metadata = buildPageMetadata({
  /* absoluteTitle, NOT title. The root layout applies `template: "%s | Portable Office Cabin"`,
   * which would render this as a 68-character title tag that Google truncates. The owner asked
   * on 2026-09-06 for the title to be exactly the page name and nothing else, so this bypasses
   * the template and ships 39 characters that display in full. If you switch this back to
   * `title:`, the brand suffix returns. */
  absoluteTitle: H1,
  description: DESCRIPTION,
  /* Not published any more (buildPageMetadata stopped emitting meta keywords on 2026-09-07) —
     kept as the working record of what this page is meant to rank for. Shikaripalya leads; the
     generic contractor terms that used to sit here belonged to the sibling page and repeating
     them is what put the two in one auction. */
  keywords:
    "construction contractor in Shikaripalya, building contractor Shikaripalya, " +
    "house construction Shikaripalya Electronic City, civil contractor Shikaripalya, " +
    "labour contract house construction Shikaripalya, turnkey house construction Electronic City",
  path: PATH,
  image: HERO_IMAGE,
  /* Describes the photograph and nothing else. The old value led with the page's own keyword
     ("Residential building construction contractor project — …"), which is not what alt text is
     for; see the note in src/utils/imageGeoTagging.ts. */
  imageAlt:
    "Front elevation of a completed G+1 villa with a tiled pitched roof, first-floor balcony, full-height glazing and a pool deck",
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
            /* Shikaripalya leads because it is what the H1 claims, and it is typed as a
               neighbourhood inside Bengaluru rather than as a City — it is a locality in
               Electronic City, not a town, and saying otherwise is a claim a validator can
               catch. Hosur stays because the #coverage section genuinely lists it and the works
               are there; a service area claimed here and not listed there (or the reverse) is
               the kind of mismatch that gets structured data ignored. Keep these three in step
               with that section. */
            areaServed: [
              {
                "@type": "Place",
                name: "Shikaripalya",
                containedInPlace: {
                  "@type": "City",
                  name: "Bengaluru",
                  containedInPlace: { "@type": "State", name: "Karnataka" },
                },
              },
              {
                "@type": "City",
                name: "Bengaluru",
                containedInPlace: { "@type": "State", name: "Karnataka" },
              },
              {
                "@type": "City",
                name: "Hosur",
                containedInPlace: { "@type": "State", name: "Tamil Nadu" },
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
              {/* Matches the H1. A breadcrumb leaf that disagrees with the heading is a
                  mismatch users and crawlers both notice. */}
              <li aria-current="page" className="font-medium text-foreground">
                {H1}
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
                <span>SHIKARIPALYA, ELECTRONIC CITY</span>
              </p>
              <h1 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
                {H1}
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Houses, added floors and rental blocks built on plots in and around Shikaripalya —
                with a written estimate, a fixed scope and a payment schedule tied to work actually
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
