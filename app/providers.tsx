"use client";

import { Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";

function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
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
