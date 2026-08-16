// SERVER COMPONENT shell — no "use client" here. The heading, intro copy and CTA band render
// entirely in the initial HTML; the card grid inside is a single small client island
// (IndustriesGrid) because the cards open an image POP-UP instead of navigating — the owner's
// direction is explicitly "no page links on the cards, a pop-up with images". The island's own
// card markup (names, descriptions, chips) is still server-rendered on first paint, so the
// section's SEO content remains in the raw HTML either way.
//
// The photographs are REAL project/product shots from the existing asset library (no stock,
// no AI). Copy rules (site-wide): no unbacked figures — no project counts or years.
import { Button } from "@/components/ui/button";
import { WhatsAppGlyph } from "@/components/WhatsAppGlyph";
import { primaryPhone, whatsappUrl } from "@/lib/site-navigation";

import { IndustriesGrid } from "./IndustriesGrid";

export function IndustriesSection() {
  return (
    <section className="section-padding bg-background cv-section" aria-labelledby="industries-heading">
      <div className="container-custom">
        {/* Header */}
        <div className="reveal mb-12">
          <span className="inline-block text-accent font-semibold text-sm uppercase tracking-wider mb-3">
            INDUSTRIES WE SERVE
          </span>
          <h2 id="industries-heading" className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Built for Every Industry
          </h2>
          <p className="text-muted-foreground max-w-2xl">
            Reliable portable cabins and prefabricated structures engineered for commercial,
            industrial and infrastructure projects across India — tap any industry to see
            real installations.
          </p>
        </div>

        {/* Industry cards + image pop-up (client island) */}
        <IndustriesGrid />

        {/* CTA band */}
        <div className="mt-12 flex flex-col items-center justify-between gap-6 rounded-2xl border border-border/50 bg-navy-deep p-6 sm:p-8 lg:flex-row">
          <div>
            <h3 className="font-display text-xl font-bold text-white sm:text-2xl">
              Don&apos;t see your industry?
            </h3>
            <p className="mt-1 text-sm text-white/70">
              Every cabin is built to order — tell us the site, the headcount and the timeline,
              and we&apos;ll spec the right structure for it.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <WhatsAppGlyph className="mr-2 h-4 w-4" />
                WhatsApp
              </a>
            </Button>
            <a
              href={`tel:${primaryPhone.e164}`}
              className="text-sm font-semibold text-white/80 underline-offset-4 transition-colors hover:text-accent hover:underline"
            >
              {primaryPhone.display}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
