import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WhatsAppGlyph } from "@/components/WhatsAppGlyph";
import { COMPANY } from "@/lib/company";
import { primaryPhone, whatsappUrl } from "@/lib/site-navigation";

/**
 * Conversion band that sits between the page content and the footer proper.
 *
 * It is deliberately the site's amber brand colour while the footer below is deep
 * navy — that contrast is what stops it reading as "just more footer" and keeps the
 * enquiry ask visually distinct.
 *
 * COLOUR NOTE: `--primary` in this theme is amber, not navy (see src/index.css). So
 * text on this band must be explicitly dark (`text-navy-deep`), which measures ~6.9:1
 * against the amber — comfortably past AA for body text. Do not swap in
 * `text-primary-foreground` here without re-checking it.
 *
 * Every destination is an existing route: /contact is the enquiry form, and the phone
 * and WhatsApp links use the verified numbers from src/lib/company.ts.
 */
export function PreFooterCTA() {
  return (
    <section
      aria-labelledby="prefooter-cta-heading"
      className="bg-gradient-to-r from-amber via-amber to-amber-light"
    >
      <div className="container-custom py-10 md:py-12">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div className="max-w-2xl">
            <h2
              id="prefooter-cta-heading"
              className="font-display text-2xl font-extrabold leading-tight tracking-tight text-navy-deep sm:text-3xl"
            >
              Planning a Portable Cabin or Prefab Project?
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-navy-deep/85 sm:text-base">
              Send us your site requirement — size, layout and location — and our team will come
              back with sizing, specification and a written quotation. Replies {""}
              {COMPANY.responseTime.toLowerCase()}.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:shrink-0">
            <Button
              asChild
              size="lg"
              className="h-12 bg-navy-deep px-6 text-white shadow-lg hover:-translate-y-0.5 hover:bg-navy-medium focus-visible:ring-navy-deep motion-reduce:hover:translate-y-0"
            >
              <Link href="/contact">
                Request a Quote
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              className="h-12 border-2 border-navy-deep/35 bg-white/25 px-6 text-navy-deep hover:bg-white/45 focus-visible:ring-navy-deep"
            >
              <a href={`tel:${primaryPhone.e164}`}>
                <Phone className="h-4 w-4" aria-hidden="true" />
                {primaryPhone.display}
              </a>
            </Button>

            <Button
              asChild
              size="lg"
              className="h-12 border-2 border-navy-deep/35 bg-white/25 px-6 text-navy-deep hover:bg-white/45 focus-visible:ring-navy-deep"
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <WhatsAppGlyph className="h-4 w-4" />
                WhatsApp Us
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
