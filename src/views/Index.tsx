import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { CabinCalculatorSection } from "@/components/home/CabinCalculatorSection";
import { CategoriesSection } from "@/components/home/CategoriesSection";
import { ProductRangeSection } from "@/components/home/ProductRangeSection";
import { HomeBelowFold } from "@/components/home/HomeBelowFold";
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
      {/* SEO-critical, above-the-fold — server-rendered in page source */}
      <HeroSection />
      {/* Highlighted conversion feature: customize & price your cabin */}
      <CabinCalculatorSection />
      <CategoriesSection />
      <ProductRangeSection />
      {/* Non-SEO-critical, below-the-fold — deferred to client (kept out of HTML) */}
      <HomeBelowFold />
      {/* SEO-critical — FAQ schema + internal links stay server-rendered */}
      <FAQSection />
      <InternalLinkingHub />
      <CTASection />
    </Layout>
  );
};

export default Index;
