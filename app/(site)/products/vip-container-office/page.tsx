import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, MessageCircle } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { JsonLd } from "@/components/JsonLd";
import { OptimizedImage } from "@/components/OptimizedImage";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbSchema, generateFAQSchema } from "@/lib/seo/structured-data";
import {
  VipContainerOfficeContent,
  VIP_FAQS,
  VIP_HERO_IMAGE,
} from "@/components/products/VipContainerOfficeContent";

// Dedicated, indexable landing page for the high-intent "VIP container office"
// query. Static segment under /products → wins over /products/[slug], so it needs
// no catalog entry. Single canonical URL: /products/vip-container-office.

const SITE = "https://portableofficecabin.com";
const PATH = "/products/vip-container-office";
const H1 = "VIP Container Office — Luxury, Furnished & Ready to Impress";
const HERO_ALT = "VIP container office with glass façade and executive interior in India";

export const revalidate = 1800; // 30 minutes

// Canonical/twitter/geo come from buildPageMetadata; OG title & description are
// overridden to match the page's bespoke social copy.
const base = buildPageMetadata({
  absoluteTitle: "VIP Container Office — Luxury Portable Office Cabin India",
  description:
    "Premium VIP container office for sale & rent in India. Fully furnished, AC, insulated, glass façade & executive interiors. Get a free quote from Portable Office Cabin.",
  keywords:
    "VIP container office, luxury container office, VIP portable office cabin, executive container office, premium office container, VIP container office price, furnished container office, modern container office, VIP office cabin India",
  path: PATH,
  ogImage: `${SITE}${VIP_HERO_IMAGE}`,
});

export const metadata: Metadata = {
  ...base,
  openGraph: {
    ...base.openGraph,
    title: "VIP Container Office in India | Luxury Portable Office Cabin",
    description:
      "Fully furnished, air-conditioned VIP container offices for sale and rent across India. Premium finish, modern design, fast delivery.",
  },
};

export default function VipContainerOfficePage() {
  return (
    <Layout>
      <JsonLd
        data={[
          generateBreadcrumbSchema([
            { name: "Home", url: SITE },
            { name: "Products", url: `${SITE}/products` },
            { name: "VIP Container Office", url: `${SITE}${PATH}` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: "VIP Container Office",
            description:
              "Premium, fully furnished VIP container office in India — air-conditioned, insulated, glass façade and executive interiors. Available for sale and on rent.",
            image: `${SITE}${VIP_HERO_IMAGE}`,
            brand: { "@type": "Brand", name: "Portable Office Cabin" },
            category: "Container Offices",
            url: `${SITE}${PATH}`,
          },
          generateFAQSchema(VIP_FAQS),
        ]}
      />

      {/* Breadcrumb */}
      <section className="bg-muted/50 py-4 border-b border-border">
        <div className="container-custom">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-accent">Home</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Link href="/products" className="text-muted-foreground hover:text-accent">Products</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground font-medium">VIP Container Office</span>
          </nav>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          {/* Hero */}
          <div className="grid lg:grid-cols-2 gap-10 items-center mb-16">
            <div>
              <Link
                href="/products/category/container-offices"
                className="text-accent font-medium text-sm tracking-wider hover:underline"
              >
                CONTAINER OFFICES
              </Link>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-foreground mt-3 mb-5 leading-tight">
                {H1}
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                When a standard site cabin won&apos;t do, the <strong className="text-foreground">VIP container office</strong> delivers a workspace that means business. At Portable Office Cabin, we design and build premium, fully furnished container offices that combine the strength of a steel structure with the comfort, style, and finish of a modern executive office. Available for sale and on rent across India, every VIP container office arrives ready to use — air-conditioned, insulated, and finished to impress clients and leadership alike.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-7">
                Whether you need an on-site project office, a real estate sales lounge, or a corporate meeting room, our VIP container offices give you a professional, relocatable workspace without the cost and delay of permanent construction.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/contact" className="inline-flex items-center gap-2 bg-accent text-white font-semibold px-6 py-3 rounded-full hover:bg-accent/90 transition-colors">
                  Get a Free Quote
                  <ChevronRight className="h-4 w-4" />
                </Link>
                <a
                  href="https://wa.me/919731897976?text=Hi%2C%20I%27m%20interested%20in%20a%20VIP%20container%20office"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border-2 border-accent text-accent font-semibold px-6 py-3 rounded-full hover:bg-accent/10 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Call / WhatsApp Us Now
                </a>
              </div>
            </div>
            <OptimizedImage
              src={VIP_HERO_IMAGE}
              alt={HERO_ALT}
              aspectRatio="3/2"
              priority
              geoTag={false}
              className="rounded-2xl shadow-xl"
            />
          </div>

          {/* Body */}
          <VipContainerOfficeContent />
        </div>
      </section>
    </Layout>
  );
}
