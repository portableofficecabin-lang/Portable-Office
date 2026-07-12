import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Phone, MessageCircle } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { JsonLd } from "@/components/JsonLd";
import { OptimizedImage } from "@/components/OptimizedImage";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  generateBreadcrumbSchema,
  generateFAQSchema,
  generateProductStructuredData,
} from "@/lib/seo/structured-data";
import {
  ShippingContainerBangaloreContent,
  SHIPPING_BLR_FAQS,
} from "@/components/promotions/ShippingContainerBangaloreContent";

// Bespoke, rich local landing page. This static segment wins over /promotions/[slug],
// so it replaces the templated version for this exact URL. Single canonical URL.

const SITE = "https://portableofficecabin.com";
const PATH = "/promotions/shipping-container-in-bangalore";
const H1 = "Shipping Container in Bangalore — Direct from the Manufacturer";
const HERO = `${SITE}/images/products/cargo-shipping-container-main.webp`;
const HERO_ALT = "20ft shipping container manufactured at our Hoskote factory near Bangalore";

export const revalidate = 86400; // 24h

export const metadata: Metadata = buildPageMetadata({
  absoluteTitle: "Shipping Container in Bangalore | Price, Sizes & Supplier",
  description:
    "Buy shipping containers in Bangalore from a local manufacturer. 10ft, 20ft & 40ft units for storage, offices & housing. Price from ₹1.5 lakh. Free quote.",
  keywords:
    "shipping container in Bangalore, shipping container price Bangalore, 20ft shipping container, 40ft container, storage container Bangalore, container office Bangalore, used shipping container Bangalore, container manufacturer Bangalore",
  path: PATH,
  ogImage: HERO,
  geo: {
    region: "IN-KA",
    placename: "Bangalore, Karnataka, India",
    position: "12.9716;77.5946",
    icbm: "12.9716, 77.5946",
  },
});

export default function ShippingContainerBangalorePage() {
  return (
    <Layout>
      <JsonLd
        data={[
          generateBreadcrumbSchema([
            { name: "Home", url: SITE },
            { name: "Promotions", url: `${SITE}/promotions` },
            { name: "Shipping Container in Bangalore", url: `${SITE}${PATH}` },
          ]),
          // Routed through the shared helper, which deliberately emits NO offers /
          // price / availability: this is a quote-only business with no payment
          // gateway, so any transactable price band or stock claim would be a
          // misrepresentation. `url` is overridden because the helper defaults to
          // /products/* and this Product lives on a promotions landing page.
          {
            ...generateProductStructuredData({
              name: "Shipping Container in Bangalore",
              description:
                "New and used shipping containers in Bangalore for storage, site offices, accommodation and custom conversions — 10ft, 20ft & 40ft, manufactured at our Hoskote factory.",
              image: HERO,
              category: "Cargo Storage & Shipping Containers",
            }),
            url: `${SITE}${PATH}`,
          },
          generateFAQSchema(SHIPPING_BLR_FAQS),
        ]}
      />

      {/* Breadcrumb */}
      <section className="bg-muted/50 py-4 border-b border-border">
        <div className="container-custom">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-accent">Home</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Link href="/promotions" className="text-muted-foreground hover:text-accent">Promotions</Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground font-medium">Shipping Container in Bangalore</span>
          </nav>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          {/* Hero */}
          <div className="grid lg:grid-cols-2 gap-10 items-center mb-16">
            <div>
              <Link href="/products/category/cargo-storage-shipping-containers" className="text-accent font-medium text-sm tracking-wider hover:underline">
                SHIPPING CONTAINERS · BANGALORE
              </Link>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-foreground mt-3 mb-5 leading-tight">
                {H1}
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                Looking for a <strong className="text-foreground">shipping container in Bangalore</strong> for storage, a site office, or a custom conversion? Portable Office Cabin manufactures and supplies containers directly from our factory at Hoskote, on Bangalore&apos;s eastern edge — which means factory pricing, faster delivery, and full control over quality. We have supplied 500+ clients across India over 15+ years, and most Bangalore orders are delivered and installed within 7–10 days.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-7">
                Every unit is built with IS-grade steel, a galvanized frame for corrosion resistance, and optional 50mm PUF insulated panels for thermal comfort in Bangalore&apos;s climate. Prices start from ₹1.5 lakh, and every container carries a 10-year structural warranty.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/contact" className="inline-flex items-center gap-2 bg-accent text-white font-semibold px-6 py-3 rounded-full hover:bg-accent/90 transition-colors">
                  Get a Free Quote <ChevronRight className="h-4 w-4" />
                </Link>
                <a href="tel:+919731897976" className="inline-flex items-center gap-2 border-2 border-accent text-accent font-semibold px-6 py-3 rounded-full hover:bg-accent/10 transition-colors">
                  <Phone className="h-4 w-4" /> +91 97318 97976
                </a>
                <a href="https://wa.me/919731897976?text=Hi%2C%20I%27m%20interested%20in%20a%20shipping%20container%20in%20Bangalore" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border-2 border-accent text-accent font-semibold px-6 py-3 rounded-full hover:bg-accent/10 transition-colors">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </div>
            </div>
            <OptimizedImage src={HERO} alt={HERO_ALT} aspectRatio="3/2" priority geoTag={false} className="rounded-2xl shadow-xl" />
          </div>

          {/* Body */}
          <ShippingContainerBangaloreContent />
        </div>
      </section>
    </Layout>
  );
}
