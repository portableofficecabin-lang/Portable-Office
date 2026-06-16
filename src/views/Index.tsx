import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { CategoriesSection } from "@/components/home/CategoriesSection";
import { ProductRangeSection } from "@/components/home/ProductRangeSection";
import { TechSpecsSection } from "@/components/home/TechSpecsSection";
import { ApplicationsSection } from "@/components/home/ApplicationsSection";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { WhyChooseUs } from "@/components/home/WhyChooseUs";
import { HowItWorks } from "@/components/home/HowItWorks";
import { WhatSetsUsApart } from "@/components/home/WhatSetsUsApart";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { TrustedClientsSection } from "@/components/home/TrustedClientsSection";
import { FAQSection } from "@/components/home/FAQSection";
import { CTASection } from "@/components/home/CTASection";
import { InternalLinkingHub } from "@/components/home/InternalLinkingHub";
import { SEOHead } from "@/components/SEOHead";
import { seoData, organizationStructuredData, localBusinessStructuredData, serviceAreaStructuredData, generateBreadcrumbSchema } from "@/lib/seo/structured-data";

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
      <SEOHead
        title={seoData.home.title}
        description={seoData.home.description}
        keywords={`${seoData.home.keywords}, portable cabin Bangalore, container office Chennai, prefab home Hyderabad, portable cabin Mumbai, site office Delhi, container office Pune, portable cabin Ahmedabad, modular building Kolkata`}
        canonicalUrl="https://portableofficecabin.com"
        structuredData={combinedStructuredData}
      />
      <HeroSection />
      <CategoriesSection />
      <ProductRangeSection />
      <WhyChooseUs />
      <FeaturedProducts />
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
