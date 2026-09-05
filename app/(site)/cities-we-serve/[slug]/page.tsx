/**
 * CITY / AREA LANDING PAGE — /cities-we-serve/<slug> (e.g. /cities-we-serve/container-office-in-jigani).
 *
 * Fully SERVER-rendered from src/data/cityPages.ts (one data entry = one page): exact meta title
 * (absolute — no site-name suffix), meta description, keywords, local geo tags, breadcrumb +
 * FAQPage JSON-LD, and the approved SEO copy as crawlable HTML. No client JS is needed for the
 * content, keeping the rendered text byte-exact with the server HTML (site-wide SEO rule).
 */

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CITY_PAGES, cityPageBySlug, type CityPageLink } from "@/data/cityPages";
import { Layout } from "@/components/layout/Layout";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/components/JsonLd";
import { generateBreadcrumbSchema, generateFAQSchema } from "@/lib/seo/structured-data";

export const revalidate = 3600; // 1 hour, same as the cities index

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
  });
}

const h2 = "mt-10 mb-3 text-2xl font-bold tracking-tight";
const h3 = "mt-6 mb-1.5 text-lg font-semibold";
const p = "mb-4 leading-relaxed text-muted-foreground";
const li = "mb-2 leading-relaxed text-muted-foreground";

/* Secondary CTA buttons every page carried before `ctaSecondaryLinks` existed. Pages that
   leave that field unset render exactly these two, so nothing shifts on the container pages. */
const DEFAULT_CTA_SECONDARY_LINKS: CityPageLink[] = [
  { label: "Explore Container Offices", href: "/products" },
  { label: "Container Office on Rent", href: "/rental-service" },
];

export default async function CityLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = cityPageBySlug(slug);
  if (!page) notFound();

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
          { name: page.metaTitle, url: `https://portableofficecabin.com/cities-we-serve/${page.slug}` },
        ])}
      />
      <JsonLd data={generateFAQSchema(page.faqs)} />

      <div className="container mx-auto max-w-4xl px-4 py-12">
        {/* breadcrumb (visible) */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
          <Link href="/" className="hover:underline">Home</Link>
          <span aria-hidden> / </span>
          <Link href="/cities-we-serve" className="hover:underline">Cities We Serve</Link>
          <span aria-hidden> / </span>
          <span className="text-foreground">{page.h1}</span>
        </nav>

        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{page.h1}</h1>
        <p className="mt-2 text-lg font-medium">{page.tagline}</p>

        {/* hero — the page's own image (also its og:image), LCP-prioritised */}
        <figure className="mt-6 overflow-hidden rounded-2xl border bg-muted/30">
          <Image
            src={page.heroImage.src}
            alt={page.heroImage.alt}
            width={page.heroImage.width}
            height={page.heroImage.height}
            priority
            sizes="(max-width: 896px) 100vw, 896px"
            className="mx-auto h-auto w-full max-w-2xl"
          />
        </figure>

        {page.intro.map((text) => (
          <p key={text.slice(0, 40)} className={`${p} mt-4`}>{text}</p>
        ))}

        <h2 className={h2}>{page.whyHeading}</h2>
        <p className={p}>{page.whyIntro}</p>
        <ul className="list-disc pl-6">
          {page.whyBullets.map((b) => (
            <li key={b.title} className={li}>
              <strong className="text-foreground">{b.title}:</strong> {b.text}
            </li>
          ))}
        </ul>
        {page.whyOutro && <p className={`${p} mt-4`}>{page.whyOutro}</p>}

        {/* Feature band — a single editorial plate breaking the longest text run on the page.
            Cropped 3:2 (sources are square, so object-cover keeps the cabin centred and stops a
            full-width square from swallowing a whole viewport), with the caption sitting on a
            bottom scrim rather than below the frame, so the image reads as one composed unit.
            The scrim is dark-on-image in both themes, which is why its text colour is fixed. */}
        {page.featureImage && (
          <figure className="relative mt-10 overflow-hidden rounded-2xl border shadow-sm">
            <div className="relative aspect-[3/2] w-full">
              <Image
                src={page.featureImage.src}
                alt={page.featureImage.alt}
                fill
                sizes="(max-width: 896px) 100vw, 896px"
                className="object-cover object-center"
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

        <h2 className={h2}>{page.solutionsHeading}</h2>
        <p className={p}>{page.solutionsIntro}</p>
        {page.solutions.map((s0, i) => (
          <section key={s0.title}>
            <h3 className={h3}>{i + 1}. {s0.title}</h3>
            <p className={p}>{s0.text}</p>
          </section>
        ))}

        <h2 className={h2}>{page.featuresHeading}</h2>
        <p className={p}>{page.featuresIntro}</p>
        <ul className="list-disc pl-6">
          {page.features.map((f) => (
            <li key={f} className={li}>{f}</li>
          ))}
        </ul>
        <p className={`${p} mt-4`}><strong className="text-foreground">{page.sizesNote}</strong></p>

        {/* gallery — every angle of the cabin, lazy-loaded. Columns follow the item count so a
            1- or 2-image gallery fills the row instead of sitting stranded at a third width. */}
        {page.gallery && page.gallery.length > 0 && (
          <div
            className={`mt-6 grid gap-4 ${
              page.gallery.length === 1 ? "" : page.gallery.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"
            }`}
          >
            {page.gallery.map((g) => (
              <figure key={g.src} className="overflow-hidden rounded-xl border bg-muted/30">
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

        <h2 className={h2}>{page.industriesHeading}</h2>
        <p className={p}>{page.industriesIntro}</p>
        <ul className="list-disc pl-6">
          {page.industries.map((b) => (
            <li key={b.title} className={li}>
              <strong className="text-foreground">{b.title}</strong> — {b.text}
            </li>
          ))}
        </ul>

        <h2 className={h2}>{page.customHeading}</h2>
        {page.interiorImage && (
          <figure className="mb-4 mt-2 overflow-hidden rounded-2xl border bg-muted/30">
            <Image
              src={page.interiorImage.src}
              alt={page.interiorImage.alt}
              width={page.interiorImage.width}
              height={page.interiorImage.height}
              sizes="(max-width: 896px) 100vw, 896px"
              className="mx-auto h-auto w-full max-w-2xl"
              loading="lazy"
            />
          </figure>
        )}
        <p className={p}>{page.customIntro}</p>
        <ul className="list-disc pl-6">
          {page.customBullets.map((b) => (
            <li key={b.title} className={li}>
              <strong className="text-foreground">{b.title}</strong> — {b.text}
            </li>
          ))}
        </ul>
        <p className={p}>{page.customOutro}</p>

        <h2 className={h2}>{page.whyUsHeading}</h2>
        <p className={p}>{page.whyUsIntro}</p>
        <ul className="list-disc pl-6">
          {page.whyUsBullets.map((b) => (
            <li key={b.title} className={li}>
              <strong className="text-foreground">{b.title}</strong> — {b.text}
            </li>
          ))}
        </ul>

        <h2 className={h2}>{page.areasHeading}</h2>
        <p className={p}>{page.areasText}</p>

        <h2 className={h2}>{page.howHeading}</h2>
        <ol className="list-decimal pl-6">
          {page.howSteps.map((s0) => (
            <li key={s0.title} className={li}>
              <strong className="text-foreground">{s0.title}</strong> — {s0.text}
            </li>
          ))}
        </ol>

        <h2 className={h2}>Frequently Asked Questions (FAQs)</h2>
        {page.faqs.map((f, i) => (
          <section key={f.question} className="mb-4">
            <h3 className={h3}>{i + 1}. {f.question}</h3>
            <p className={p}>{f.answer}</p>
          </section>
        ))}

        <section className="mt-12 rounded-2xl border bg-muted/40 p-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight">{page.ctaHeading}</h2>
          <p className={`${p} mx-auto mt-2 max-w-2xl`}>{page.ctaText}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              href="/contact"
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {page.ctaButtonLabel ?? "Get a Free Quotation"}
            </Link>
            {(page.ctaSecondaryLinks ?? DEFAULT_CTA_SECONDARY_LINKS).map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md border px-5 py-2.5 text-sm font-semibold hover:bg-muted"
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
          <nav aria-label="Related pages" className="mt-10">
            <h2 className="mb-3 text-xl font-bold tracking-tight">Related pages</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {page.relatedLinks.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="block rounded-lg border px-4 py-3 text-sm font-medium hover:bg-muted"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* Optional legal/affiliation disclaimer — REQUIRED on any page that names a real
            company or landmark (e.g. the Tata Electronics belt page): renders muted, below
            the CTA, exactly where such notices belong. Pages without one are unaffected. */}
        {page.disclaimer && (
          <p className="mt-8 text-xs leading-relaxed text-muted-foreground/80">{page.disclaimer}</p>
        )}
      </div>
    </Layout>
  );
}
