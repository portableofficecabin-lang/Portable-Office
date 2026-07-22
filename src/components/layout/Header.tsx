"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";

import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import logo from "@/assets/logo.webp";

import { CartButton } from "./header/HeaderActions";
import { DesktopNavigation } from "./header/DesktopNavigation";
import { HeaderActions } from "./header/HeaderActions";
import { HeaderSearch } from "./header/HeaderSearch";
import { MobileNavigation } from "./header/MobileNavigation";
import { TopBar } from "./header/TopBar";

/**
 * Public site header — three stacked rows:
 *
 *   1. TopBar     dark navy, h-9                  — trust statements (call/WhatsApp on mobile)
 *   2. Brand bar  white, h-16 / lg:h-[4.5rem]     — logo + search/account/cart + CTAs
 *   3. Nav row    white, h-12                     — the primary links, lg and up
 *
 * ── WHY THE NAV GETS ITS OWN ROW ────────────────────────────────────────────────
 * Previously the links sat inline between the logo and the action buttons, and the
 * three groups fought over the same horizontal space: nine unbreakable labels plus
 * the brand plus five controls needed ~1130px of unshrinkable width, so the desktop
 * layout could not appear below 1280px. Giving the nav a full-width row of its own
 * removes that competition — it now has the whole container, and the desktop header
 * starts at lg (1024px).
 *
 * ── STICKY BEHAVIOUR (no layout shift, no JS) ───────────────────────────────────
 * The header is `sticky` with a NEGATIVE top offset equal to the TopBar's height
 * (-top-9 / -2.25rem, matching TopBar's h-9). At rest all three rows show. On scroll
 * the header pins with its first 36px above the viewport, so the trust bar slides
 * away and the white brand bar + nav row park flush against the top edge.
 *
 * No element's height is ever animated, so nothing below can be pushed around. Only
 * the shadow responds to scroll, and that is paint-only.
 * If you change TopBar's height, change this offset in the same commit.
 *
 * ── CLIENT COMPONENT ────────────────────────────────────────────────────────────
 * Must stay a Client Component: it reads auth and cart state and owns the mega menu,
 * search and drawer interactions. Layout.tsx keeps it an isolated client island so
 * the Footer and page content still render on the server.
 */
export function Header() {
  const { itemCount } = useCart();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 8);
    };

    const onScroll = () => {
      // rAF-coalesced so a fast scroll cannot queue a setState per scroll event.
      if (!frame) frame = requestAnimationFrame(update);
    };

    // Run once on mount: a reload part-way down the page should start in the
    // scrolled treatment rather than waiting for the first scroll event.
    update();

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header className="sticky -top-9 z-50 w-full">
      {/* Keyboard users land here first. `fixed`, NOT `absolute`: the header is a
          positioned ancestor pinned at -top-9, so an absolutely-positioned skip link
          would resolve against that offset and sit half-clipped once scrolled. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-foreground"
      >
        Skip to main content
      </a>

      <TopBar />

      <div
        className={cn(
          "bg-white",
          "transition-shadow duration-200 motion-reduce:transition-none",
          scrolled ? "shadow-[0_6px_20px_-8px_rgba(10,25,47,0.28)]" : "shadow-none",
        )}
      >
        {/* ---------- Row 2: brand + actions ---------- */}
        <div className="container-custom">
          {/* `relative` anchors the search panel to this row rather than to its 44px
              button, which would push the panel off the left edge on mobile. */}
          <div className="relative flex h-16 items-center justify-between gap-3 lg:h-[4.5rem]">
            {/* No `shrink-0` on the brand: it must be what gives way when the bar is
                tight, or the shortfall lands on the icon buttons and squashes them
                below their 44px touch target. */}
            <Link
              href="/"
              className={cn(
                "flex min-w-0 items-center gap-3 rounded-lg",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white",
              )}
            >
              {/* loading="lazy" is deliberate and load-bearing: the logo is header
                  chrome, NOT the LCP element. Without it an eagerly-fetched SSR'd
                  <img> gets a <link rel=preload as=image> emitted as the first head
                  hint, so on slow 4G it competes with the hero background during the
                  exact LCP window. Explicit width/height (the asset is 400x400)
                  reserve the box so lazy-loading cannot shift the header. */}
              <img
                src={resolveImageUrl(logo)}
                alt="Portable Office Cabin"
                width={400}
                height={400}
                loading="lazy"
                decoding="async"
                className="h-11 w-11 shrink-0 rounded-lg object-contain lg:h-12 lg:w-12"
              />
              <span className="flex min-w-0 flex-col leading-none">
                <span className="truncate font-display text-base font-extrabold tracking-tight text-navy-deep sm:text-lg">
                  Portable Office <span className="text-accent">Cabin</span>
                </span>
                <span className="mt-1 hidden truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-deep/55 sm:block">
                  Prefab &amp; Modular Manufacturer
                </span>
              </span>
            </Link>

            {/* Desktop: search, account, cart, then Call / WhatsApp / Get Quote */}
            <HeaderActions />

            {/* Mobile / tablet */}
            <div className="flex shrink-0 items-center gap-1 lg:hidden">
              <HeaderSearch />
              <CartButton itemCount={itemCount} />
              <Link
                href="/contact"
                className={cn(
                  "hidden h-11 items-center gap-1.5 rounded-lg bg-[hsl(22_90%_38%)] px-3.5 text-sm font-semibold text-white sm:inline-flex",
                  "transition-colors duration-200 hover:bg-[hsl(22_90%_32%)] motion-reduce:transition-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(22_90%_38%)] focus-visible:ring-offset-2",
                )}
              >
                <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                Quote
              </Link>
              <MobileNavigation />
            </div>
          </div>
        </div>

        {/* ---------- Row 3: primary navigation (lg and up) ---------- */}
        <div className="hidden border-t border-navy-deep/10 lg:block">
          <div className="container-custom">
            {/* `relative` anchors the mega menu panel to this row, so it spans the
                container width and can never run off a viewport edge. */}
            <div className="relative">
              <DesktopNavigation />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
