/**
 * CITY / AREA LANDING PAGE — /cities-we-serve/<slug> (e.g. /cities-we-serve/container-office-in-jigani).
 *
 * Fully SERVER-rendered from src/data/cityPages.ts (one data entry = one page): exact meta title
 * (absolute — no site-name suffix), meta description, keywords, local geo tags, breadcrumb +
 * FAQPage JSON-LD, and the approved SEO copy as crawlable HTML. No client JS is needed for the
 * content, keeping the rendered text byte-exact with the server HTML (site-wide SEO rule).
 *
 * MOTION (opt-in per entry via `motion: true`): the page can carry the site's CSS-only motion
 * system — the `.reveal` / `.reveal-scale` / `.reveal-stagger` scroll reveals, `.hover-lift`,
 * `.card-glow`, `.btn-sheen` and `.press` utilities from src/index.css plus the Tailwind
 * `fade-up` keyframe for the H1 and tagline (never the hero image: it is the LCP element). Still
 * zero client JS: reveals only hide content inside
 * `@supports (animation-timeline: view())` and the load animation is `motion-safe:` gated, so
 * crawlers, no-JS visitors, older browsers and reduced-motion users get the fully visible static
 * page. Entries that leave `motion` unset render byte-identical HTML to before this pass.
 */

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone } from "lucide-react";

import { CITY_PAGES, cityPageBySlug, type CityPageLink } from "@/data/cityPages";
import { ContainerOfficeNearbyBlock } from "@/components/locations/ContainerOfficeLocations";
import { ShippingContainerNearbyBlock } from "@/components/locations/CityDirectoryGroups";
import { Layout } from "@/components/layout/Layout";
import { WhatsAppGlyph } from "@/components/WhatsAppGlyph";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { primaryPhone, whatsappUrl } from "@/lib/site-navigation";
import { JsonLd } from "@/components/JsonLd";
import { COMPANY } from "@/lib/company";
import { generateBreadcrumbSchema, generateFAQSchema, generatePromotionStructuredData } from "@/lib/seo/structured-data";

export const revalidate = 3600; // 1 hour, same as the cities index

/**
 * Only the slugs returned by generateStaticParams() exist. Any other slug is a 404 decided by
 * the router BEFORE rendering, so nothing is written to the ISR cache for it.
 *
 * WHY (production, 2026-10-10 — freshly merged city pages answering 404 after a green deploy):
 * with the default (dynamicParams = true) an unknown slug is rendered on demand and the
 * notFound() result is CACHED ON DISK for the revalidate window —
 * .next/server/app/cities-we-serve/<slug>.{html,meta,rsc}, served with x-nextjs-cache: HIT
 * (reproduced on a local production build). The VPS deploy script runs `next build` IN PLACE
 * while the previous Node process keeps serving from the same .next directory, and only then
 * reloads PM2. A request for a just-merged city page that lands between the build's prerender
 * and the reload is answered by the OLD process, which does not know the slug yet: it writes a
 * 404 entry over the freshly prerendered 200, and the NEW process then serves that cached 404
 * for up to an hour. With dynamicParams = false the old process never creates that entry.
 *
 * Behaviour for visitors is unchanged: /cities-we-serve/<unknown> was a 404 before and is a 404
 * now; the known pages are prerendered and revalidated exactly as before.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return CITY_PAGES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = cityPageBySlug(slug);
  if (!page) return {};
  const metadata = buildPageMetadata({
    absoluteTitle: page.metaTitle,
    description: page.metaDescription,
    keywords: page.keywords,
    path: `/cities-we-serve/${page.slug}`,
    geo: page.geo,
    image: page.heroImage.src,
    imageAlt: page.heroImage.alt,
  });
  if (!page.publication) return metadata;
  return {
    ...metadata,
    authors: [{ name: COMPANY.tradingName, url: `${COMPANY.url}/about-us` }],
    creator: COMPANY.tradingName,
    publisher: COMPANY.tradingName,
    other: {
      ...metadata.other,
      "dcterms.created": page.publication.publishedOn,
      "dcterms.modified": page.publication.updatedOn,
    },
  };
}

/* Tailwind `max-w-2xl` (42rem): the widest the hero and interior images are ever displayed. */
const MAX_W_2XL_PX = 672;

const h2 = "mt-10 mb-3 text-2xl font-bold tracking-tight";
const h3 = "mt-6 mb-1.5 text-lg font-semibold";
const p = "mb-4 leading-relaxed text-muted-foreground";
const li = "mb-2 leading-relaxed text-muted-foreground";

/** Explicit timezone keeps a recorded calendar date identical on server and client. */
const publicationDate = (isoDate: string) =>
  new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });

/* Secondary CTA buttons every page carried before `ctaSecondaryLinks` existed. Pages that
   leave that field unset render these two.
   2026-10-11: "Explore Container Offices" now points at the container-office category instead of
   the whole /products catalogue — the label already promised that destination, and it gives each
   container city page a contextual link up to the category that owns the head term. */
const DEFAULT_CTA_SECONDARY_LINKS: CityPageLink[] = [
  { label: "Explore Container Offices", href: "/products/category/container-offices" },
  { label: "Container Office on Rent", href: "/rental-service" },
];

export default async function CityLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = cityPageBySlug(slug);
  if (!page) notFound();

  /* Opt-in motion pass (see the file header). `mc()` returns the extra class(es) with a leading
     space, or "" when the page is static, so a static page's class strings are unchanged.
     `fadeDelay()` staggers the hero stack on load: fill-mode `both` keeps a delayed element in
     its start state during the delay instead of flashing visible first; undefined ⇒ no style
     attribute at all on static pages. */
  const mc = (cls: string) => (page.motion ? ` ${cls}` : "");
  const fadeDelay = (ms: number) =>
    page.motion ? { animationDelay: `${ms}ms`, animationFillMode: "both" as const } : undefined;
  /* An interior render narrower than the max-w-2xl frame (Kudligi's 600 px) is capped at its own width
     and skips the hover zoom, so it is never shown larger than its natural size. Wider renders keep
     their original sizes and classes, with no style attribute. */
  const interiorNarrow = !!page.interiorImage && page.interiorImage.width < MAX_W_2XL_PX;

  return (
    /* WRAPPED IN <Layout> — header, nav, footer, WhatsApp button and skip link.
     *
     * These pages shipped without it and rendered as bare documents: no navigation in, no
     * footer links out, no contact CTA, no skip link. /cities-we-serve (the index) has always
     * wrapped Layout; this route, its own children, never did — so every city landing page was
     * a dead end for both visitors and crawlers.
     *
     * The inner wrapper below is a <div>, NOT a <main>: Layout already renders the page's one
     * <main id="main-content">, which is the target of the skip link, and nesting a second
     * <main> inside it is invalid HTML and breaks that landmark for screen readers. */
    <Layout>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: "https://portableofficecabin.com" },
          { name: "Cities We Serve", url: "https://portableofficecabin.com/cities-we-serve" },
          /* page.h1 — the same text as the visible last crumb below. This used page.metaTitle, so on 14
             pages the markup named the page "… | Portable Office Cabin" or "… – Sizes, Price & Delivery"
             while the trail a visitor sees said only the H1. */
          { name: page.h1, url: `https://portableofficecabin.com/cities-we-serve/${page.slug}` },
        ])}
      />
      <JsonLd data={generateFAQSchema(page.faqs)} />
      {page.publication && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "WebPage",
            "@id": `${COMPANY.url}/cities-we-serve/${page.slug}#webpage`,
            url: `${COMPANY.url}/cities-we-serve/${page.slug}`,
            name: page.h1,
            description: page.metaDescription,
            inLanguage: "en-IN",
            datePublished: page.publication.publishedOn,
            dateModified: page.publication.updatedOn,
            author: {
              "@type": "Organization",
              "@id": `${COMPANY.url}/#organization`,
              name: COMPANY.tradingName,
              url: `${COMPANY.url}/about-us`,
            },
            publisher: {
              "@type": "Organization",
              "@id": `${COMPANY.url}/#organization`,
              name: COMPANY.tradingName,
              url: COMPANY.url,
            },
          }}
        />
      )}
      {/* Opt-in Service JSON-LD (`serviceJsonLd`): the same generator the promotion pages use, so the
          provider is pinned to the factory and the page's own city goes on areaServed. No offers —
          these pages quote, they do not sell. Pages without the field emit nothing new. */}
      {page.serviceJsonLd && (
        <JsonLd
          data={generatePromotionStructuredData({
            h1: page.h1,
            metaDescription: page.metaDescription,
            canonicalUrl: `https://portableofficecabin.com/cities-we-serve/${page.slug}`,
            imageUrl: page.heroImage.src,
            location: page.city,
            geoPlacename: page.geo.placename,
            geoPosition: page.geo.position,
            keyword: page.serviceJsonLd.serviceType,
          })}
        />
      )}

      <div className="container mx-auto max-w-4xl px-4 py-12">
        {/* breadcrumb (visible) */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
          <Link href="/" className="hover:underline">Home</Link>
          <span aria-hidden> / </span>
          <Link href="/cities-we-serve" className="hover:underline">Cities We Serve</Link>
          <span aria-hidden> / </span>
          <span className="text-foreground">{page.h1}</span>
        </nav>

        <h1 className={`text-3xl font-extrabold tracking-tight sm:text-4xl${mc("motion-safe:animate-fade-up")}`}>{page.h1}</h1>
        <p className={`mt-2 text-lg font-medium${mc("motion-safe:animate-fade-up")}`} style={fadeDelay(120)}>{page.tagline}</p>

        {page.publication && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            By <Link href="/about-us" rel="author" className="underline underline-offset-4">{COMPANY.tradingName}</Link>
            {" · Published "}<time dateTime={page.publication.publishedOn}>{publicationDate(page.publication.publishedOn)}</time>
            {" · Updated "}<time dateTime={page.publication.updatedOn}>{publicationDate(page.publication.updatedOn)}</time>
          </p>
        )}

        {/* hero — the page's own image (also its og:image), LCP-prioritised. Deliberately NOT part
            of the load fade: it is the page's LCP element, and an element painted at opacity 0 is
            not an LCP candidate, so fading it in (240 ms delay + 0.6 s) pushed lab LCP back by
            ~0.5 s on throttled mobile. It keeps the hover zoom, which never touches first paint. */}
        <figure className={`mt-6 overflow-hidden rounded-2xl border bg-muted/30${mc("group")}`}>
          <Image
            src={page.heroImage.src}
            alt={page.heroImage.alt}
            width={page.heroImage.width}
            height={page.heroImage.height}
            priority
            fetchPriority="high"
            sizes="(max-width: 896px) 100vw, 896px"
            className={`mx-auto h-auto w-full max-w-2xl${mc("transition-transform duration-700 ease-out group-hover:scale-[1.03]")}`}
          />
          {/* Optional visible caption, e.g. marking a render as a design option. Unset = no element. */}
          {page.heroImage.caption && (
            <figcaption className="border-t px-4 py-2.5 text-center text-sm leading-relaxed text-muted-foreground">
              {page.heroImage.caption}
            </figcaption>
          )}
        </figure>

        {page.intro.map((text) => (
          <p key={text.slice(0, 40)} className={`${p} mt-4${mc("reveal")}`}>{text}</p>
        ))}

        <h2 className={`${h2}${mc("reveal")}`}>{page.whyHeading}</h2>
        <p className={`${p}${mc("reveal")}`}>{page.whyIntro}</p>
        <ul className={`list-disc pl-6${mc("reveal-stagger")}`}>
          {page.whyBullets.map((b) => (
            <li key={b.title} className={li}>
              <strong className="text-foreground">{b.title}:</strong> {b.text}
            </li>
          ))}
        </ul>
        {page.whyOutro && <p className={`${p} mt-4${mc("reveal")}`}>{page.whyOutro}</p>}

        {/* Feature band — a single editorial plate breaking the longest text run on the page.
            Cropped 3:2 (sources are square, so object-cover keeps the cabin centred and stops a
            full-width square from swallowing a whole viewport), with the caption sitting on a
            bottom scrim rather than below the frame, so the image reads as one composed unit.
            The scrim is dark-on-image in both themes, which is why its text colour is fixed. */}
        {page.featureImage && (
          <figure className={`relative mt-10 overflow-hidden rounded-2xl border shadow-sm${mc("reveal-scale group")}`}>
            <div className="relative aspect-[3/2] w-full">
              <Image
                src={page.featureImage.src}
                alt={page.featureImage.alt}
                fill
                sizes="(max-width: 896px) 100vw, 896px"
                className={`object-cover object-center${mc("transition-transform duration-1000 ease-out group-hover:scale-105")}`}
                loading="lazy"
              />
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/45 to-transparent"
              />
            </div>
            <figcaption className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
              <p className="max-w-xl text-sm leading-relaxed text-white/95 sm:text-base">
                {page.featureImage.caption}
              </p>
            </figcaption>
          </figure>
        )}

        <h2 className={`${h2}${mc("reveal")}`}>{page.solutionsHeading}</h2>
        <p className={`${p}${mc("reveal")}`}>{page.solutionsIntro}</p>
        {page.solutions.map((s0, i) => (
          <section key={s0.title} className={page.motion ? "reveal" : undefined}>
            <h3 className={h3}>{i + 1}. {s0.title}</h3>
            <p className={p}>{s0.text}</p>
          </section>
        ))}

        <h2 className={`${h2}${mc("reveal")}`}>{page.featuresHeading}</h2>
        <p className={`${p}${mc("reveal")}`}>{page.featuresIntro}</p>
        <ul className={`list-disc pl-6${mc("reveal-stagger")}`}>
          {page.features.map((f) => (
            <li key={f} className={li}>{f}</li>
          ))}
        </ul>
        <p className={`${p} mt-4${mc("reveal")}`}><strong className="text-foreground">{page.sizesNote}</strong></p>

        {/* gallery — every angle of the cabin, lazy-loaded. Columns follow the item count so a
            1- or 2-image gallery fills the row instead of sitting stranded at a third width. */}
        {page.gallery && page.gallery.length > 0 && (
          <div
            className={`mt-6 grid gap-4 ${
              page.gallery.length === 1 ? "" : page.gallery.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"
            }${mc("reveal-stagger")}`}
          >
            {page.gallery.map((g) => (
              <figure key={g.src} className={`overflow-hidden rounded-xl border bg-muted/30${mc("hover-lift card-glow")}`}>
                <Image
                  src={g.src}
                  alt={g.alt}
                  width={g.width}
                  height={g.height}
                  sizes={page.gallery!.length === 1 ? "(max-width: 896px) 100vw, 896px" : "(max-width: 640px) 100vw, 300px"}
                  className={page.gallery!.length === 1 ? "mx-auto h-auto w-full max-w-2xl" : "h-auto w-full"}
                  loading="lazy"
                />
              </figure>
            ))}
          </div>
        )}

        {/* Optional since 2026-10-21 (see CityPage.industriesHeading): unset = no section. The fragment
            adds no markup, so pages that set it render byte-identical HTML. */}
        {page.industriesHeading && (
          <>
            <h2 className={`${h2}${mc("reveal")}`}>{page.industriesHeading}</h2>
            <p className={`${p}${mc("reveal")}`}>{page.industriesIntro}</p>
            <ul className={`list-disc pl-6${mc("reveal-stagger")}`}>
              {(page.industries ?? []).map((b) => (
                <li key={b.title} className={li}>
                  <strong className="text-foreground">{b.title}</strong> — {b.text}
                </li>
              ))}
            </ul>
          </>
        )}

        <h2 className={`${h2}${mc("reveal")}`}>{page.customHeading}</h2>
        {page.interiorImage && (
          <figure className={`mb-4 mt-2 overflow-hidden rounded-2xl border bg-muted/30${mc("reveal-scale group")}`}>
            <Image
              src={page.interiorImage.src}
              alt={page.interiorImage.alt}
              width={page.interiorImage.width}
              height={page.interiorImage.height}
              sizes={
                interiorNarrow
                  ? `(max-width: ${page.interiorImage.width}px) 100vw, ${page.interiorImage.width}px`
                  : "(max-width: 896px) 100vw, 896px"
              }
              className={`mx-auto h-auto w-full max-w-2xl${
                interiorNarrow ? "" : mc("transition-transform duration-700 ease-out group-hover:scale-[1.03]")
              }`}
              style={interiorNarrow ? { maxWidth: page.interiorImage.width } : undefined}
              loading="lazy"
            />
            {/* Optional visible caption, e.g. marking a render as illustrative. Unset = no element. */}
            {page.interiorImage.caption && (
              <figcaption className="border-t px-4 py-2.5 text-center text-sm leading-relaxed text-muted-foreground">
                {page.interiorImage.caption}
              </figcaption>
            )}
          </figure>
        )}
        <p className={`${p}${mc("reveal")}`}>{page.customIntro}</p>
        <ul className={`list-disc pl-6${mc("reveal-stagger")}`}>
          {page.customBullets.map((b) => (
            <li key={b.title} className={li}>
              <strong className="text-foreground">{b.title}</strong> — {b.text}
            </li>
          ))}
        </ul>
        <p className={`${p}${mc("reveal")}`}>{page.customOutro}</p>

        {/* Optional since 2026-10-21 (see CityPage.whyUsHeading): unset = no section. */}
        {page.whyUsHeading && (
          <>
            <h2 className={`${h2}${mc("reveal")}`}>{page.whyUsHeading}</h2>
            <p className={`${p}${mc("reveal")}`}>{page.whyUsIntro}</p>
            <ul className={`list-disc pl-6${mc("reveal-stagger")}`}>
              {(page.whyUsBullets ?? []).map((b) => (
                <li key={b.title} className={li}>
                  <strong className="text-foreground">{b.title}</strong> — {b.text}
                </li>
              ))}
            </ul>
          </>
        )}

        <h2 className={`${h2}${mc("reveal")}`}>{page.areasHeading}</h2>
        <p className={`${p}${mc("reveal")}`}>{page.areasText}</p>

        <h2 className={`${h2}${mc("reveal")}`}>{page.howHeading}</h2>
        <ol className={`list-decimal pl-6${mc("reveal-stagger")}`}>
          {page.howSteps.map((s0) => (
            <li key={s0.title} className={li}>
              <strong className="text-foreground">{s0.title}</strong> — {s0.text}
            </li>
          ))}
        </ol>

        {/* Optional extra sections (`extraSections`): owner copy with more H2s than the fixed slots
            hold. Same classes and motion as the sections above; unset = nothing rendered. */}
        {page.extraSections?.map((sec) => (
          <section key={sec.heading}>
            <h2 className={`${h2}${mc("reveal")}`}>{sec.heading}</h2>
            {sec.paragraphs?.map((text) => (
              <p key={text.slice(0, 40)} className={`${p}${mc("reveal")}`}>{text}</p>
            ))}
            {sec.bullets && sec.bullets.length > 0 && (
              <ul className={`list-disc pl-6${mc("reveal-stagger")}`}>
                {sec.bullets.map((b) => (
                  <li key={b.title ?? b.text} className={li}>
                    {b.title && <strong className="text-foreground">{b.title}:</strong>} {b.text}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <h2 className={`${h2}${mc("reveal")}`}>Frequently Asked Questions (FAQs)</h2>
        {page.faqs.map((f, i) => (
          <section key={f.question} className={`mb-4${mc("reveal")}`}>
            <h3 className={h3}>{i + 1}. {f.question}</h3>
            <p className={p}>{f.answer}</p>
          </section>
        ))}

        <section className={`mt-12 rounded-2xl border bg-muted/40 p-6 text-center${mc("reveal-scale")}`}>
          <h2 className="text-2xl font-bold tracking-tight">{page.ctaHeading}</h2>
          <p className={`${p} mx-auto mt-2 max-w-2xl`}>{page.ctaText}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              href="/contact"
              className={`rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90${mc("btn-sheen press")}`}
            >
              {page.ctaButtonLabel ?? "Get a Free Quotation"}
            </Link>
            {/* Direct-contact buttons (`ctaContactButtons`). On by default since 2026-10-14 (they were
                opt-in and only 6 of 27 pages had them); an entry can still set `false`. Numbers come
                from COMPANY via site-navigation, the same source as the header and footer. The WhatsApp
                fill is the header's contrast-checked #0B7A43 (white text 5.4:1), not the 2.0:1 brand green. */}
            {(page.ctaContactButtons ?? true) && (
              <>
                <a
                  href={`tel:${primaryPhone.e164}`}
                  className={`inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90${mc("press")}`}
                >
                  <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Call {primaryPhone.display}
                </a>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center gap-2 rounded-md bg-[#0B7A43] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#096436]${mc("press")}`}
                >
                  <WhatsAppGlyph className="h-4 w-4 shrink-0" />
                  WhatsApp Us
                </a>
              </>
            )}
            {(page.ctaSecondaryLinks ?? DEFAULT_CTA_SECONDARY_LINKS).map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md border px-5 py-2.5 text-sm font-semibold hover:bg-muted${mc("press")}`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </section>

        {/* Optional related-pages block — the page's own internal links (product pages, the
            promotion / blog pages that own neighbouring keywords, sibling city pages). Rendered
            as a <nav> so crawlers and screen readers read it as navigation, not body copy. */}
        {page.relatedLinks && page.relatedLinks.length > 0 && (
          <nav aria-label="Related pages" className={`mt-10${mc("reveal")}`}>
            <h2 className="mb-3 text-xl font-bold tracking-tight">Related pages</h2>
            <ul className={`grid gap-2 sm:grid-cols-2${mc("reveal-stagger")}`}>
              {page.relatedLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={`block rounded-lg border px-4 py-3 text-sm font-medium hover:bg-muted${mc("hover-lift")}`}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Container-office cluster block (src/data/containerOfficeCluster.ts): up to the category
            pillar, across to genuinely nearby location pages, out to the directory. Renders only
            for the container-office location pages; every other page is unchanged. */}
        <ContainerOfficeNearbyBlock
          slug={page.slug}
          existingHrefs={(page.relatedLinks ?? []).map((l) => l.href)}
          motion={page.motion}
        />

        {/* Shipping-container pages (src/data/cityDirectory.ts): the other shipping-container pages in
            the same state and the directory section. These pages had the fewest inbound links of all
            location pages (3–4 each). Renders nothing on every other page. */}
        <ShippingContainerNearbyBlock
          slug={page.slug}
          existingHrefs={(page.relatedLinks ?? []).map((l) => l.href)}
          motion={page.motion}
        />

        {/* Optional legal/affiliation disclaimer — REQUIRED on any page that names a real
            company or landmark (e.g. the Tata Electronics belt page): renders muted, below
            the CTA, exactly where such notices belong. Pages without one are unaffected. */}
        {page.disclaimer && (
          <p className={`mt-8 text-xs leading-relaxed text-muted-foreground/80${mc("reveal")}`}>{page.disclaimer}</p>
        )}
      </div>
    </Layout>
  );
}
