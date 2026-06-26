"use client";

import { Suspense, useEffect, useRef } from "react";
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
            <Suspense fallback={null}>{children}</Suspense>
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
