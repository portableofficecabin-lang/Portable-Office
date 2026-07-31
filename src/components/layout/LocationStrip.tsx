import { MapPin } from "lucide-react";

import { locationStripText } from "@/lib/site-navigation";

/**
 * Slim geo/SEO strip directly under the header — "Bangalore Manufacturer • Serving
 * Karnataka & Tamil Nadu" on every page that uses Layout.
 *
 * SERVER COMPONENT, deliberately: mounted from the server-rendered Layout (NOT inside the
 * Header client island), so the line is present in the initial HTML document of every route
 * for crawlers — no hydration, no JS cost. That is the entire point of the strip: a
 * site-wide, server-side location signal, visible to users and bots alike.
 *
 * Placed BELOW the sticky header rather than inside it, on purpose:
 *   • the header's sticky math is load-bearing (TopBar h-9 ↔ header -top-9) — adding a row
 *     inside would change that offset contract;
 *   • an SEO ribbon does not need to stay pinned; it shows at the top of every page and
 *     scrolls away with the content.
 *
 * One line from tablet width up; on narrow phones the ~73-char line wraps to a second line.
 * Wrapping is deliberately allowed (no whitespace-nowrap anywhere) so the strip can never
 * cause horizontal overflow at any viewport.
 */
export function LocationStrip() {
  return (
    <div className="border-b border-navy-deep/10 bg-navy-deep/[0.03]">
      <div className="container-custom">
        <p className="flex items-center justify-center gap-1.5 py-1.5 text-center text-[11px] font-medium tracking-wide text-navy-deep/70 sm:text-xs">
          <MapPin className="h-3 w-3 shrink-0 text-accent" aria-hidden="true" />
          {locationStripText}
        </p>
      </div>
    </div>
  );
}
