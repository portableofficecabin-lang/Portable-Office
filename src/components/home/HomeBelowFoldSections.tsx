import { WhyChooseUs } from "./WhyChooseUs";
import { FeaturedProducts } from "./FeaturedProducts";
import { TechSpecsSection } from "./TechSpecsSection";
import { ApplicationsSection } from "./ApplicationsSection";
import { HowItWorks } from "./HowItWorks";
import { WhatSetsUsApart } from "./WhatSetsUsApart";
import { TrustedClientsSection } from "./TrustedClientsSection";
import { TestimonialsSection } from "./TestimonialsSection";

// All below-the-fold, non-SEO-critical homepage sections bundled into ONE module
// so they load as a single deferred chunk (one JS request) instead of eight.
export default function HomeBelowFoldSections() {
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
