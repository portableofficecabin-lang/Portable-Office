"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";

function ScrollToTop() {
  const pathname = usePathname();
  // Skip the initial mount: scrolling on first load is a no-op (the page already
  // loads at the top) but the synchronous window.scrollTo forces a layout reflow
  // during hydration (PSI "Forced reflow"). Only reset scroll on real route changes.
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" forcedTheme="dark" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <ScrollToTop />
            <Toaster />
            <Sonner />
            {/* NO <Suspense> around {children}.
                A `<Suspense fallback={null}>` used to wrap every page here. It arrived in the
                repository's root commit as leftover scaffolding from the Vite/react-router →
                App Router migration: nothing depended on it. The only useSearchParams() caller
                in the codebase (src/views/Products.tsx) carries its own local boundaries, which
                are load-bearing and must stay.

                Its effect was severe and site-wide. Every route is an async server component,
                so the boundary was always still pending when React flushed the shell — which
                made React stream each page's ENTIRE body out of order into
                `<div hidden id="S:0">` and relocate it with an inline script on hydration.
                In 229 of 230 prerendered pages the <h1>, every <h2>, both JSON-LD blocks and
                every anchor sat inside that hidden buffer, so any client that does not execute
                JavaScript saw an empty document. (`_not-found.html` was the lone exception, and
                it is what proves Next adds no boundary of its own here.)

                Head-level tags were never affected — title, description, canonical and OG sit
                above the buffer — so this was not a de-indexing event. But it is why SEO
                auditors reported "missing H1" across the catalogue. */}
            {children}
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
