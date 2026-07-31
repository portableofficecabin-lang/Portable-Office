import { Mail, MapPin } from "lucide-react";

import { COMPANY } from "@/lib/company";
import { locationStripText } from "@/lib/site-navigation";

/**
 * Slim geo/SEO strip at the VERY TOP of the page — above the navy trust bar, so
 * "Portable Cabin Manufacturer in Bangalore • Serving Karnataka & Tamil Nadu" is the first
 * visible line of every page that uses Layout.
 *
 * SERVER COMPONENT, deliberately: mounted from the server-rendered Layout (NOT inside the
 * Header client island), so the line is present in the initial HTML document of every route
 * for crawlers — no hydration, no JS cost. That is the entire point of the strip: a
 * site-wide, server-side location signal, visible to users and bots alike.
 *
 * Placed ABOVE the sticky header, outside it, on purpose:
 *   • the header's sticky math is load-bearing (TopBar h-9 ↔ header -top-9) — adding a row
 *     inside would change that offset contract. In normal flow above the header, the strip
 *     scrolls away first and the header then pins exactly as before;
 *   • an SEO ribbon does not need to stay pinned; it shows at the top of every page and
 *     scrolls away with the content.
 *
 * Styling matches the navy trust bar directly below it (same bg-navy-deep), separated by a
 * white/10 hairline, so the two read as one dark masthead with the geo line on top.
 *
 * The sales email lives on the RIGHT of this strip (it moved up from the trust bar, which
 * the three verified badges now fill). It appears from lg (1024px): at that width the
 * centred ~460px geo line leaves ~280px clear each side, enough for the ~210px address.
 *
 * LAYOUT IS A BALANCED `1fr auto 1fr` GRID, not an overlay: the geo line sits in the auto
 * middle column and the email is end-aligned in the last. Because the two flexible columns
 * are equal, the line stays centred relative to the full viewport — the email cannot push
 * it left — and because grid columns never overlap, a collision is structurally impossible
 * (under extreme pressure the centre would shift, never overprint). Below lg the email is
 * display:none, the outer columns are both empty and equal, and centring is unchanged.
 *
 * One line from tablet width up; on narrow phones the ~73-char geo line wraps to a second
 * line inside its column (the email is hidden there anyway). Wrapping is deliberately
 * allowed (no whitespace-nowrap on the geo text) so the strip can never cause horizontal
 * overflow.
 */
export function LocationStrip() {
  return (
    <div className="border-b border-white/10 bg-navy-deep">
      <div className="container-custom">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <p className="col-start-2 flex items-center justify-center gap-1.5 py-1.5 text-center text-[11px] font-medium tracking-wide text-white/80 sm:text-xs">
            <MapPin className="h-3 w-3 shrink-0 text-accent" aria-hidden="true" />
            {locationStripText}
          </p>
          {/* Accessible name is the visible address itself — the icon is aria-hidden. */}
          <a
            href={`mailto:${COMPANY.email.sales}`}
            className="col-start-3 hidden items-center gap-1.5 justify-self-end whitespace-nowrap text-[11px] font-medium text-white/70 transition-colors hover:text-accent sm:text-xs lg:inline-flex"
          >
            <Mail className="h-3 w-3 shrink-0 text-accent" aria-hidden="true" />
            {COMPANY.email.sales}
          </a>
        </div>
      </div>
    </div>
  );
}
