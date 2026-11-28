import Link from "next/link";
import { CheckCircle, ChevronDown, MessageCircle, Phone } from "lucide-react";

import { COMPANY } from "@/lib/company";
import {
  BUYER_GUIDE_CREDENTIALS,
  getProductBuyerGuide,
  type GuideParagraph,
} from "@/data/productBuyerGuides";

/**
 * PRODUCT BUYER GUIDE — renders the long-form buying help in src/data/productBuyerGuides.ts for the
 * few catalogue products that have no dedicated *Content component. Renders nothing for any other
 * product, so mounting it on every product page is free.
 *
 * Server component. FAQ answers sit inside native <details> elements so they are in the server HTML
 * (a Radix accordion unmounts closed panels), and no FAQPage JSON-LD is emitted: these are Merchant
 * landing pages, and the product's structured data stays exactly as it is.
 */

const h2 = "font-display text-2xl font-bold text-foreground md:text-3xl";
const p = "leading-relaxed text-muted-foreground";
const linkClass = "font-medium text-foreground underline underline-offset-4 hover:text-primary";

function Paragraph({ value }: { value: GuideParagraph }) {
  if (typeof value === "string") return <p className={p}>{value}</p>;
  return (
    <p className={p}>
      {value.before}{" "}
      <Link href={value.link.href} className={linkClass}>
        {value.link.label}
      </Link>
      {value.after}
    </p>
  );
}

export function ProductBuyerGuide({ productId }: { productId: string }) {
  const guide = getProductBuyerGuide(productId);
  if (!guide) return null;

  return (
    <div className="mt-16 space-y-12">
      {guide.sections.map((section) => (
        <section key={section.heading} className="space-y-4">
          <h2 className={h2}>{section.heading}</h2>
          {/* A section with a list renders the list first and its paragraphs (e.g. the warranty
              pointer) after it; a section without a list is just its paragraphs. */}
          {section.bullets && (
            <ul className="space-y-3">
              {section.bullets.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                  <span className={p}>{item}</span>
                </li>
              ))}
            </ul>
          )}
          {section.paragraphs?.map((para, i) => <Paragraph key={i} value={para} />)}
        </section>
      ))}

      <section className="space-y-4">
        <h2 className={h2}>{guide.faqHeading}</h2>
        <div className="divide-y divide-border rounded-xl border bg-card">
          {guide.faqs.map((faq) => (
            <details key={faq.question} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                <span>{faq.question}</span>
                <ChevronDown
                  className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className={`mt-3 ${p}`}>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-accent/30 bg-accent/5 p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">{guide.quote.heading}</h2>
        <p className={`mt-3 ${p}`}>{guide.quote.text}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/contact"
            className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Request a quotation
          </Link>
          <a
            href={COMPANY.whatsapp.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-5 py-2.5 font-semibold text-foreground hover:bg-muted"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            WhatsApp {COMPANY.whatsapp.display}
          </a>
          <a
            href={`tel:${COMPANY.phones[0].e164}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-5 py-2.5 font-semibold text-foreground hover:bg-muted"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            Call {COMPANY.phones[0].display}
          </a>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">{BUYER_GUIDE_CREDENTIALS}</p>
      </section>
    </div>
  );
}
