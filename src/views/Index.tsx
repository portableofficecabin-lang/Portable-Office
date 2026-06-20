import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { CategoriesSection } from "@/components/home/CategoriesSection";
import { ProductRangeSection } from "@/components/home/ProductRangeSection";
import { TechSpecsSection } from "@/components/home/TechSpecsSection";
import { ApplicationsSection } from "@/components/home/ApplicationsSection";
import { FeaturedProductsLazy } from "@/components/home/FeaturedProductsLazy";
import { WhyChooseUs } from "@/components/home/WhyChooseUs";
import { HowItWorks } from "@/components/home/HowItWorks";
import { WhatSetsUsApart } from "@/components/home/WhatSetsUsApart";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { TrustedClientsSection } from "@/components/home/TrustedClientsSection";
import { FAQSection } from "@/components/home/FAQSection";
import { CTASection } from "@/components/home/CTASection";
import { InternalLinkingHub } from "@/components/home/InternalLinkingHub";
import { JsonLd } from "@/components/JsonLd";
import { organizationStructuredData, localBusinessStructuredData, serviceAreaStructuredData, generateBreadcrumbSchema } from "@/lib/seo/structured-data";

const Index = () => {
  const combinedStructuredData = [
    organizationStructuredData,
    localBusinessStructuredData,
    serviceAreaStructuredData,
    generateBreadcrumbSchema([
      { name: "Home", url: "https://portableofficecabin.com" },
    ]),
  ];

  return (
    <Layout>
      {/* Server-rendered JSON-LD so schema is present in View Page Source (not JS-injected).
          Title/description/canonical/OG/geo come from the route's metadata export. */}
      <JsonLd data={combinedStructuredData} />
      <HeroSection />
      <CategoriesSection />
      <ProductRangeSection />
      <WhyChooseUs />
      <FeaturedProductsLazy />
      <TechSpecsSection />
      <ApplicationsSection />
      <HowItWorks />
      <WhatSetsUsApart />
      <TrustedClientsSection />
      <TestimonialsSection />
      <FAQSection />
      <InternalLinkingHub />
      <CTASection />
    </Layout>
  );
};

export default Index;
