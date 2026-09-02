/**
 * CONTAINER OFFICE — the SIZE-SPECIFIC long-form section of a variant page. SERVER COMPONENT.
 *
 * Registry-driven: reads src/data/containerOfficeSizes.ts by (family slug, size slug) and
 * renders NOTHING when no entry exists — so ProductVariantView mounts it unconditionally and
 * stays generic, exactly the pattern ProductGuidesSection set. This is the component that turns
 * the five thin size pages into standalone product pages: unique introduction, realistic
 * layouts, the honest limitation, the material break-up, the scope lists and size-specific
 * FAQs, none of it shared boilerplate.
 *
 * ── WHAT IT DELIBERATELY DOES NOT RENDER ────────────────────────────────────────────────────
 *   • Any ₹ figure. Price is the buy-box's job, fed by the commerce catalogue; an unpriced
 *     size says "price on request" there and this section never contradicts it.
 *   • Any capacity/headcount, height, warranty or lead-time claim — none is owner-confirmed
 *     (the lead-time chip beside the CTAs already shows variant.leadTime).
 *   • A second Product JSON-LD node. The FAQ schema here is a FAQPage — a different type —
 *     built from the SAME array the accordion renders, which is the only condition under
 *     which FAQ markup is legitimate.
 *
 * The metric dimensions are DERIVED from the size's own lengthFt/widthFt (feetToMetresLabel),
 * so they can never contradict the feet — computed, not typed twice.
 */

import Link from "next/link";
import { ArrowRight, CheckCircle2, Layout as LayoutIcon, MessageCircle } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { JsonLd } from "@/components/JsonLd";
import { SpecificationBreakup } from "@/components/products/SpecificationBreakup";
import { generateFAQSchema } from "@/lib/seo/structured-data";
import {
  CONTAINER_OFFICE_CUSTOMER_SCOPE,
  CONTAINER_OFFICE_OPTIONAL_ITEMS,
  CONTAINER_OFFICE_SPEC_GROUPS,
  SPEC_BREAKUP_DISCLAIMER,
  feetToMetresLabel,
  getContainerOfficeSizeContent,
} from "@/data/containerOfficeSizes";
import {
  builtUpAreaSqFt,
  publishedVariants,
  variantPath,
  type VariantHit,
} from "@/data/productFamilies";

export function ContainerOfficeSizeContent({ hit }: { hit: VariantHit }) {
  const { family, variant } = hit;
  const content = getContainerOfficeSizeContent(family.slug, variant.sizeSlug);
  if (!content) return null;

  const stepUp = content.stepUpSlug
    ? publishedVariants(family).find((v) => v.sizeSlug === content.stepUpSlug)
    : undefined;

  return (
    <div className="mt-16 space-y-14">
      {/* ── Size-specific introduction ─────────────────────────────────────────────── */}
      <section aria-labelledby="size-intro-heading">
        <h2 id="size-intro-heading" className="font-display text-2xl font-bold text-foreground mb-2">
          The {variant.sizeLabelPlain} size, honestly described
        </h2>
        <p className="text-sm font-medium text-accent mb-4">{content.positioning}</p>
        <div className="max-w-3xl space-y-4">
          {content.intro.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="leading-relaxed text-muted-foreground">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Derived facts panel — every number computed from the size's own definition. */}
        <dl className="mt-6 grid gap-3 sm:grid-cols-3 max-w-3xl">
          <div className="rounded-xl border border-border bg-card p-4">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Size in feet</dt>
            <dd className="mt-1 font-display font-bold text-foreground">{variant.sizeLabel}</dd>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Size in metres</dt>
            <dd className="mt-1 font-display font-bold text-foreground">
              {feetToMetresLabel(variant.lengthFt, variant.widthFt)}
            </dd>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Built-up area</dt>
            <dd className="mt-1 font-display font-bold text-foreground">
              {builtUpAreaSqFt(variant)} sq ft
            </dd>
          </div>
        </dl>
      </section>

      {/* ── Best uses ──────────────────────────────────────────────────────────────── */}
      <section aria-labelledby="size-uses-heading">
        <h2 id="size-uses-heading" className="font-display text-2xl font-bold text-foreground mb-5">
          What this size is bought for
        </h2>
        <ul className="grid gap-2.5 sm:grid-cols-2 max-w-3xl">
          {content.bestUses.map((use) => (
            <li key={use} className="flex items-start gap-2.5 text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <span>{use}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Layouts that actually work at this footprint ───────────────────────────── */}
      <section aria-labelledby="size-layouts-heading">
        <h2 id="size-layouts-heading" className="font-display text-2xl font-bold text-foreground mb-2">
          Layouts that work in {variant.sizeLabelPlain}
        </h2>
        <p className="mb-5 max-w-3xl text-sm text-muted-foreground">
          Only arrangements this footprint genuinely supports are listed — partition positions,
          door swings and electrical points are drawn against your chosen layout at quotation.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {content.layouts.map((layout) => (
            <div key={layout.title} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <LayoutIcon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-display font-bold text-foreground">{layout.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {layout.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* The honest limitation — stated, not buried. */}
        <div className="mt-5 max-w-3xl rounded-xl border border-amber/30 bg-amber/5 p-5">
          <h3 className="font-display font-bold text-foreground">
            Where this size reaches its limit
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {content.limitations}
          </p>
          {stepUp && (
            <Link
              href={variantPath(family, stepUp)}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
            >
              See the {stepUp.sizeLabelPlain} size
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </section>

      {/* ── Material break-up (family-level truth, one definition) ─────────────────── */}
      <SpecificationBreakup
        groups={CONTAINER_OFFICE_SPEC_GROUPS}
        disclaimer={SPEC_BREAKUP_DISCLAIMER}
        headingId={`spec-breakup-${variant.sizeSlug}`}
      />

      {/* ── Included / optional / customer scope ───────────────────────────────────── */}
      <section aria-labelledby="size-scope-heading">
        <h2 id="size-scope-heading" className="font-display text-2xl font-bold text-foreground mb-5">
          Included, optional, and what stays with you
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">
            <h3 className="font-display font-bold text-foreground mb-3">
              Included as standard
            </h3>
            <ul className="space-y-2">
              {variant.includedConfiguration.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-amber/30 bg-amber/5 p-5">
            <h3 className="font-display font-bold text-foreground mb-3">Optional add-ons</h3>
            <ul className="space-y-2.5">
              {CONTAINER_OFFICE_OPTIONAL_ITEMS.map((entry) => (
                <li key={entry.item} className="text-sm">
                  <span className="font-medium text-foreground">{entry.item}</span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">
                    {entry.note}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-display font-bold text-foreground mb-3">
              Customer scope at site
            </h3>
            <ul className="space-y-2.5">
              {CONTAINER_OFFICE_CUSTOMER_SCOPE.map((entry) => (
                <li key={entry.item} className="text-sm">
                  <span className="font-medium text-foreground">{entry.item}</span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">
                    {entry.note}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground max-w-3xl">
          Scope for your specific order is stated line by line in the written quotation — the
          lists above describe the standard arrangement, not a promise that every exclusion
          applies to every order.
        </p>
      </section>

      {/* ── Size-specific FAQ — visible text IS the schema text ────────────────────── */}
      <section aria-labelledby="size-faq-heading">
        <h2 id="size-faq-heading" className="font-display text-2xl font-bold text-foreground mb-5">
          {variant.sizeLabelPlain} — questions buyers ask
        </h2>
        <Accordion type="single" collapsible className="w-full max-w-3xl">
          {content.faqs.map((faq, index) => (
            <AccordionItem key={faq.question} value={`size-faq-${index}`}>
              <AccordionTrigger className="text-left font-display font-semibold">
                <h3>{faq.question}</h3>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        {/* Legitimate only because every answer above renders visibly on this same page. */}
        <JsonLd data={generateFAQSchema(content.faqs.map((f) => ({ question: f.question, answer: f.answer })))} />
      </section>

      {/* ── Quotation CTA ──────────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-accent/30 bg-accent/5 p-6">
        <h2 className="font-display text-xl font-bold text-foreground">
          Get a written quotation for the {variant.sizeLabelPlain}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Tell us the layout you have in mind and your delivery PIN code. You receive a written
          price for this exact size and configuration — with transport calculated for your
          location, and every included and optional item stated line by line.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Request quotation
          </Link>
          <Link
            href={`/products/${family.slug}`}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 font-semibold transition-colors hover:bg-muted"
          >
            Compare all {family.groupTitle.toLowerCase()} sizes
          </Link>
        </div>
      </section>
    </div>
  );
}
