/**
 * CONTAINER OFFICE — the PARENT page's family sections. SERVER COMPONENT.
 *
 * The parent page (/products/container-office) is both a live product page (the 25 ft × 14 ft
 * build, POC-CO-GEN) and the family's authority page. Its long-form family copy already exists
 * (ContainerOfficeGenericContent — what a container office is, benefits, applications,
 * process, maintenance, cost drivers). What was missing is the SIZE architecture: rich cards
 * for every standard size, a comparison table, the service-area statement and family-level
 * FAQs about choosing between sizes. That is all this component adds — it duplicates none of
 * the generic content's sections.
 *
 * ── EVERY NUMBER IS DERIVED OR CATALOGUED ───────────────────────────────────────────────────
 * Sizes and areas come from the family data (area is computed from L × W). The one price shown
 * is the 25 ft × 14 ft's, read through the SAME sellPrice(getCommerce(...)) path as the buy
 * box, the JSON-LD and the feed — never typed here. Unpriced sizes say "Request quote".
 * Capacity/headcount columns are deliberately ABSENT: no occupancy figure has ever been
 * owner-confirmed, and the brief's own rule is to confirm or omit.
 *
 * ── "MANUFACTURER SERVING BANGALORE" ────────────────────────────────────────────────────────
 * The factory is in Tamil Nadu near Hosur; Bangalore is an office (src/lib/company.ts). This
 * site's established truthful form is "Manufacturer Serving Bangalore" (the homepage's own
 * title), so that is the wording here — never "manufacturer in Bangalore", which would repeat
 * the unresolved location-claim class this codebase is actively removing.
 *
 * ── CRAWLABILITY ────────────────────────────────────────────────────────────────────────────
 * Every size link is a real <Link> anchor in the server HTML. The comparison table's Details
 * column repeats them, so the parent links each child at least twice in plain markup.
 */

import Link from "next/link";
import { ArrowRight, MapPin, Ruler } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { JsonLd } from "@/components/JsonLd";
import { OptimizedImage } from "@/components/OptimizedImage";
import { generateFAQSchema } from "@/lib/seo/structured-data";
import { getCommerce, isOutrightSale } from "@/data/productCommerce";
import { getContainerOfficeSizeContent } from "@/data/containerOfficeSizes";
import {
  builtUpAreaSqFt,
  getFamilyBySlug,
  publishedVariants,
  variantIsPurchasable,
  variantPath,
  type ProductFamily,
  type SizeVariant,
} from "@/data/productFamilies";
import { formatINR, sellPrice } from "@/lib/pricing/gst";

/** The one price string a size may show — the commerce catalogue's, or a quote invitation. */
function priceCell(family: ProductFamily, variant: SizeVariant): string {
  if (variantIsPurchasable(family, variant) && isOutrightSale(variant.variantId)) {
    const commerce = getCommerce(variant.variantId);
    if (commerce) return `${formatINR(sellPrice(commerce.basePrice))} incl. GST`;
  }
  return "Request quote";
}

/** One line of recommended use per size — from the size's own content registry. */
function recommendedUse(family: ProductFamily, variant: SizeVariant): string {
  const content = getContainerOfficeSizeContent(family.slug, variant.sizeSlug);
  if (content) return content.bestUses[0];
  // The parent-rendered 25 ft x 14 ft has no registry entry — its use comes from the family.
  return family.bestFor;
}

/** FAMILY-LEVEL FAQ — about choosing between sizes, not about any one size. */
const FAMILY_FAQS: { question: string; answer: string }[] = [
  {
    question: "Which container office size should I choose?",
    answer:
      "Start from what the room has to DO. Gate and security duty: 10 ft x 10 ft. A compact office that relocates often: 20 ft x 8 ft, the container-module footprint. A standard project office, with or without a manager cabin: 20 ft x 10 ft — the size most projects order. A private cabin plus a proper team room: 30 ft x 10 ft. A full establishment with a meeting room: 40 ft x 10 ft. Each size's own page explains its layouts and its honest limits.",
  },
  {
    question: "How is a container office priced?",
    answer:
      "As a complete factory-finished cabin for a specific size and configuration — never per square foot. Where a size shows a price on this site, it is the fixed, GST-inclusive figure for that exact configuration, and it is the same figure at checkout. Sizes without a published price are quoted in writing against your layout and options; transport is calculated separately from your delivery PIN code either way.",
  },
  {
    question: "Where do you deliver container offices?",
    answer:
      "Across India, with most units going to Bangalore and the wider Karnataka and Tamil Nadu belt around our Hosur-side factory. The cabin arrives factory-finished on a lorry and is craned onto your prepared level base; transport is worked out from your PIN code before you commit.",
  },
  {
    question: "Can I see the exact materials before ordering?",
    answer:
      "Yes — every size page carries the full material break-up: the structural sections, wall and roof build-up, flooring, doors, windows, electrical and finishing, each marked included, optional or customer scope. The written quotation then states the sections and quantities for your exact size and layout, and that document is the binding specification.",
  },
];

export function ContainerOfficeFamilySections({ slug }: { slug: string }) {
  const family = getFamilyBySlug(slug);
  if (!family || family.slug !== "container-office") return null;

  const variants = publishedVariants(family);
  if (variants.length === 0) return null;

  return (
    <div className="mt-16 space-y-14">
      {/* ── Family intro + service area ────────────────────────────────────────────── */}
      <section aria-labelledby="co-family-heading">
        <h2 id="co-family-heading" className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
          Container Office Manufacturer Serving Bangalore, Karnataka &amp; Tamil Nadu
        </h2>
        <div className="max-w-3xl space-y-4 text-muted-foreground leading-relaxed">
          <p>
            Every container office on this page is built at our own factory on the Tamil Nadu side
            of Hosur — about 40 km from Bengaluru — and delivered factory-finished across India,
            with Bangalore, the wider Karnataka belt and Tamil Nadu as our core service area. One
            product family, five standard sizes, one specification: what changes between the pages
            below is the footprint and what it makes possible, not what the cabin is made of.
          </p>
          <p className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <span>
              Factory: Hosur side, Tamil Nadu · Bangalore office: Electronic City · Delivery:
              pan-India, transport calculated from your PIN code.
            </span>
          </p>
        </div>
      </section>

      {/* ── Standard-size cards ────────────────────────────────────────────────────── */}
      <section id="standard-sizes" aria-labelledby="co-sizes-heading" className="scroll-mt-24">
        <h2 id="co-sizes-heading" className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
          Choose Your Container Office Size
        </h2>
        <p className="mb-6 max-w-3xl text-muted-foreground">
          Five standard sizes, each with its own detailed page — layouts that genuinely work at
          that footprint, the full material break-up, and that size&rsquo;s honest limits.
        </p>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {variants.map((variant) => {
            const href = variantPath(family, variant);
            const isParentSize = variant.rendersAtParent === true;
            const content = getContainerOfficeSizeContent(family.slug, variant.sizeSlug);
            return (
              <article
                key={variant.sku}
                className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden"
              >
                {/* No per-size photograph exists yet, so the family image is shown with alt
                    text that says exactly that — never captioned as this specific size. */}
                <OptimizedImage
                  src="/images/products/container-office-front.webp"
                  alt={`Container Office Cabin family — front elevation render. ${variant.sizeLabelPlain} details on its own page.`}
                  aspectRatio="video"
                  objectFit="cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="w-full"
                />
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {variant.sizeLabel} Container Office
                  </h3>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Ruler className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                    {variant.sizeLabelPlain} · {builtUpAreaSqFt(variant)} sq ft
                  </p>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {content?.positioning ?? `${family.groupTitle} — ${family.bestFor.toLowerCase()}.`}
                  </p>
                  <p className="mt-3 font-semibold text-foreground">{priceCell(family, variant)}</p>
                  <Link
                    href={href}
                    className="mt-3 inline-flex items-center gap-1.5 font-semibold text-accent hover:underline"
                  >
                    {isParentSize ? "Shown on this page" : "View complete details"}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── Comparison table ───────────────────────────────────────────────────────── */}
      <section aria-labelledby="co-compare-heading">
        <h2 id="co-compare-heading" className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
          Compare Container Office Sizes
        </h2>
        <p className="mb-5 max-w-3xl text-sm text-muted-foreground">
          Areas are computed from each size&rsquo;s own dimensions. Where a fixed price exists it
          is the same GST-inclusive figure shown at checkout; every other size is quoted in
          writing against your layout.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[44rem] text-sm">
            <caption className="sr-only">
              Container office standard sizes compared by area, recommended use and price
            </caption>
            <thead>
              <tr className="bg-muted/50 text-left">
                <th scope="col" className="px-4 py-3 font-semibold">Size</th>
                <th scope="col" className="px-4 py-3 font-semibold">Floor area</th>
                <th scope="col" className="px-4 py-3 font-semibold">Recommended use</th>
                <th scope="col" className="px-4 py-3 font-semibold">Price</th>
                <th scope="col" className="px-4 py-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => (
                <tr key={variant.sku} className="border-t border-border align-top">
                  <th scope="row" className="whitespace-nowrap px-4 py-3 text-left font-medium text-foreground">
                    {variant.sizeLabelPlain}
                  </th>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {builtUpAreaSqFt(variant)} sq ft
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {recommendedUse(family, variant)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {priceCell(family, variant)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {variant.rendersAtParent ? (
                      <span className="text-muted-foreground">This page</span>
                    ) : (
                      <Link
                        href={variantPath(family, variant)}
                        className="font-semibold text-accent hover:underline"
                      >
                        View {variant.sizeLabelPlain}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Family FAQ — choosing between sizes ────────────────────────────────────── */}
      <section aria-labelledby="co-family-faq-heading">
        <h2 id="co-family-faq-heading" className="font-display text-2xl md:text-3xl font-bold text-foreground mb-5">
          Choosing a Container Office — Common Questions
        </h2>
        <Accordion type="single" collapsible className="w-full max-w-3xl">
          {FAMILY_FAQS.map((faq, index) => (
            <AccordionItem key={faq.question} value={`family-faq-${index}`}>
              <AccordionTrigger className="text-left font-display font-semibold">
                <h3>{faq.question}</h3>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        {/* Legitimate only because every answer renders visibly just above. */}
        <JsonLd data={generateFAQSchema(FAMILY_FAQS)} />
      </section>
    </div>
  );
}
