"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

// The calculator is a heavy interactive client island. It is loaded as its own
// deferred chunk (ssr:false → kept out of the initial HTML & RSC payload) and is
// HIDDEN by default — it mounts ONLY when the customer explicitly opens it (the hero
// "Estimated Price" button, which targets #cabin-calculator, or the "Start Customizing"
// button below). There is deliberately NO scroll-based auto-open, so it never competes
// with the hero LCP and never appears on its own. The banner above it is server-rendered.
const CabinCalculator = dynamic(() => import("./CabinCalculator"), {
  ssr: false,
  // The loading fallback reserves the SAME height as the placeholder/mounted calculator
  // so the box never collapses (520px) while the ssr:false chunk streams in on slow 4G.
  loading: () => (
    <div
      className="flex items-center justify-center rounded-2xl border border-border bg-card"
      style={{ minHeight: 520 }}
    >
      <Loader2 className="h-6 w-6 animate-spin text-accent" />
    </div>
  ),
});

const CALC_HASH = "#cabin-calculator";

export function CabinCalculatorLoader() {
  // Hidden by default; opens ONLY on an explicit action (no scroll auto-open).
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return;
    // Open when the URL targets the calculator — the hero button navigates to
    // #cabin-calculator (fires hashchange), and a deep link / reload to that hash reopens it.
    const openIfHashed = () => {
      if (window.location.hash === CALC_HASH) setShow(true);
    };
    openIfHashed();
    window.addEventListener("hashchange", openIfHashed);
    return () => window.removeEventListener("hashchange", openIfHashed);
  }, [show]);

  const open = () => {
    setShow(true);
    // Reflect the open state in the URL (shareable / reload-friendly) without a scroll jump.
    if (window.location.hash !== CALC_HASH) window.history.replaceState(null, "", CALC_HASH);
  };

  return (
    <div id="cabin-calculator" className="scroll-mt-24" style={{ minHeight: 520 }}>
      {show ? (
        <CabinCalculator />
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-accent/40 bg-card py-20 text-center">
          <SlidersHorizontal className="h-10 w-10 text-accent" />
          <p className="max-w-md text-sm text-muted-foreground">
            Configure size, structure, interiors, electricals and add-ons — and watch your estimated price update live.
          </p>
          <Button variant="hero" size="lg" onClick={open}>
            Open Calculator
          </Button>
        </div>
      )}
    </div>
  );
}
