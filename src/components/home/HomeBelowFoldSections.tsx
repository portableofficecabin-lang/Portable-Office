import { WhyChooseUs } from "./WhyChooseUs";
import { FeaturedProducts } from "./FeaturedProducts";
import { BuyOrRentSection } from "./BuyOrRentSection";
import { TechSpecsSection } from "./TechSpecsSection";
import { ApplicationsSection } from "./ApplicationsSection";
import { HowItWorks } from "./HowItWorks";
import { WhatSetsUsApart } from "./WhatSetsUsApart";
import { IndustriesSection } from "./IndustriesSection";
import { TrustedClientsSection } from "./TrustedClientsSection";

// All below-the-fold, non-SEO-critical homepage sections bundled into ONE module
// so they load as a single deferred chunk (one JS request) instead of seven.
// IndustriesSection sits directly before TrustedClientsSection on purpose: the
// industry grid says WHO we build for, and the client-logo wall that follows is
// the proof from exactly those industries.
export default function HomeBelowFoldSections() {
  return (
    <>
      <WhyChooseUs />
      <FeaturedProducts />
      {/* Buy-or-Rent sits right after the product showcase: the visitor has just seen WHAT we
          build, and this light contrast band answers the next question — HOW to take it. */}
      <BuyOrRentSection />
      <TechSpecsSection />
      <ApplicationsSection />
      <HowItWorks />
      <WhatSetsUsApart />
      <IndustriesSection />
      <TrustedClientsSection />
    </>
  );
}
