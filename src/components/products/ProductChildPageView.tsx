// SERVER COMPONENT — no "use client". Renders one SEO child page of a product from the
// productChildPages registry: everything (headings, copy, FAQ answers, links, and the live
// price table) is in the initial HTML.
//
// Follows every convention the SSR audit locked in:
//   • eyebrow text is literal-uppercase (CSS `uppercase` stays — byte-match rule);
//   • no <br/> joins; every sentence is a single contiguous text node;
//   • FAQ uses the shared Accordion (forceMount — answers render server-side);
//   • ALL prices come from the commerce source of truth (sellPrice/isPurchasable) at render
//     time — the registry file itself is ₹-free by rule.
//
// Internal-link lattice per page: breadcrumb → parent, CTA band → parent + contact,
// sibling guides → every other child of the same parent, `related` → curated cross-links.
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { WhatsAppGlyph } from "@/components/WhatsAppGlyph";
import { getCommerce, isPurchasable } from "@/data/productCommerce";
import { products, getProductDetailPath } from "@/data/products";
import { GST_PERCENT_LABEL, formatINR, sellPrice } from "@/lib/pricing/gst";
import { whatsappUrl } from "@/lib/site-navigation";
import type { ProductChildGroup, ProductChildPage } from "@/data/productChildPages";

export function ProductChildPageView({ group, page }: { group: ProductChildGroup; page: ProductChildPage }) {
  const parentPath = `/products/${group.parentSlug}`;
  const siblings = group.children.filter((c) => c.slug !== page.slug);

  /* Live GST-inclusive prices of the parent category's purchasable SKUs — same source as
   * the product page, cart, JSON-LD and Merchant feed, so this table can never disagree. */
  const pricedProducts = page.showPriceTable
    ? products
        .filter((p) => p.categorySlug === group.categorySlug && isPurchasable(p.id))
        .map((p) => ({ p, price: sellPrice(getCommerce(p.id)!.basePrice) }))
        .filter((x) => x.price > 0)
    : [];

  return (
    <Layout>
      <PageHero
        eyebrow={`${group.parentName} Guide`}
        title={page.h1}
        description={page.metaDescription}
        breadcrumbs={[
          { name: "Home", href: "/" },
          { name: "Products", href: "/products" },
          { name: group.parentName, href: parentPath },
          { name: page.h1 },
        ]}
      />

      <section className="section-padding">
        <div className="container-custom max-w-4xl">
          {/* Intro */}
          {page.intro.map((para) => (
            <p key={para.slice(0, 40)} className="mb-4 text-base leading-relaxed text-muted-foreground">
              {para}
            </p>
          ))}

          {/* Content sections */}
          {page.sections.map((s) => (
            <div key={s.heading} className="mt-10">
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">{s.heading}</h2>
              {s.paragraphs.map((para) => (
                <p key={para.slice(0, 40)} className="mb-4 text-base leading-relaxed text-muted-foreground">
                  {para}
                </p>
              ))}
              {s.bullets && (
                <ul className="mt-4 space-y-2">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-foreground/85">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {/* Live price table — rendered ONLY from the commerce source of truth */}
          {pricedProducts.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                {`Current ${group.parentName.toLowerCase()} prices (incl. ${GST_PERCENT_LABEL} GST)`}
              </h2>
              <div className="overflow-x-auto rounded-2xl border border-border/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/40 text-left">
                      <th scope="col" className="px-4 py-3 font-semibold text-foreground">MODEL</th>
                      <th scope="col" className="px-4 py-3 font-semibold text-foreground">PRICE (INCL. GST)</th>
                      <th scope="col" className="px-4 py-3" aria-label="View product" />
                    </tr>
                  </thead>
                  <tbody>
                    {pricedProducts.map(({ p, price }) => (
                      <tr key={p.id} className="border-b border-border/40 last:border-0">
                        <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                        <td className="px-4 py-3 font-display font-bold text-foreground">{formatINR(price)}</td>
                        <td className="px-4 py-3 text-right">
                          <Link href={getProductDetailPath(p)} className="font-semibold text-accent hover:underline">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Prices are fixed and GST-inclusive — identical on the product page, cart and checkout. Transport is calculated from your PIN code before payment.
              </p>
            </div>
          )}

          {/* FAQs — SSR'd answers via the shared forceMount accordion */}
          {page.faqs.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display text-2xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
              <Accordion type="single" collapsible className="w-full">
                {page.faqs.map((f, i) => (
                  <AccordionItem key={f.q} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left text-base font-semibold">{f.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}

          {/* CTA band → parent + enquiry */}
          <div className="mt-12 flex flex-col items-center justify-between gap-6 rounded-2xl border border-border/50 bg-navy-deep p-6 sm:p-8 lg:flex-row">
            <div>
              <h2 className="font-display text-xl font-bold text-white sm:text-2xl">
                {`Ready to choose your ${group.parentName.toLowerCase()}?`}
              </h2>
              <p className="mt-1 text-sm text-white/70">
                See models, live GST-inclusive prices and delivery options on the main page.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href={parentPath}>
                  {`View ${group.parentName} Range`}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <WhatsAppGlyph className="mr-2 h-4 w-4" />
                  WhatsApp
                </a>
              </Button>
            </div>
          </div>

          {/* Related cross-links */}
          {page.related.length > 0 && (
            <div className="mt-10">
              <h3 className="font-display text-lg font-bold text-foreground mb-3">Related reading</h3>
              <ul className="space-y-2">
                {page.related.map((r) => (
                  <li key={r.href}>
                    <Link href={r.href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline">
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      {r.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sibling guides — the full lattice, every child links every other child */}
          {siblings.length > 0 && (
            <div className="mt-10">
              <h3 className="font-display text-lg font-bold text-foreground mb-3">
                {`More ${group.parentName.toLowerCase()} guides`}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {siblings.map((s) => (
                  <Link
                    key={s.slug}
                    href={`${parentPath}/${s.slug}`}
                    className="rounded-xl border border-border/60 bg-card p-4 text-sm font-semibold text-foreground transition-colors hover:border-accent/40 hover:text-accent"
                  >
                    {s.h1}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
