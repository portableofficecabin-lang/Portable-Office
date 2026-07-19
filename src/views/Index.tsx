import { Layout } from "@/components/layout/Layout";
import { HeroSection } from "@/components/home/HeroSection";
import { CabinCalculatorSection } from "@/components/home/CabinCalculatorSection";
import { CategoriesSection } from "@/components/home/CategoriesSection";
import { ProductRangeSection } from "@/components/home/ProductRangeSection";
import HomeBelowFoldSections from "@/components/home/HomeBelowFoldSections";
import { FAQSection } from "@/components/home/FAQSection";
import { CTASection } from "@/components/home/CTASection";
import { InternalLinkingHub } from "@/components/home/InternalLinkingHub";
import { JsonLd } from "@/components/JsonLd";
import { websiteStructuredData } from "@/components/seo/WebsiteJsonLd";
import { organizationStructuredData, localBusinessStructuredData, serviceAreaStructuredData, generateBreadcrumbSchema } from "@/lib/seo/structured-data";

const Index = () => {
  const combinedStructuredData = [
    websiteStructuredData,
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
      {/* Below-the-fold sections — SERVER-RENDERED so their content is in the initial HTML:
          featured products + GST-inclusive prices, why-choose-us, tech specs, applications,
          how-it-works, what-sets-us-apart and trusted clients. The six static sections ship
          ZERO client JS; FeaturedProducts is an async server component reading the ISR-cached
          merged catalog (page revalidate). Interactivity elsewhere stays in small islands. */}
      <HomeBelowFoldSections />
      {/* SEO-critical — FAQ schema + internal links stay server-rendered */}
      <FAQSection />
      <InternalLinkingHub />
      <CTASection />
    </Layout>
  );
};

export default Index;
