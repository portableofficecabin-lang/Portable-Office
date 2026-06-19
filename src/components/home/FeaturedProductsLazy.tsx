"use client";

import dynamic from "next/dynamic";

// Lazy-load the (client) FeaturedProducts section. It pulls the full product
// catalog (~85 kB of data) into JS, but only renders 6 below-the-fold cards, so
// keeping it out of the initial bundle removes that unused JavaScript from the
// homepage's critical load. A height-reserving placeholder keeps CLS at 0 while
// the chunk loads after hydration.
const FeaturedProducts = dynamic(
  () => import("./FeaturedProducts").then((m) => m.FeaturedProducts),
  {
    ssr: false,
    loading: () => (
      <section className="section-padding bg-muted/50">
        <div className="container-custom">
          <div className="min-h-[640px]" aria-hidden="true" />
        </div>
      </section>
    ),
  },
);

export function FeaturedProductsLazy() {
  return <FeaturedProducts />;
}
