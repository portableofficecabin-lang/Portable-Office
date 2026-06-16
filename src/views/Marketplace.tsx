"use client";

import Image from "next/image";
import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import { ArrowRight, MapPin } from "lucide-react";
import { seoPromotions } from "@/data/seoPromotions";

export function MarketplacePage() {
  return (
    <Layout>
      <div className="container-custom section-padding">
        <div className="text-center mb-12">
          <h1 className="font-display font-extrabold text-4xl md:text-5xl mb-4 text-foreground">
            Our <span className="text-primary">Marketplace</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore all our location-specific promotions and offers on portable cabins, container offices, and prefab structures.
          </p>
        </div>

        {/* All Promotion Cards in Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {seoPromotions.map((promo, index) => {
            const slug = `${promo.keyword.toLowerCase().replace(/\s+/g, "-")}-in-${promo.location.toLowerCase().replace(/\s+/g, "-")}`;
            return (
              <Link
                key={index}
                href={`/promotions/${slug}`}
                className="group bg-card rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border border-border"
              >
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={promo.imageUrl}
                    alt={promo.imageAlt}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-accent text-white px-3 py-1 rounded-full font-bold text-xs">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {promo.location}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg mb-2 text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {promo.keyword} in {promo.location}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                    Premium quality {promo.imageAlt} with fast installation and 10-year warranty.
                  </p>
                  <div className="flex items-center text-primary font-semibold gap-1 text-sm">
                    <span>View Offer</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-8 md:p-12 text-white">
            <h2 className="font-display font-extrabold text-3xl md:text-4xl mb-4">
              Don't Miss Out!
            </h2>
            <p className="text-lg mb-6 opacity-90">
              Contact us today for personalized offers and solutions for your project.
            </p>
            <Link href="/contact" className="inline-flex items-center gap-2 bg-white text-primary px-8 py-4 rounded-full font-bold text-lg hover:bg-black hover:text-white transition-all duration-300">
              Contact Us Today
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
