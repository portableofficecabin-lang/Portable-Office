import {
  footerCompanyLinks,
  footerPolicyLinks,
  footerProductLinks,
  footerProductsViewAll,
  footerSupportLinks,
} from "@/lib/site-navigation";

import { FooterBottomBar } from "./footer/FooterBottomBar";
import { FooterCompanyInfo } from "./footer/FooterCompanyInfo";
import { FooterContact } from "./footer/FooterContact";
import { FooterLinks } from "./footer/FooterLinks";
import { PreFooterCTA } from "./footer/PreFooterCTA";

/**
 * Public site footer.
 *
 * ── SERVER COMPONENT — KEEP IT THAT WAY ─────────────────────────────────────────
 * There is deliberately no "use client" here or in any child. Layout.tsx documents
 * the footer as static chrome that renders on the server with no hydration cost, and
 * the Google Merchant Center policy links must stay reachable and crawlable with no
 * JavaScript. Adding state, an onClick or a collapsible section anywhere in this
 * subtree would pull the entire footer into the client bundle on every public page
 * and put those policy links behind JS. Don't.
 *
 * ── COLOUR ──────────────────────────────────────────────────────────────────────
 * The body is `bg-navy-deep`, NOT `bg-primary`. In this theme `--primary` is amber
 * (src/index.css), which is why the previous footer rendered as an amber slab with
 * black headings. Deep navy reads as the industrial/premium surface the brand wants,
 * puts the amber back where it belongs (accents and the CTA band above), and gives
 * white text a ~14:1 contrast ratio.
 *
 * ── LINK INVENTORY ──────────────────────────────────────────────────────────────
 * Every link the old footer carried is still here — the six product categories, the
 * five company links, the four support links and all five Merchant Center policies —
 * plus additions (all 15 categories rather than six, rental, promotions, appointments
 * and the full policy set). Nothing was dropped.
 *
 * Deliberately NOT added: /my-account. It is robots-disallowed and noindex,nofollow,
 * so a sitewide footer link would spend crawl budget on a page we ask not to be
 * indexed; the account control lives in the header instead.
 *
 * Links live in src/lib/site-navigation.ts and every href is verified against a real
 * route.
 */
export function Footer() {
  return (
    <>
      <PreFooterCTA />

      <footer aria-labelledby="footer-heading" className="bg-navy-deep text-white">
        <h2 id="footer-heading" className="sr-only">
          Site footer
        </h2>

        <div className="container-custom py-14 md:py-16">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-10">
            {/* Full width at sm so the four link columns pair up cleanly two-by-two
                below it; without this the last column is orphaned beside a blank. */}
            <div className="sm:col-span-2 lg:col-span-4">
              <FooterCompanyInfo />
            </div>

            <div className="lg:col-span-2">
              <FooterLinks
                title="Products"
                items={[...footerProductLinks, footerProductsViewAll]}
              />
            </div>

            <div className="lg:col-span-2">
              <FooterLinks title="Company" items={footerCompanyLinks} />
            </div>

            <div className="lg:col-span-2">
              <FooterLinks title="Support" items={footerSupportLinks} />
            </div>

            <div className="lg:col-span-2">
              <FooterLinks title="Policies" items={footerPolicyLinks} />
            </div>

            {/* Contact spans the full width on small screens and drops onto its own
                row on desktop, so the long factory addresses never squeeze into a
                narrow column. */}
            <div className="sm:col-span-2 lg:col-span-12">
              <div className="border-t border-white/10 pt-10 lg:pt-8">
                <FooterContact />
              </div>
            </div>
          </div>
        </div>

        <FooterBottomBar />
      </footer>
    </>
  );
}
