"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

// The calculator is a heavy interactive client island. It is loaded as its own
// deferred chunk (ssr:false → kept out of the initial HTML & RSC payload) and only
// mounted when the visitor scrolls near it or taps "Start Customizing" — so it
// never competes with the hero LCP or adds hydration cost on first paint. The
// banner above it is fully server-rendered for SEO.
const CabinCalculator = dynamic(() => import("./CabinCalculator"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center rounded-2xl border border-border bg-card py-24">
      <Loader2 className="h-6 w-6 animate-spin text-accent" />
    </div>
  ),
});

export function CabinCalculatorLoader() {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "500px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show]);

  return (
    <div ref={ref} id="cabin-calculator" className="scroll-mt-24" style={show ? undefined : { minHeight: "520px" }}>
      {show ? (
        <CabinCalculator />
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-accent/40 bg-card py-20 text-center">
          <SlidersHorizontal className="h-10 w-10 text-accent" />
          <p className="max-w-md text-sm text-muted-foreground">
            Configure size, structure, interiors, electricals and add-ons — and watch your estimated price update live.
          </p>
          <Button variant="hero" size="lg" onClick={() => setShow(true)}>
            Start Customizing
          </Button>
        </div>
      )}
    </div>
  );
}
