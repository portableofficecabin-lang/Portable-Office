"use client";

import Link from "next/link";
import { LogIn, Phone, ShoppingCart, User } from "lucide-react";

import { WhatsAppGlyph } from "@/components/WhatsAppGlyph";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import { primaryPhone, whatsappUrl } from "@/lib/site-navigation";

import { HeaderSearch } from "./HeaderSearch";

/**
 * Action cluster on the white brand bar: search, account, cart, then the two
 * contact CTAs — Call, WhatsApp.
 *
 * COLOUR CHOICE IS CONTRAST-DRIVEN, not arbitrary. The obvious treatment fails
 * WCAG 1.4.3 on 14px button text: white on WhatsApp brand green (#25D366) is
 * 2.0:1, far under the 4.5:1 floor. The fill below is deepened just enough to
 * clear it while still reading as "WhatsApp green": #0B7A43 + white = 5.4:1.
 * Do not swap it back to the bright shade without re-checking contrast.
 *
 * HYDRATION: `user` and `itemCount` both start empty (AuthContext resolves the
 * session in an effect; CartContext starts with an empty array), so the server HTML
 * and the first client render agree.
 *
 * NOTHING STATE-DEPENDENT IS CONDITIONALLY MOUNTED. The cart badge, the signed-in dot
 * and both account icons are always in the markup and are shown or hidden with a class.
 * The state they display genuinely cannot be server-rendered — the cart lives in the
 * visitor's localStorage and the session resolves client-side, while these pages are
 * statically prerendered and served from a shared CDN cache — but the ELEMENTS can be,
 * and are. Mounting them after hydration instead would have JavaScript insert
 * above-the-fold DOM that never appeared in the initial HTML, which shifts layout and
 * shows up as client-rendered content to crawlers and page analysers.
 *
 * Keep it that way: if you add another state-dependent affordance here, render it hidden
 * rather than wrapping it in `{state && ...}`.
 */

/** Quiet icon control on the white bar. 44px, meeting the touch-target floor. */
const iconButtonClass = cn(
  "relative inline-flex h-11 w-11 items-center justify-center rounded-lg text-navy-deep",
  "transition-colors duration-200 motion-reduce:transition-none",
  "hover:bg-navy-deep/[0.06]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white",
);

/** Shared cart control, used by both the desktop cluster and the mobile bar. */
export function CartButton({ itemCount }: { itemCount: number }) {
  return (
    <Link href="/cart" title="Cart" className={iconButtonClass}>
      <ShoppingCart className="h-[19px] w-[19px]" aria-hidden="true" />
      {/* Real text, not aria-label: the global click tracker
          (src/hooks/useAnalyticsTracking.ts) drops elements with empty textContent,
          so an aria-label-only icon link would stop being tracked. */}
      <span className="sr-only">
        {itemCount > 0 ? `Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}` : "Cart"}
      </span>
      {/* ALWAYS RENDERED, hidden when the cart is empty — never conditionally mounted.
          The count itself cannot be server-rendered: it lives in the visitor's own
          localStorage and this page is statically prerendered and CDN-cached, so baking a
          number into the HTML would show one shopper's cart to everyone. What CAN be
          server-rendered is the NODE. Mounting it only after hydration meant the badge was
          inserted into the DOM by JavaScript — an above-the-fold element absent from the
          initial HTML, and a layout shift on every page load with a non-empty cart.
          Rendering it hidden and toggling `flex`/`hidden` keeps the element in the server
          HTML and leaves JS with nothing to insert.
          `flex` and `hidden` are swapped rather than combined: both are Tailwind display
          utilities in the same layer, so listing both would leave the winner up to
          stylesheet order. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute -right-0.5 -top-0.5 h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold leading-none text-accent-foreground shadow-sm",
          itemCount > 0 ? "flex" : "hidden",
        )}
      >
        {itemCount > 99 ? "99+" : itemCount > 0 ? itemCount : ""}
      </span>
    </Link>
  );
}

export function HeaderActions() {
  const { user } = useAuth();
  const { itemCount } = useCart();

  return (
    <div className="hidden shrink-0 items-center gap-1.5 lg:flex">
      <HeaderSearch />

      {/* Both icons and the signed-in dot are rendered on the server and toggled with CSS,
          for the same reason as the cart badge: the session resolves in an effect, so
          swapping the icon or mounting the dot afterwards makes JavaScript create
          above-the-fold DOM that was never in the initial HTML. Toggling visibility leaves
          the markup identical before and after hydration; only classes, `href` and the
          screen-reader label change. */}
      <Link href={user ? "/my-account" : "/login"} title={user ? "My Account" : "Login"} className={iconButtonClass}>
        <LogIn className={cn("h-[19px] w-[19px]", user && "hidden")} aria-hidden="true" />
        <User className={cn("h-[19px] w-[19px]", !user && "hidden")} aria-hidden="true" />
        <span className="sr-only">{user ? "My Account" : "Login"}</span>
        <span
          aria-hidden="true"
          className={cn(
            "absolute right-1 top-1 h-2 w-2 rounded-full bg-accent ring-2 ring-white",
            !user && "hidden",
          )}
        />
      </Link>

      <CartButton itemCount={itemCount} />

      <div className="ml-1.5 flex items-center gap-2">
        {/* Call is outlined so it sits behind the two filled CTAs in the hierarchy. */}
        <a
          href={`tel:${primaryPhone.e164}`}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-lg border border-navy-deep/20 bg-white px-4 text-sm font-semibold text-navy-deep",
            "transition-colors duration-200 motion-reduce:transition-none",
            "hover:border-navy-deep/35 hover:bg-navy-deep/[0.04]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
          )}
        >
          <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
          Call
        </a>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-lg bg-[#0B7A43] px-4 text-sm font-semibold text-white",
            "transition-colors duration-200 motion-reduce:transition-none",
            "hover:bg-[#096436]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B7A43] focus-visible:ring-offset-2",
          )}
        >
          <WhatsAppGlyph className="h-4 w-4 shrink-0" />
          WhatsApp
        </a>
      </div>
    </div>
  );
}
