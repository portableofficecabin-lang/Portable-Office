"use client";

import dynamic from "next/dynamic";

// Below-the-fold, non-SEO-critical homepage sections are loaded client-side
// (ssr: false) so their markup + serialized RSC payload stay OUT of the initial
// HTML document. This cuts initial HTML size and DOM node count significantly
// while the SEO-critical sections (Hero/H1, Categories, Product Range, FAQ schema,
// Internal Linking Hub) remain fully server-rendered in the page source.
// Each section reserves height via a placeholder to keep CLS ~0.

const ph = (minHeight: string) => {
  const Placeholder = () => (
    <div className="section-padding">
      <div className="container-custom">
        <div style={{ minHeight }} aria-hidden="true" />
      </div>
    </div>
  );
  return Placeholder;
};

const WhyChooseUs = dynamic(() => import("./WhyChooseUs").then((m) => m.WhyChooseUs), { ssr: false, loading: ph("420px") });
const FeaturedProducts = dynamic(() => import("./FeaturedProducts").then((m) => m.FeaturedProducts), { ssr: false, loading: ph("640px") });
const TechSpecsSection = dynamic(() => import("./TechSpecsSection").then((m) => m.TechSpecsSection), { ssr: false, loading: ph("360px") });
const ApplicationsSection = dynamic(() => import("./ApplicationsSection").then((m) => m.ApplicationsSection), { ssr: false, loading: ph("360px") });
const HowItWorks = dynamic(() => import("./HowItWorks").then((m) => m.HowItWorks), { ssr: false, loading: ph("460px") });
const WhatSetsUsApart = dynamic(() => import("./WhatSetsUsApart").then((m) => m.WhatSetsUsApart), { ssr: false, loading: ph("460px") });
const TrustedClientsSection = dynamic(() => import("./TrustedClientsSection").then((m) => m.TrustedClientsSection), { ssr: false, loading: ph("460px") });
const TestimonialsSection = dynamic(() => import("./TestimonialsSection").then((m) => m.TestimonialsSection), { ssr: false, loading: ph("420px") });

export function HomeBelowFold() {
  return (
    <>
      <WhyChooseUs />
      <FeaturedProducts />
      <TechSpecsSection />
      <ApplicationsSection />
      <HowItWorks />
      <WhatSetsUsApart />
      <TrustedClientsSection />
      <TestimonialsSection />
    </>
  );
}
