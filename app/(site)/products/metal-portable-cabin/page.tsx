/**
 * METAL PORTABLE CABIN — the "choose your metal" hub.
 * Canonical URL: /products/metal-portable-cabin
 *
 * ── WHY A STATIC ROUTE AND NOT A CATALOGUE PRODUCT ──────────────────────────────────────────
 * This page has NO SKU by design (owner decision, 2026-09-05 — see the header of
 * MetalPortableCabinContent.tsx). Built as a product it would have been a third self-canonical
 * URL selling the same 20 × 10 ft cabin at the same price as POC-PC-MSPC and POC-PC-STEEL.
 * A static segment under /products takes precedence over /products/[slug], so the page needs no
 * catalogue entry at all — the same pattern portable-cabin, portable-toilet-cabin and
 * building-construction-contractor already use.
 *
 * ── STRUCTURED DATA ─────────────────────────────────────────────────────────────────────────
 * BreadcrumbList + FAQPage only.
 *   • NO Product and NO Offer. There is no SKU, no Add to Cart and nothing purchasable here, so
 *     an Offer node would describe a transaction this page cannot complete — the "user cannot
 *     complete purchase" failure in Merchant Center, and simply untrue besides.
 *   • FAQPage is legitimate because the identical array renders visibly in the accordion below.
 *   • The one ₹ figure on the page is the MS build's fixed price, READ from productCommerce at
 *     render time and clearly attributed to the MS Portable Cabin page that sells it. It is not
 *     a price for anything offered here.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { JsonLd } from "@/components/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { generateBreadcrumbSchema } from "@/lib/seo/structured-data";
import { MetalPortableCabinContent } from "@/components/products/MetalPortableCabinContent";

export const revalidate = 1800; // 30 minutes, matching the other product landing pages

const SITE = "https://portableofficecabin.com";
const PATH = "/products/metal-portable-cabin";
const H1 = "Metal Portable Cabin";
/* The owner's supplied meta title and description, minus nothing — both already avoid a price
   claim and a founding year, so they ship as written. */
const DESCRIPTION =
  "Metal portable cabins built to order in MS, galvanised or colour-coated sheet. Choose your " +
  "metal, size and layout. Built in our own factory, delivered pan-India.";
const IMAGE = `${SITE}/images/products/metal-portable-cabin/metal-portable-cabin-front.webp`;

export const metadata: Metadata = buildPageMetadata({
  absoluteTitle: "Metal Portable Cabin | MS, GI & Colour-Coated Options | India",
  description: DESCRIPTION,
  keywords:
    "metal portable cabin, metal cabin manufacturer India, MS portable cabin, GI portable cabin, " +
    "colour coated portable cabin, PPGI cabin, galvanised portable cabin, metal site office cabin, " +
    "metal security cabin, portable metal cabin price",
  path: PATH,
  image: IMAGE,
  imageAlt:
    "Metal portable cabin front elevation in colour-coated sage green sheet with a large picture window and glazed door",
  ogType: "website",
});

export default function MetalPortableCabinPage() {
  return (
    <Layout>
      <JsonLd
        data={generateBreadcrumbSchema([
          { name: "Home", url: SITE },
          { name: "Products", url: `${SITE}/products` },
          { name: "Portable Cabins", url: `${SITE}/products/category/portable-cabins` },
          { name: H1, url: `${SITE}${PATH}` },
        ])}
      />

      <div className="bg-background">
        <div className="container mx-auto px-4 py-10 sm:py-14">
          {/* Breadcrumb — mirrors the JSON-LD above so the visible trail and the markup agree. */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-accent">Home</Link></li>
              <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
              <li><Link href="/products" className="hover:text-accent">Products</Link></li>
              <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
              <li>
                <Link href="/products/category/portable-cabins" className="hover:text-accent">
                  Portable Cabins
                </Link>
              </li>
              <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5" /></li>
              <li className="font-medium text-foreground" aria-current="page">{H1}</li>
            </ol>
          </nav>

          <header className="max-w-4xl">
            <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl lg:text-5xl">
              {H1}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Built from the metal that suits your site — mild steel, galvanised or colour-coated —
              and delivered ready to use.
            </p>
          </header>

          <div className="mt-12">
            <MetalPortableCabinContent />
          </div>
        </div>
      </div>
    </Layout>
  );
}
