import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import { seoPromotions } from "@/data/seoPromotions";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { ArrowRight, MapPin } from "lucide-react";

export const metadata = buildPageMetadata({
  absoluteTitle: "Location Promotions | Portable Cabins Across India",
  description:
    "Explore location-wise promotions for portable cabins, container offices, site offices & labour colonies in Bangalore, Chennai, Hyderabad, Mumbai & all major Indian cities.",
  keywords:
    "portable cabin promotions, location specific prefab offers, container office promotions India, site office deals by city",
  path: "/promotions",
});

export default function PromotionsIndexPage() {
  const keywords = [...new Set(seoPromotions.map(p => p.keyword))];
  const locations = [...new Set(seoPromotions.map(p => p.location))];

  return (
    <Layout>
      <div className="container-custom section-padding">
        <div className="text-center mb-16">
          <h1 className="font-display font-extrabold text-4xl md:text-5xl mb-4 text-foreground">
            Our <span className="text-primary">Location-Specific Promotions</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Find the perfect prefab solution for your location with our tailored promotions and offers.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          {/* By Location */}
          <div>
            <h2 className="font-display font-extrabold text-3xl mb-8 flex items-center gap-3 text-foreground">
              <MapPin className="w-8 h-8 text-primary" />
              Browse by Location
            </h2>
            <div className="space-y-4">
              {locations.map(location => (
                <div key={location} className="bg-card rounded-xl p-6 shadow-lg border border-border">
                  <h3 className="font-bold text-2xl mb-4 text-foreground">{location}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {keywords.map(keyword => {
                      const slug = `${keyword.toLowerCase().replace(/\s+/g, "-")}-in-${location.toLowerCase().replace(/\s+/g, "-")}`;
                      return (
                        <Link
                          key={`${keyword}-${location}`}
                          href={`/promotions/${slug}`}
                          className="text-muted-foreground hover:text-primary text-sm font-medium flex items-center gap-2"
                        >
                          <ArrowRight className="w-4 h-4" />
                          {keyword}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By Product */}
          <div>
            <h2 className="font-display font-extrabold text-3xl mb-8 flex items-center gap-3 text-foreground">
              <ArrowRight className="w-8 h-8 text-primary" />
              Browse by Product
            </h2>
            <div className="space-y-4">
              {keywords.map(keyword => (
                <div key={keyword} className="bg-card rounded-xl p-6 shadow-lg border border-border">
                  <h3 className="font-bold text-2xl mb-4 text-foreground">{keyword}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {locations.map(location => {
                      const slug = `${keyword.toLowerCase().replace(/\s+/g, "-")}-in-${location.toLowerCase().replace(/\s+/g, "-")}`;
                      return (
                        <Link
                          key={`${keyword}-${location}`}
                          href={`/promotions/${slug}`}
                          className="text-muted-foreground hover:text-primary text-sm font-medium flex items-center gap-2"
                        >
                          <ArrowRight className="w-4 h-4" />
                          {location}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
