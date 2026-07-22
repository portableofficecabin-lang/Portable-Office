"use client";

import Link from "next/link";
import { LogIn, ShoppingCart, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WhatsAppGlyph } from "@/components/WhatsAppGlyph";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import { whatsappUrl } from "@/lib/site-navigation";

import { HeaderSearch } from "./HeaderSearch";

/**
 * Desktop action cluster: search, WhatsApp, account, cart, and the one primary CTA.
 *
 * Only "Get a Quote" is a filled button. Everything else is a quiet outlined icon
 * control, so there is a single obvious next step rather than five buttons competing
 * for the same click.
 *
 * HYDRATION: `user` and `itemCount` both start empty (AuthContext resolves the
 * session in an effect; CartContext starts with an empty items array), so the server
 * HTML and the first client render agree. The signed-in and cart-count states appear
 * on the subsequent render — same behaviour the header has always had.
 *
 * The controls are all 44px tall to satisfy the minimum touch-target guidance, and
 * every icon-only control carries an aria-label because it has no text node.
 */

const iconButtonClass = cn(
  "relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-card/60 text-foreground",
  "transition-colors duration-200 motion-reduce:transition-none",
  "hover:border-accent/40 hover:text-accent",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
);

/** Shared cart icon + count badge, used by both the desktop and mobile clusters. */
export function CartButton({ itemCount }: { itemCount: number }) {
  return (
    <Link href="/cart" title="Cart" className={iconButtonClass}>
      <ShoppingCart className="h-[18px] w-[18px]" aria-hidden="true" />
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
    <div className="hidden shrink-0 items-center gap-2 xl:flex">
      <HeaderSearch />

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Chat with us on WhatsApp"
        className={cn(iconButtonClass, "hover:border-[#25D366]/50 hover:text-[#25D366]")}
      >
        <WhatsAppGlyph className="h-[18px] w-[18px]" />
        <span className="sr-only">Chat with us on WhatsApp</span>
      </a>

      <Link href={user ? "/my-account" : "/login"} title={user ? "My Account" : "Login"} className={iconButtonClass}>
        {user ? (
          <User className="h-[18px] w-[18px]" aria-hidden="true" />
        ) : (
          <LogIn className="h-[18px] w-[18px]" aria-hidden="true" />
        )}
        {/* A real text node rather than aria-label. Two reasons: it names the link
            for assistive tech exactly the same way, AND the global click tracker
            (src/hooks/useAnalyticsTracking.ts) reads element.textContent and drops
            any element whose text is empty — an aria-label-only icon link would
            silently stop being tracked. */}
        <span className="sr-only">{user ? "My Account" : "Login"}</span>
        {user && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-background"
          />
        )}
      </Link>

      <CartButton itemCount={itemCount} />

      {/* text-navy-deep, not the variant's default white: the accent variant is an
          amber gradient, and white on it measures 2.39:1 (amber) to 1.84:1
          (amber-light) — below even the 3:1 large-text floor. Dark navy on the same
          gradient is 6.5:1-8.8:1. Overridden here rather than in the shared variant
          so no other surface changes appearance. */}
      <Button variant="accent" size="sm" className="ml-1 h-11 px-5 text-navy-deep" asChild>
        <Link href="/contact">Get a Quote</Link>
      </Button>
    </div>
  );
}
