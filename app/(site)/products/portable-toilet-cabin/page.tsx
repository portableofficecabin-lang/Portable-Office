import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { JsonLd } from "@/components/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { PortableToiletContent } from "@/components/products/PortableToiletContent";

// Dedicated, indexable landing page for the high-intent "portable toilet cabin"
// query. This static segment takes precedence over /products/[slug], so it does NOT
// need a product entry. Single canonical URL: /products/portable-toilet-cabin.

const SITE = "https://portableofficecabin.com";
const PATH = "/products/portable-toilet-cabin";
const H1 = "Portable Toilet Cabin";
const DESCRIPTION =
  "Portable toilet cabin manufacturer in India — MS, GI, FRP & bio-toilet units with water tanks, exhaust and western/Indian pans. Single & multi-seater, fast pan-India delivery.";
const IMAGE = `${SITE}/images/products/portable-toilet.webp`;

export const revalidate = 1800; // 30 minutes

export const metadata: Metadata = buildPageMetadata({
  title: "Portable Toilet Cabin Manufacturer in India",
  description: DESCRIPTION,
  keywords:
    "portable toilet cabin, portable toilet manufacturer India, MS portable toilet, FRP portable toilet, bio toilet cabin, mobile toilet van, portable toilet price India, construction site toilet",
  path: PATH,
  ogImage: IMAGE,
});

export default function PortableToiletCabinPage() {
  return (
    <Layout>
      <JsonLd
        data={[
          generateBreadcrumbSchema([
            { name: "Home", url: SITE },
            { name: "Products", url: `${SITE}/products` },
            { name: "Portable Toilet Cabin", url: `${SITE}${PATH}` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: H1,
            description: DESCRIPTION,
            image: IMAGE,
            brand: { "@type": "Brand", name: "Portable Office Cabin" },
            category: "Portable Toilet Cabins",
            url: `${SITE}${PATH}`,
          },
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
            <span className="text-foreground font-medium">Portable Toilet Cabin</span>
          </nav>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          <div className="max-w-3xl mb-12">
            <Link
              href="/products/category/portable-toilet-cabins"
              className="text-accent font-medium text-sm tracking-wider hover:underline"
            >
              PORTABLE TOILET CABINS
            </Link>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mt-3 mb-4">
              {H1}
            </h1>
            <p className="text-lg text-muted-foreground">{DESCRIPTION}</p>
          </div>
          <PortableToiletContent />
        </div>
      </section>
    </Layout>
  );
}
