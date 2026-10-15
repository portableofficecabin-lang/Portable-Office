// SERVER COMPONENT — the shared landing section for a product category
// (/products/category/<slug>), rendered by the route and handed to the client listing as markup
// through the `categoryContent` prop, so none of this copy or data enters the client bundle.
//
// Everything it prints comes from ONE resolved object (src/data/categoryLandings.ts →
// resolveCategoryLanding). The route builds that object once and passes the same instance here
// and to its FAQPage / ItemList JSON-LD, so the visible FAQ and the FAQ markup cannot diverge,
// and every ₹ figure is the same sellPrice() integer the cards, cart, checkout and feed use.
//
// Heading structure: the page's single <h1> is the category name (Products.tsx PageHero); this
// section contributes <h2> per topic and <h3> per item, in reading order.
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";

import type { ResolvedCategoryLanding } from "@/data/categoryLandings";
import { CategoryEnquiryForm } from "@/components/products/CategoryEnquiryForm";

const h2 = "font-display text-2xl font-bold text-foreground mb-4";
const linkClass =
  "font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded";

export function CategoryLandingContent({ landing }: { landing: ResolvedCategoryLanding }) {
  const { slug, categoryName, links } = landing;
  const id = (part: string) => `${slug}-${part}`;

  return (
    <div className="mt-12 space-y-14 border-t border-border/50 pt-10">
      {/* ── Intro ─────────────────────────────────────────────────────────── */}
      <section aria-labelledby={id("intro")} className="max-w-4xl">
        <h2 id={id("intro")} className={h2}>
          {landing.heading}
        </h2>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          {landing.intro.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
        </div>
      </section>

      {/* ── Model comparison — computed from the catalogue ────────────────── */}
      <section aria-labelledby={id("compare")}>
        <h2 id={id("compare")} className={h2}>
          {`Compare ${categoryName}: Size, Build and Price`}
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-5 max-w-3xl">
          {`Each price below includes ${landing.gst} GST and is the same figure shown on the product page, in the cart and at checkout. Transport and optional installation are added at checkout from your delivery PIN code.`}
        </p>
        {/* Focusable + labelled so keyboard users can scroll it when it overflows on a phone. */}
        <div className="overflow-x-auto rounded-xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" tabIndex={0} role="region" aria-label={`${categoryName} model comparison (scrolls sideways on small screens)`}>
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">{`${categoryName}: size, construction, use and price of each model`}</caption>
            <thead>
              <tr className="bg-muted/50 text-left">
                <th scope="col" className="px-4 py-3 font-semibold">Model</th>
                {/* Price second, so a phone shows model + price before any sideways scroll. */}
                <th scope="col" className="px-4 py-3 font-semibold">Price (incl. GST)</th>
                <th scope="col" className="px-4 py-3 font-semibold">Size / configuration</th>
                <th scope="col" className="px-4 py-3 font-semibold">Construction</th>
                <th scope="col" className="px-4 py-3 font-semibold">Best for</th>
              </tr>
            </thead>
            <tbody>
              {landing.models.map((m) => (
                <tr key={m.id} className="border-t border-border/60 align-top">
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    <Link href={m.path} className={linkClass}>
                      {m.name}
                    </Link>
                  </th>
                  <td className="px-4 py-3 font-semibold tabular-nums whitespace-nowrap">
                    {m.priceLabel ?? "Price on request"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {m.size}
                    {m.area && <span className="block text-xs">{m.area}</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.construction}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Applications ──────────────────────────────────────────────────── */}
      <section aria-labelledby={id("uses")}>
        <h2 id={id("uses")} className={h2}>
          {landing.applicationsHeading}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {landing.applications.map((a) => (
            <li key={a.title} className="rounded-xl border border-border/60 bg-card p-5">
              <h3 className="font-display text-lg font-semibold text-foreground mb-1.5">{a.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{a.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── How to choose ─────────────────────────────────────────────────── */}
      <section aria-labelledby={id("choose")} className="max-w-4xl">
        <h2 id={id("choose")} className={h2}>
          {landing.choosingHeading}
        </h2>
        <div className="space-y-5">
          {landing.choosing.map((c) => (
            <div key={c.title}>
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">{c.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{c.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Transport, installation and delivery — read from the checkout's own tables ── */}
      <section aria-labelledby={id("delivery")}>
        <h2 id={id("delivery")} className={h2}>
          Transport, Installation and Delivery
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-5 max-w-3xl">
          {`Listed models are dispatched within ${landing.dispatch} of order confirmation and payment. Transport is charged by delivery zone and shown at checkout before you pay; the amounts below include ${landing.gst} GST.`}
        </p>
        {/* Focusable + labelled so keyboard users can scroll it when it overflows on a phone. */}
        <div className="overflow-x-auto rounded-xl border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" tabIndex={0} role="region" aria-label="Transport charges by delivery zone (scrolls sideways on small screens)">
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">Transport charge and transit time by delivery zone</caption>
            <thead>
              <tr className="bg-muted/50 text-left">
                <th scope="col" className="px-4 py-3 font-semibold">Zone</th>
                <th scope="col" className="px-4 py-3 font-semibold">Transport</th>
                <th scope="col" className="px-4 py-3 font-semibold">Transit after dispatch</th>
                <th scope="col" className="px-4 py-3 font-semibold">Areas</th>
              </tr>
            </thead>
            <tbody>
              {landing.transport.map((row) => (
                <tr key={row.zone} className="border-t border-border/60 align-top">
                  <th scope="row" className="px-4 py-3 text-left font-medium text-foreground">{row.zone}</th>
                  <td className="px-4 py-3 font-semibold tabular-nums whitespace-nowrap">{row.charge}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{row.transit}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.areas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-3xl">
          {`${landing.installation.label} is optional at ${landing.installation.charge}: ${landing.installation.description} `}
          <Link href="/shipping" className={linkClass}>
            Read the shipping and delivery policy
          </Link>
          .
        </p>
      </section>

      {/* ── Service locations — category-matched pages only ───────────────── */}
      {links.locationLinks.length > 0 && (
        <section aria-labelledby={id("locations")}>
          <h2 id={id("locations")} className={h2}>
            {links.locationHeading ?? `${categoryName} by Location`}
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4 max-w-3xl">
            Units are built at our Tamil Nadu factory near Hosur, with a sales office in Electronic City,
            Bangalore, and delivered across India by zone. These pages cover local delivery and common
            requirements in each area.
          </p>
          <ul className="flex flex-wrap gap-2.5">
            {links.locationLinks.map((l) => (
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
        </section>
      )}

      {/* ── Guides and related categories ────────────────────────────────── */}
      {(links.guideLinks.length > 0 || landing.relatedCategories.length > 0) && (
        <section aria-labelledby={id("guides")}>
          <h2 id={id("guides")} className={h2}>
            Guides and Related Products
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...links.guideLinks, ...landing.relatedCategories].map((l) => (
              <li key={l.href} className="rounded-xl border border-border/60 bg-card p-4">
                <Link href={l.href} className={`${linkClass} inline-flex items-center gap-1.5`}>
                  {l.name}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                {l.description && (
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{l.description}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── FAQ — the same array the route emits as FAQPage JSON-LD ───────── */}
      <section aria-labelledby={id("faq")} className="max-w-4xl">
        <h2 id={id("faq")} className={h2}>
          {`${categoryName}: Frequently Asked Questions`}
        </h2>
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {landing.faqs.map((f) => (
            <details key={f.question} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-details-marker]:hidden">
                <h3 className="font-semibold text-foreground">{f.question}</h3>
                <span
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-xl leading-none text-accent transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-muted-foreground leading-relaxed">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Custom requirement enquiry (client island) ───────────────────── */}
      <CategoryEnquiryForm
        categorySlug={slug}
        categoryName={categoryName}
        noun={landing.enquiryNoun}
        models={landing.models.map((m) => ({ id: m.id, name: m.name }))}
      />
    </div>
  );
}
