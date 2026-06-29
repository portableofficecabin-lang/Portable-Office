import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { JsonLd } from "@/components/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { PortableCabinContent } from "@/components/products/PortableCabinContent";

// Dedicated, indexable landing page for the high-intent "portable cabin" query.
// This static segment takes precedence over /products/[slug], so it does NOT need
// a product entry in the catalog. Single canonical URL: /products/portable-cabin.

const SITE = "https://portableofficecabin.com";
const PATH = "/products/portable-cabin";
const H1 = "Portable Cabin Manufacturer in India";
const DESCRIPTION =
  "Portable cabin manufacturer in India — MS & GI prefab site offices, worker accommodation, security and toilet cabins. PUF insulated, custom sizes and fast pan-India delivery.";
const IMAGE = `${SITE}/images/products/portable-cabin.webp`;

export const revalidate = 1800; // 30 minutes

export const metadata: Metadata = buildPageMetadata({
  title: H1,
  description: DESCRIPTION,
  keywords:
    "portable cabin, portable cabin manufacturer India, prefab portable cabin, porta cabin, MS portable cabin, GI portable cabin, site office cabin, portable cabin price India",
  path: PATH,
  ogImage: IMAGE,
});

export default function PortableCabinPage() {
  return (
    <Layout>
      <JsonLd
        data={[
          generateBreadcrumbSchema([
            { name: "Home", url: SITE },
            { name: "Products", url: `${SITE}/products` },
            { name: "Portable Cabin", url: `${SITE}${PATH}` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: H1,
            description: DESCRIPTION,
            image: IMAGE,
            brand: { "@type": "Brand", name: "Portable Office Cabin" },
            category: "Portable Cabins",
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
            <span className="text-foreground font-medium">Portable Cabin</span>
          </nav>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          <div className="max-w-3xl mb-12">
            <Link
              href="/products/category/portable-cabins"
              className="text-accent font-medium text-sm tracking-wider hover:underline"
            >
              PORTABLE CABINS
            </Link>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mt-3 mb-4">
              {H1}
            </h1>
            <p className="text-lg text-muted-foreground">{DESCRIPTION}</p>
          </div>
          <PortableCabinContent />
        </div>
      </section>
    </Layout>
  );
}
