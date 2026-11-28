import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import { JsonLd } from "@/components/JsonLd";
import { Layout } from "@/components/layout/Layout";
import { PageHero } from "@/components/layout/PageHero";
import { GUIDES_PATH } from "@/data/guideMoves";
import { allGuidePages, childPagePath, getChildGroup } from "@/data/productChildPages";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";

/**
 * GUIDES INDEX — /guides (D5, 2026-11).
 *
 * The landing page of the informational guides that moved out of /products (src/data/
 * guideMoves.ts). Built entirely from the guide registry — every card is a guide's own H1 and meta
 * description, so this page adds no claim of its own — plus links back to the buying path: the
 * range page and the guides that stay under /products because they describe a configuration, a use
 * case or a product type.
 */
export const revalidate = 1800;

const SITE = "https://portableofficecabin.com";
const TITLE = "Portable Cabin Guides";
const DESCRIPTION =
  "Plain-language guides to buying a portable cabin: costs, sizes, MS vs PUF materials, layouts, installation, transport, maintenance and new vs used.";

export const metadata: Metadata = buildPageMetadata({ title: TITLE, description: DESCRIPTION, path: GUIDES_PATH });

export default function GuidesIndexPage() {
  const guides = allGuidePages();
  const group = getChildGroup("portable-cabin");
  const kept = (group?.children ?? []).filter((c) => !childPagePath(group!, c).startsWith(`${GUIDES_PATH}/`));

  return (
    <Layout>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: SITE },
          { name: "Guides", url: `${SITE}${GUIDES_PATH}` },
        ])}
      />
      <PageHero
        eyebrow="BUYING HELP"
        title={TITLE}
        description={DESCRIPTION}
        breadcrumbs={[{ name: "Home", href: "/" }, { name: "Guides" }]}
      />
      <section className="section-padding">
        <div className="container-custom max-w-5xl">
          <div className="grid gap-4 sm:grid-cols-2">
            {guides.map(({ group: g, page, guideSlug }) => (
              <Link
                key={guideSlug}
                href={childPagePath(g, page)}
                className="group flex flex-col rounded-2xl border border-border/60 bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
                  <BookOpen className="h-[18px] w-[18px] text-accent" aria-hidden="true" />
                </span>
                <h2 className="font-display text-lg font-bold text-foreground">{page.h1}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{page.metaDescription}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent">
                  Read the guide
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-border/60 bg-muted/40 p-6">
            <h2 className="font-display text-xl font-bold text-foreground">Ready to compare models?</h2>
            <p className="mt-2 text-muted-foreground">
              Sizes, specifications and prices of every portable cabin we build are on one page, and three
              more buying pages cover specific configurations.
            </p>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/products/portable-cabin" className="font-semibold text-accent hover:underline">
                  Portable cabin sizes, specifications and prices
                </Link>
              </li>
              {group &&
                kept.map((c) => (
                  <li key={c.slug}>
                    <Link href={childPagePath(group, c)} className="font-semibold text-accent hover:underline">
                      {c.h1}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </section>
    </Layout>
  );
}
