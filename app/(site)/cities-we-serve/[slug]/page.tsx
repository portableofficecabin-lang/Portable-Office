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

import {
  CITY_PAGES,
  cityPageBySlug,
  type CityPageLink,
  type CityPageSection,
  type CityPageTable,
} from "@/data/cityPages";
import { CATEGORY_LANDING_SLUGS, categoryModels } from "@/data/categoryLandings";
import { categories, products } from "@/data/products";
import { CategoryEnquiryForm } from "@/components/products/CategoryEnquiryForm";
import { ContainerOfficeNearbyBlock } from "@/components/locations/ContainerOfficeLocations";
import { ShippingContainerNearbyBlock } from "@/components/locations/CityDirectoryGroups";
import { Layout } from "@/components/layout/Layout";
import { WhatsAppGlyph } from "@/components/WhatsAppGlyph";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { primaryPhone, whatsappUrl } from "@/lib/site-navigation";
import { JsonLd } from "@/components/JsonLd";
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
  return buildPageMetadata({
    absoluteTitle: page.metaTitle,
    description: page.metaDescription,
    keywords: page.keywords,
    path: `/cities-we-serve/${page.slug}`,
    geo: page.geo,
    image: page.heroImage.src,
    imageAlt: page.heroImage.alt,
    /* Optional (`ogImageDimensions`): the hero's declared size as og:image:width / height; unset = no tags. */
    ...(page.ogImageDimensions ? { imageWidth: page.heroImage.width, imageHeight: page.heroImage.height } : {}),
  });
}

/* Tailwind `max-w-2xl` (42rem): the widest the hero and interior images are ever displayed. */
const MAX_W_2XL_PX = 672;

const h2 = "mt-10 mb-3 text-2xl font-bold tracking-tight";
const h3 = "mt-6 mb-1.5 text-lg font-semibold";
const p = "mb-4 leading-relaxed text-muted-foreground";
const li = "mb-2 leading-relaxed text-muted-foreground";
/* Bullet lists (why / industries / custom / why-us): a CityPageListItem without a title renders its text
   alone. Before 2026-10-23 the lead-in markup rendered regardless, so untitled bullets (first used by
   Portable Cabins in Perundurai) showed a stray ":" or " — " before the text. Titled bullets are unchanged. */

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
  /* The same rule for the hero (first used by Shipping Containers in Marathahalli, whose exterior render
     is 600 px wide): a narrower hero is capped at its own width and skips the hover zoom. Every hero at
     least 672 px wide keeps its original sizes and classes, with no style attribute. */
  const heroNarrow = page.heroImage.width < MAX_W_2XL_PX;
  /* Optional enquiry form (`enquiryForm`): the category and its models come from the static catalogue,
     the same source /api/enquiries validates the model id against. A category the route does not
     accept renders no form rather than one that can only fail. */
  const enquiryCategory = page.enquiryForm
    ? categories.find((c) => c.slug === page.enquiryForm!.categorySlug)
    : undefined;
  const enquiry =
    page.enquiryForm && enquiryCategory && CATEGORY_LANDING_SLUGS.includes(page.enquiryForm.categorySlug)
      ? {
          ...page.enquiryForm,
          categoryName: enquiryCategory.name,
          models: categoryModels(page.enquiryForm.categorySlug, products)
            /* `excludeRentalModels` (optional): drop monthly-rental models; unset = every model. */
            .filter((m) => !(page.enquiryForm!.excludeRentalModels && m.rental))
            .map((m) => ({ id: m.id, name: m.name })),
        }
      : undefined;

  /* Optional table (an extra section's `table`, or `whyTable`): header row, first cell of each row as
     the row header, and a visible caption underneath. The wrapper scrolls only if a table is wider
     than the column. Below the `sm` breakpoint the cells use px-3 and the row headers may wrap, so a
     three-column table fits a 320–430 px phone instead of hiding its last column behind a sideways
     scroll (2026-11-04, Portable Toilets in Krishnagiri); from `sm` up the markup looks exactly as
     before. On phones narrower than 390 px the table also uses 12 px text and 6 px side padding
     (`max-[389px]:text-xs` / `max-[389px]:px-1.5`): whole words such as "Commissioning" and
     "access-control" otherwise set each column's minimum width, and two security-cabin tables still
     scrolled sideways at 320–360 px (2026-11-06). Words are never broken mid-word. From 390 px up
     the markup renders exactly as before. */
  const renderTable = (table: CityPageTable) => (
    <div className={`mb-4 overflow-x-auto rounded-xl border${mc("reveal")}`}>
      <table className="w-full border-collapse text-left text-sm max-[389px]:text-xs">
        <caption className="caption-bottom border-t px-3 py-2.5 text-left leading-relaxed text-muted-foreground sm:px-4 max-[389px]:px-1.5">
          {table.caption}
        </caption>
        <thead className="bg-muted/50">
          <tr>
            {table.headers.map((hd) => (
              <th key={hd} scope="col" className="px-3 py-2.5 font-semibold text-foreground sm:px-4 max-[389px]:px-1.5">
                {hd}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row[0]} className="border-t">
              <th scope="row" className="px-3 py-2.5 font-medium text-foreground sm:whitespace-nowrap sm:px-4 max-[389px]:px-1.5">
                {row[0]}
              </th>
              {row.slice(1).map((cell, j) => (
                <td key={`${row[0]}-${j}`} className="px-3 py-2.5 text-muted-foreground sm:px-4 max-[389px]:px-1.5">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  /* Optional contextual link list (an extra section's `links`, or `customLinks`): same link style as a
     solution's contextual link, one per list item. Callers render it only when the list is non-empty. */
  const renderLinks = (links: CityPageLink[]) => (
    <ul className={`mb-4 list-disc pl-6${mc("reveal-stagger")}`}>
      {links.map((l) => (
        <li key={l.href} className={li}>
          <Link href={l.href} className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  );

  /* Optional image inside an extra section (`image`, first used by Portable Office Cabins in
     Marathahalli to show its interior beside the layout guide): the interior image's figure, including
     its narrow-image rule, so an image narrower than the max-w-2xl frame is never upscaled or zoomed. */
  const renderSectionImage = (img: NonNullable<CityPageSection["image"]>) => {
    const narrow = img.width < MAX_W_2XL_PX;
    return (
      <figure className={`mb-4 mt-2 overflow-hidden rounded-2xl border bg-muted/30${mc("reveal-scale group")}`}>
        <Image
          src={img.src}
          alt={img.alt}
          width={img.width}
          height={img.height}
          sizes={narrow ? `(max-width: ${img.width}px) 100vw, ${img.width}px` : "(max-width: 896px) 100vw, 896px"}
          className={`mx-auto h-auto w-full max-w-2xl${
            narrow ? "" : mc("transition-transform duration-700 ease-out group-hover:scale-[1.03]")
          }`}
          style={narrow ? { maxWidth: img.width } : undefined}
          loading="lazy"
        />
        {img.caption && (
          <figcaption className="border-t px-4 py-2.5 text-center text-sm leading-relaxed text-muted-foreground">
            {img.caption}
          </figcaption>
        )}
      </figure>
    );
  };

  /* One optional extra section (`extraSections`): owner copy with more H2s than the fixed slots
     hold. Same classes and motion as the fixed sections. Rendered after the "how" steps, or after
     the solutions list when `placement` is "afterSolutions". */
  const renderSection = (sec: CityPageSection) => (
    <section key={sec.heading}>
      <h2 className={`${h2}${mc("reveal")}`}>{sec.heading}</h2>
      {/* Optional image straight under the heading (`image`); unset = no element. */}
      {sec.image && renderSectionImage(sec.image)}
      {sec.paragraphs?.map((text) => (
        <p key={text.slice(0, 40)} className={`${p}${mc("reveal")}`}>{text}</p>
      ))}
      {sec.table && renderTable(sec.table)}
      {sec.bullets && sec.bullets.length > 0 && (
        <ul className={`list-disc pl-6${mc("reveal-stagger")}`}>
          {sec.bullets.map((b) => (
            <li key={b.title ?? b.text} className={li}>
              {b.title && <strong className="text-foreground">{b.title}:</strong>} {b.text}
            </li>
          ))}
        </ul>
      )}
      {/* Optional paragraphs after the bullets (`closing`); unset = nothing rendered. */}
      {sec.closing?.map((text) => (
        <p key={text.slice(0, 40)} className={`${p} mt-4${mc("reveal")}`}>{text}</p>
      ))}
      {/* Optional contextual links after the closing paragraphs (`links`); unset = nothing rendered. */}
      {sec.links && sec.links.length > 0 && renderLinks(sec.links)}
    </section>
  );

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
            sizes={
              heroNarrow
                ? `(max-width: ${page.heroImage.width}px) 100vw, ${page.heroImage.width}px`
                : "(max-width: 896px) 100vw, 896px"
            }
            className={`mx-auto h-auto w-full max-w-2xl${
              heroNarrow ? "" : mc("transition-transform duration-700 ease-out group-hover:scale-[1.03]")
            }`}
            style={heroNarrow ? { maxWidth: page.heroImage.width } : undefined}
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
        {/* Optional contextual links after the intro (`introLinks`); unset = nothing rendered. */}
        {page.introLinks && page.introLinks.length > 0 && renderLinks(page.introLinks)}

        {/* Optional hero contact row (`heroCta`): quotation (the on-page form when there is one), Call
            and WhatsApp, styled like the CTA box buttons. Not a scroll reveal: it sits near the top
            and must never start hidden. Unset = no element. */}
        {page.heroCta && (
          <div className="mt-2 flex flex-wrap gap-3">
            {enquiry ? (
              <a
                href="#category-enquiry"
                className={`rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90${mc("btn-sheen press")}`}
              >
                {page.ctaButtonLabel ?? "Get a Free Quotation"}
              </a>
            ) : (
              <Link
                href="/contact"
                className={`rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90${mc("btn-sheen press")}`}
              >
                {page.ctaButtonLabel ?? "Get a Free Quotation"}
              </Link>
            )}
            <a
              href={`tel:${primaryPhone.e164}`}
              className={`inline-flex items-center justify-center gap-2 rounded-md bg-foreground px-5 py-2.5 text-sm font-semibold text-background hover:opacity-90${mc("press")}`}
            >
              <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
              {/* Unset label = the same two text children as before ("Call ", number), so the HTML is unchanged. */}
              {page.callButtonLabel ?? "Call "}{page.callButtonLabel ? null : primaryPhone.display}
            </a>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center gap-2 rounded-md bg-[#0B7A43] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#096436]${mc("press")}`}
            >
              <WhatsAppGlyph className="h-4 w-4 shrink-0" />
              {page.whatsappButtonLabel ?? "WhatsApp Us"}
            </a>
          </div>
        )}

        {/* Optional since 2026-11-07 (see CityPage.whyHeading): unset = no section. The fragment adds no
            markup, so pages that set it render byte-identical HTML. */}
        {page.whyHeading && (
          <>
            <h2 className={`${h2}${mc("reveal")}`}>{page.whyHeading}</h2>
            <p className={`${p}${mc("reveal")}`}>{page.whyIntro}</p>
            {/* An empty `whyBullets` (a section carried by `whyTable`) renders no list. */}
            {page.whyBullets && page.whyBullets.length > 0 && (
              <ul className={`list-disc pl-6${mc("reveal-stagger")}`}>
                {page.whyBullets.map((b) => (
                  <li key={b.title ?? b.text} className={li}>
                    {b.title && <><strong className="text-foreground">{b.title}:</strong> </>}{b.text}
                  </li>
                ))}
              </ul>
            )}
            {/* Optional table (`whyTable`); unset = no element. */}
            {page.whyTable && renderTable(page.whyTable)}
            {page.whyOutro && <p className={`${p} mt-4${mc("reveal")}`}>{page.whyOutro}</p>}
          </>
        )}

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
        {/* Optional since 2026-11-07 (see CityPage.solutionsIntro): unset = no paragraph. */}
        {page.solutionsIntro && <p className={`${p}${mc("reveal")}`}>{page.solutionsIntro}</p>}
        {page.solutions.map((s0, i) => (
          <section key={s0.title} className={page.motion ? "reveal" : undefined}>
            <h3 className={h3}>{i + 1}. {s0.title}</h3>
            <p className={p}>{s0.text}</p>
            {/* Optional contextual link (`link`, see CityPageListItem); unset = no element. */}
            {s0.link && (
              <p className={p}>
                <Link href={s0.link.href} className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
                  {s0.link.label}
                </Link>
              </p>
            )}
          </section>
        ))}
        {/* Optional table after the solutions (`solutionsTable`); unset = no element. */}
        {page.solutionsTable && renderTable(page.solutionsTable)}

        {/* Optional extra sections placed after the solutions (`placement: "afterSolutions"`). */}
        {page.extraSections?.filter((sec) => sec.placement === "afterSolutions").map(renderSection)}

        {/* Optional since 2026-11-07 (see CityPage.featuresHeading): unset = no section. */}
        {page.featuresHeading && (
          <>
            <h2 className={`${h2}${mc("reveal")}`}>{page.featuresHeading}</h2>
            <p className={`${p}${mc("reveal")}`}>{page.featuresIntro}</p>
            <ul className={`list-disc pl-6${mc("reveal-stagger")}`}>
              {(page.features ?? []).map((f) => (
                <li key={f} className={li}>{f}</li>
              ))}
            </ul>
            <p className={`${p} mt-4${mc("reveal")}`}><strong className="text-foreground">{page.sizesNote}</strong></p>
          </>
        )}

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
                {/* Optional visible caption, e.g. marking a render as illustrative. Unset = no element. */}
                {g.caption && (
                  <figcaption className="border-t px-3 py-2 text-sm leading-relaxed text-muted-foreground">
                    {g.caption}
                  </figcaption>
                )}
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
                <li key={b.title ?? b.text} className={li}>
                  {b.title && <><strong className="text-foreground">{b.title}</strong> — </>}{b.text}
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Optional since 2026-11-07 (see CityPage.customHeading): unset = no section, and no interior
            image, which belongs to it. */}
        {page.customHeading && (
          <>
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
            {/* An empty `customBullets` (a prose section, first used by Shipping & Storage Containers in
                Bellandur) renders no list; every other page has bullets, so its HTML is unchanged. */}
            {(page.customBullets ?? []).length > 0 && (
              <ul className={`list-disc pl-6${mc("reveal-stagger")}`}>
                {(page.customBullets ?? []).map((b) => (
                  <li key={b.title ?? b.text} className={li}>
                    {b.title && <><strong className="text-foreground">{b.title}</strong> — </>}{b.text}
                  </li>
                ))}
              </ul>
            )}
            <p className={`${p}${mc("reveal")}`}>{page.customOutro}</p>
            {/* Optional contextual links after the outro (`customLinks`); unset = nothing rendered. */}
            {page.customLinks && page.customLinks.length > 0 && renderLinks(page.customLinks)}
          </>
        )}

        {/* Optional since 2026-10-21 (see CityPage.whyUsHeading): unset = no section. */}
        {page.whyUsHeading && (
          <>
            <h2 className={`${h2}${mc("reveal")}`}>{page.whyUsHeading}</h2>
            <p className={`${p}${mc("reveal")}`}>{page.whyUsIntro}</p>
            <ul className={`list-disc pl-6${mc("reveal-stagger")}`}>
              {(page.whyUsBullets ?? []).map((b) => (
                <li key={b.title ?? b.text} className={li}>
                  {b.title && <><strong className="text-foreground">{b.title}</strong> — </>}{b.text}
                </li>
              ))}
            </ul>
          </>
        )}

        <h2 className={`${h2}${mc("reveal")}`}>{page.areasHeading}</h2>
        <p className={`${p}${mc("reveal")}`}>{page.areasText}</p>

        {/* Optional since 2026-11-07 (see CityPage.howHeading): unset = no section. */}
        {page.howHeading && (
          <>
            <h2 className={`${h2}${mc("reveal")}`}>{page.howHeading}</h2>
            {/* Optional lead-in / closing paragraphs (`howIntro`, `howOutro`); unset = no element. A step
                with an empty `text` (an owner list of titles only) renders its title alone. */}
            {page.howIntro && <p className={`${p}${mc("reveal")}`}>{page.howIntro}</p>}
            <ol className={`list-decimal pl-6${mc("reveal-stagger")}`}>
              {(page.howSteps ?? []).map((s0) => (
                <li key={s0.title} className={li}>
                  <strong className="text-foreground">{s0.title}</strong>{s0.text ? <> — {s0.text}</> : null}
                </li>
              ))}
            </ol>
            {page.howOutro && <p className={`${p} mt-4${mc("reveal")}`}>{page.howOutro}</p>}
            {/* Optional contextual links after the steps (`howLinks`); unset = nothing rendered. */}
            {page.howLinks && page.howLinks.length > 0 && renderLinks(page.howLinks)}
          </>
        )}

        {/* Optional extra sections (`extraSections`) without a `placement`: rendered here, after the
            "how" steps, as on every earlier page; unset = nothing rendered. */}
        {page.extraSections?.filter((sec) => !sec.placement).map(renderSection)}

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
                  {/* Optional owner labels (`callButtonLabel` / `whatsappButtonLabel`). Unset = the same two text
                      children as before ("Call ", number), so the HTML is unchanged. */}
                  {page.callButtonLabel ?? "Call "}{page.callButtonLabel ? null : primaryPhone.display}
                </a>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center gap-2 rounded-md bg-[#0B7A43] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#096436]${mc("press")}`}
                >
                  <WhatsAppGlyph className="h-4 w-4 shrink-0" />
                  {page.whatsappButtonLabel ?? "WhatsApp Us"}
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

        {/* Optional on-page enquiry form (`enquiryForm`): the category enquiry form, posting to the
            existing /api/enquiries route (which records this page as the source). Only mounted for
            a category the route accepts; unset = no form, so every other page is unchanged. */}
        {enquiry && (
          <div className="mt-10">
            <CategoryEnquiryForm
              categorySlug={enquiry.categorySlug}
              categoryName={enquiry.categoryName}
              noun={enquiry.noun}
              models={enquiry.models}
              heading={enquiry.heading}
              intro={enquiry.intro}
            />
          </div>
        )}

        {/* Optional related-pages block — the page's own internal links (product pages, the
            promotion / blog pages that own neighbouring keywords, sibling city pages). Rendered
            as a <nav> so crawlers and screen readers read it as navigation, not body copy.
            `relatedLinksHeading` (optional) renames it; unset = "Related pages", as before. */}
        {page.relatedLinks && page.relatedLinks.length > 0 && (
          <nav aria-label={page.relatedLinksHeading ?? "Related pages"} className={`mt-10${mc("reveal")}`}>
            <h2 className="mb-3 text-xl font-bold tracking-tight">{page.relatedLinksHeading ?? "Related pages"}</h2>
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

        {/* Optional nearby-locations block (`nearbyLinks`), same markup as the related links.
            Unset = nothing rendered. */}
        {page.nearbyLinks && page.nearbyLinks.links.length > 0 && (
          <nav aria-label={page.nearbyLinks.heading} className={`mt-10${mc("reveal")}`}>
            <h2 className="mb-3 text-xl font-bold tracking-tight">{page.nearbyLinks.heading}</h2>
            <ul className={`grid gap-2 sm:grid-cols-2${mc("reveal-stagger")}`}>
              {page.nearbyLinks.links.map((l) => (
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
