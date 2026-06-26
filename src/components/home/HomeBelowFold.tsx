"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// Below-the-fold, non-SEO-critical homepage sections are loaded client-side
// (ssr: false) as a SINGLE deferred chunk — keeping their markup + serialized RSC
// payload out of the initial HTML AND collapsing what used to be eight dynamic
// imports into one JS request. SEO-critical sections (Hero/H1, Categories, Product
// Range, FAQ schema, Internal Linking Hub) remain fully server-rendered in source.
const HomeBelowFoldSections = dynamic(() => import("./HomeBelowFoldSections"), {
  ssr: false,
  loading: () => null,
});

// Gate the chunk on an IntersectionObserver so its JS is fetched, parsed, rendered
// and hydrated ONLY when the visitor scrolls near it — not during the initial load
// window. This keeps the eight below-fold sections off the main thread while the
// hero LCP is painting (the LCP render delay was dominated by initial-load JS), and
// they were already non-SEO/ssr:false so deferring their mount changes no markup in
// View Source. A reserved min-height prevents layout shift (CLS-safe).
export function HomeBelowFold() {
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
      // Start loading ~one viewport early so content is ready by the time it scrolls in.
      { rootMargin: "800px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show]);

  return (
    <div ref={ref} style={show ? undefined : { minHeight: "1600px" }} aria-hidden={!show}>
      {show && <HomeBelowFoldSections />}
    </div>
  );
}
