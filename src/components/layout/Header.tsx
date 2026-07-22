"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
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
 * Public site header.
 *
 * ── HOW THE STICKY BEHAVIOUR WORKS (and why there is no layout shift) ────────────
 * The whole header is `sticky` with a NEGATIVE top offset equal to the TopBar's
 * height (-top-9 / -2.25rem, matching TopBar's h-9). While the page is at the top
 * the header sits in normal flow and both bars are visible. As the user scrolls, the
 * header pins with its first 36px above the viewport — so the information bar slides
 * away and the main navigation parks flush against the top edge.
 *
 * That gives the "shorter header once scrolled" effect with ZERO JavaScript and zero
 * layout shift: no element's height ever animates, so nothing below the header can
 * be pushed around. The only thing scroll position drives is the border/shadow
 * treatment below, which is paint-only and cannot affect layout.
 *
 * If you change TopBar's height, change this offset in the same commit.
 *
 * ── CLIENT COMPONENT ────────────────────────────────────────────────────────────
 * This has to stay a Client Component: it reads auth and cart state, and owns the
 * mega menu, search and drawer interactions. Layout.tsx keeps it as an isolated
 * client island so the Footer and page content still render on the server.
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
      {/* Keyboard users land here first — lets them skip the whole nav. Visible only
          while focused. Targets the #main-content landmark set in Layout.tsx.
          `fixed`, NOT `absolute`: the header is a positioned ancestor pinned at
          -top-9, so an absolutely-positioned skip link would resolve against that
          offset and sit half-clipped above the viewport once the page is scrolled. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-foreground"
      >
        Skip to main content
      </a>

      <TopBar />

      {/* Solid background, no backdrop-blur: at 95%+ opacity a blur pass is visually
          imperceptible but still costs a full-width compositor gaussian on every
          scrolled frame. The previous header paid that for no gain. */}
      <div
        className={cn(
          "border-b bg-background",
          "transition-shadow duration-200 motion-reduce:transition-none",
          scrolled
            ? "border-border/70 shadow-[0_10px_30px_-12px_hsl(var(--background)/0.9)]"
            : "border-border/40 shadow-none",
        )}
      >
        <div className="container-custom">
          {/* `relative` is load-bearing: the mega menu and search panels anchor to
              THIS row, not to their own triggers, so they can never be pushed past a
              viewport edge by where their button happens to sit. */}
          <div className="relative flex h-16 items-center justify-between gap-3 xl:h-[4.5rem]">
            {/* ---------- Brand ---------- */}
            {/* No `shrink-0` here: the brand must be the thing that gives way when
                the bar is tight, otherwise the shortfall lands on the icon buttons
                and squashes them below their 44px touch target. `min-w-0` + the
                `truncate` on the wordmark below only work if this can shrink. */}
            <Link
              href="/"
              className={cn(
                "flex min-w-0 items-center gap-2.5 rounded-lg",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
            >
              {/* loading="lazy" is deliberate and load-bearing: the logo is header
                  chrome, NOT the LCP element. Without it, an eagerly-fetched SSR'd
                  <img> gets a <link rel=preload as=image> emitted as the FIRST head
                  hint, so on slow 4G the logo competes with the hero background for
                  the critical connection during the exact LCP window. Explicit
                  width/height (the asset is a 400x400 square) reserve the box so
                  lazy-loading it cannot shift the header. */}
              <img
                src={resolveImageUrl(logo)}
                alt="Portable Office Cabin"
                width={400}
                height={400}
                loading="lazy"
                decoding="async"
                className="h-10 w-10 shrink-0 rounded-lg border border-accent/20 bg-card object-contain p-1 shadow-sm xl:h-11 xl:w-11"
              />
              <span className="hidden min-w-0 flex-col leading-none md:flex">
                <span className="truncate font-display text-base font-extrabold tracking-tight text-foreground xl:text-lg">
                  Portable Office <span className="text-accent">Cabin</span>
                </span>
                <span className="mt-1 truncate text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Prefab &amp; Modular Manufacturer
                </span>
              </span>
            </Link>

            {/* ---------- Desktop navigation ---------- */}
            <DesktopNavigation />

            {/* ---------- Desktop actions ---------- */}
            <HeaderActions />

            {/* ---------- Mobile / tablet actions ----------
                The desktop bar switches in at xl (1280px), not lg. At 1024px the
                brand + 7 nav labels + 5 action controls need ~1130px of unshrinkable
                content in a 960px container, which overflowed the page and crushed
                the icon buttons below 44px. Tablet gets the drawer instead. */}
            <div className="flex shrink-0 items-center gap-2 xl:hidden">
              <HeaderSearch />
              <CartButton itemCount={itemCount} />
              <Button
                variant="accent"
                size="sm"
                className="hidden h-11 px-4 text-navy-deep sm:inline-flex"
                asChild
              >
                <Link href="/contact">Quote</Link>
              </Button>
              <MobileNavigation />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
