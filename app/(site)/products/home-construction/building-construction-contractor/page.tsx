/**
 * BUILDING CONSTRUCTION CONTRACTOR IN BANGALORE
 * Canonical URL: /products/home-construction/building-construction-contractor
 *
 * ── WHY THIS URL AND NOT /home-construction/… ───────────────────────────────────────────────
 * The brief's preferred URL was `/home-construction/building-construction-contractor`, with the
 * instruction to follow the existing structure if Home Construction already uses one. It does:
 * Home Construction is a CATEGORY in src/data/products.ts, published at
 * /products/category/home-construction, and pages beneath a parent in this codebase live at
 * /products/<parent>/<child> (src/data/productChildPages.ts documents that URL contract, and its
 * `parentPath` field exists precisely for a group whose parent is a category page). Creating a
 * second top-level /home-construction/ hierarchy would be the competing, duplicate structure the
 * brief warned against.
 *
 * The preferred URL is not lost: next.config.ts 301s it here, so a link written to it resolves.
 *
 * ── WHY A DEDICATED ROUTE RATHER THAN A REGISTRY ENTRY ──────────────────────────────────────
 * The productChildPages registry renders one fixed template (heading → paragraphs → bullets →
 * FAQ). This page carries a hero, a full service body AND an interactive animation workspace, so
 * it takes the same shape as the other bespoke landing pages under /products — portable-cabin and
 * portable-toilet-cabin are dedicated static routes for exactly this reason. Static segments win
 * over /products/[slug]/[child], so nothing in the registry or the size-variant ladder is shadowed.
 *
 * ── SEO SHAPE ───────────────────────────────────────────────────────────────────────────────
 * Everything that ranks is a Server Component and is in the initial HTML: H1, the whole service
 * body, the FAQ text, the breadcrumb, the internal links. ONLY the animation workspace is
 * client-side, loaded with next/dynamic and ssr:false, so a crawler reads a complete service page
 * and the editor never competes with it for LCP.
 *
 * NO Product or Offer schema. This is a quote-only service with no fixed price — the same reason
 * POC-CIB-RCC carries kind:"service" + priceConfirmed:false and stays out of the Merchant feed.
 * Service + BreadcrumbList + FAQPage are the correct types, and there is not a single ₹ figure on
 * the page.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Film, Phone, Sparkles } from "lucide-react";

import { JsonLd } from "@/components/JsonLd";
import { Layout } from "@/components/layout/Layout";
import { OptimizedImage } from "@/components/OptimizedImage";
/* The workspace is lazy-loaded behind a client boundary (StudioMount) — `ssr: false` is only
   valid inside a Client Component, and this page is deliberately a Server Component so the
   service copy, the FAQ and the schema are all in the initial HTML. */
import { StudioMount } from "@/components/animation-studio/StudioMount";
import {
  BUILDING_CONSTRUCTION_CONTRACTOR_FAQS,
  BuildingConstructionContractorContent,
} from "@/components/products/BuildingConstructionContractorContent";
import { COMPANY } from "@/lib/company";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbSchema, generateFAQSchema } from "@/lib/seo/structured-data";

export const revalidate = 1800; // 30 minutes, matching the other product landing pages

const SITE = "https://portableofficecabin.com";
const PATH = "/products/home-construction/building-construction-contractor";
const H1 = "Building Construction Contractor in Bangalore";
const DESCRIPTION =
  "Building construction contractor in Bangalore for individual houses, villas, turnkey projects, " +
  "labour contracts, renovation and complete material-and-labour construction. Upload interior and " +
  "exterior references to create a 30-second concept animation.";
const HERO_IMAGE = `${SITE}/images/products/building-construction-contractor/building-construction-contractor-bangalore-front-elevation.webp`;

export const metadata: Metadata = buildPageMetadata({
  title: H1,
  description: DESCRIPTION,
  keywords:
    "building construction contractor in Bangalore, house construction contractor Bangalore, " +
    "individual house construction Bangalore, villa construction contractor, turnkey construction " +
    "Bangalore, labour contract construction, material and labour construction, home renovation " +
    "contractor Bangalore, RCC building contractor",
  path: PATH,
  image: HERO_IMAGE,
  imageAlt:
    "Front elevation of a completed G+1 individual house built in RCC, with stone-clad and rendered façade, timber louvres, balcony and covered car porch",
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
             so an Offer would be a price claim this business does not make until after a site
             visit. Same reasoning as /products/portable-cabin, which is also a Service node. */
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: H1,
            description: DESCRIPTION,
            image: HERO_IMAGE,
            url: `${SITE}${PATH}`,
            serviceType: "Building construction contracting",
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
            areaServed: {
              "@type": "City",
              name: "Bengaluru",
              containedInPlace: { "@type": "State", name: "Karnataka" },
            },
            hasOfferCatalog: {
              "@type": "OfferCatalog",
              name: "Building construction services",
              itemListElement: [
                "Residential building construction",
                "Individual house construction",
                "Villa construction",
                "Turnkey construction",
                "Labour-contract construction",
                "Material-and-labour construction",
                "Renovation and extension",
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
            BUILDING_CONSTRUCTION_CONTRACTOR_FAQS.map((f) => ({ question: f.question, answer: f.answer })),
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
                Building Construction Contractor
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
              <Link
                href="/products/category/home-construction"
                className="text-sm font-medium tracking-wider text-accent hover:underline"
              >
                HOME CONSTRUCTION
              </Link>
              <h1 className="mt-3 font-display text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
                {H1}
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
                Individual houses, villas and turnkey projects built in reinforced cement concrete
                on your own plot — with the scope, the specification and the rate agreed in writing
                before anything is cast.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#concept-animation"
                  className="inline-flex items-center gap-2 rounded-xl bg-amber px-5 py-3 font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                  Upload interior &amp; exterior images
                </a>
                <a
                  href="#quote"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-3 font-semibold transition-colors hover:bg-muted"
                >
                  Request a detailed quotation
                </a>
                <a
                  href={`tel:${COMPANY.phones[0].e164}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-3 font-semibold transition-colors hover:bg-muted"
                >
                  <Phone className="h-5 w-5" aria-hidden="true" />
                  {COMPANY.phones[0].display}
                </a>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                No published rate per square foot — we quote after a site visit, with the
                specification attached, so the number describes your build.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
              <OptimizedImage
                src="/images/products/building-construction-contractor/building-construction-contractor-bangalore-front-elevation.webp"
                alt="Front elevation of a completed G+1 individual house built in RCC, with a stone-clad and rendered façade, timber louvre screen, first-floor balcony, terrace pergola and covered car porch"
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

      {/* ── AI Construction Animation Builder ──────────────────────────────────────── */}
      <section id="concept-animation" className="scroll-mt-24 border-b border-border bg-muted/20">
        <div className="container-custom py-12 sm:py-16">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-amber/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber">
              <Film className="h-3.5 w-3.5" aria-hidden="true" />
              Concept animation tool
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold text-foreground sm:text-3xl">
              Turn two photographs into a 30-second walkthrough of your building
            </h2>
            <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
              Upload one exterior image and one interior image of the design you have in mind. The
              builder reads them, shows you exactly what it detected so you can correct it, and
              prepares an editable six-scene storyboard that always totals exactly thirty seconds —
              establishing view, orbit, entrance approach, the move inside, the interior walkthrough
              and a closing hero shot.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Every scene prompt carries a locked list of your building&rsquo;s features — floor
              count, roof, openings, balconies, façade, colours, flooring, ceiling and finishes — so
              the animation reproduces the building you uploaded instead of designing a different
              one. Where your two images do not establish a physically reliable route from the front
              door into the room, the tool uses a cinematic transition rather than inventing a
              hallway that does not exist.
            </p>
          </div>

          <div className="mt-8">
            <StudioMount />
          </div>
        </div>
      </section>

      {/* ── Service content ────────────────────────────────────────────────────────── */}
      <section className="section-padding">
        <div className="container-custom">
          <BuildingConstructionContractorContent />
        </div>
      </section>
    </Layout>
  );
}
