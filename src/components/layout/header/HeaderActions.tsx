"use client";

import Link from "next/link";
import { FileText, LogIn, Phone, ShoppingCart, User } from "lucide-react";

import { WhatsAppGlyph } from "@/components/WhatsAppGlyph";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import { primaryPhone, whatsappUrl } from "@/lib/site-navigation";

import { HeaderSearch } from "./HeaderSearch";

/**
 * Action cluster on the white brand bar: search, account, cart, then the three
 * contact CTAs — Call, WhatsApp, Get Quote.
 *
 * COLOUR CHOICES ARE CONTRAST-DRIVEN, not arbitrary. The obvious treatments both
 * fail WCAG 1.4.3 on 14px button text:
 *   - white on WhatsApp brand green (#25D366)    = 2.0:1
 *   - white on the site's amber hsl(32 95% 52%)  = 2.4:1
 * Both are far under the 4.5:1 floor. The fills below are deepened just enough to
 * clear it while still reading as "WhatsApp green" and "brand orange":
 *   - #0B7A43            + white = 5.4:1
 *   - hsl(22 90% 38%)    + white = 5.4:1
 * Do not swap these back to the bright shades without re-checking contrast.
 *
 * HYDRATION: `user` and `itemCount` both start empty (AuthContext resolves the
 * session in an effect; CartContext starts with an empty array), so the server HTML
 * and the first client render agree.
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
      {itemCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold leading-none text-accent-foreground shadow-sm"
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </Link>
  );
}

export function HeaderActions() {
  const { user } = useAuth();
  const { itemCount } = useCart();

  return (
    <div className="hidden shrink-0 items-center gap-1.5 lg:flex">
      <HeaderSearch />

      <Link href={user ? "/my-account" : "/login"} title={user ? "My Account" : "Login"} className={iconButtonClass}>
        {user ? (
          <User className="h-[19px] w-[19px]" aria-hidden="true" />
        ) : (
          <LogIn className="h-[19px] w-[19px]" aria-hidden="true" />
        )}
        <span className="sr-only">{user ? "My Account" : "Login"}</span>
        {user && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent ring-2 ring-white"
          />
        )}
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

        <Link
          href="/contact"
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-lg bg-[hsl(22_90%_38%)] px-4 text-sm font-semibold text-white shadow-sm",
            "transition-colors duration-200 motion-reduce:transition-none",
            "hover:bg-[hsl(22_90%_32%)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(22_90%_38%)] focus-visible:ring-offset-2",
          )}
        >
          <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
          Get Quote
        </Link>
      </div>
    </div>
  );
}
