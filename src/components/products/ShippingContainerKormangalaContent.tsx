import shippingContainerCrane from "@/assets/products/shipping-container-kormangala-crane.webp";
import shippingContainerCafe from "@/assets/products/shipping-container-kormangala-cafe.webp";
import shippingContainerOffice from "@/assets/products/shipping-container-kormangala-office.webp";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Phone } from "lucide-react";
import { resolveImageUrl } from "@/utils/resolveImageUrl";
import Link from "next/link";
import { BuyNowCTA } from "@/components/products/BuyNowCTA";
import { primaryPhone } from "@/lib/site-navigation";

/*
 * Product id 29, /products/used-20ft-shipping-container-as-is-grade (renamed 2026-11 from the misspelt
 * /products/shipping-container-in-kormangala, which 301s here — src/data/productSlugRenames.ts): the used
 * 20 ft container in as-is grade, sold online at one fixed price.
 *
 * REFOCUSED 2026-11-15 (owner decision): until then this block was a long "Koramangala local guide"
 * aimed at "shipping container in Koramangala", the query that the city page
 * /cities-we-serve/shipping-container-koramangala now owns. It now describes the unit on sale and sends
 * Koramangala storage-layout enquiries to that page, which links back here. Price, Buy Now and checkout
 * are unchanged; no rupee figure is written here (the buy box carries the live price).
 */

const PRODUCT_NAME = "Used 20 ft Shipping Container (As-Is Grade)";

export function ShippingContainerKormangalaContent() {
  return (
    <section className="space-y-6">
      <figure className="space-y-3">
        <div className="grid gap-5 md:grid-cols-3">
          <OptimizedImage
            src={resolveImageUrl(shippingContainerCrane)}
            alt="Blue shipping container lifted by a mobile crane over a construction site"
            productName={PRODUCT_NAME}
            aspectRatio="16/10"
            className="rounded-3xl border border-border"
          />
          <OptimizedImage
            src={resolveImageUrl(shippingContainerCafe)}
            alt="Two-storey container café with a glazed front and rooftop seating under string lights at dusk"
            productName={PRODUCT_NAME}
            aspectRatio="16/10"
            className="rounded-3xl border border-border"
          />
          <OptimizedImage
            src={resolveImageUrl(shippingContainerOffice)}
            alt="Dark grey container office with full-width sliding glass doors and a desk inside"
            productName={PRODUCT_NAME}
            aspectRatio="16/10"
            className="rounded-3xl border border-border"
          />
        </div>
        <figcaption className="text-sm text-muted-foreground">
          Illustrative images of container delivery and conversions. Conversions are quoted separately from this unit.
        </figcaption>
      </figure>

      <div className="rounded-3xl border border-border bg-card p-8">
        <h2 className="mb-4 font-display text-2xl font-bold text-foreground">About this as-is grade container</h2>
        <p className="mb-4 leading-relaxed text-muted-foreground">
          This listing is one used 20 ft shipping container in as-is grade, sold at one fixed online price with GST
          included: the same amount you pay at checkout. Fitted offices, cafés, homes and other conversions are quoted
          separately to your specification.
        </p>
        <p className="mb-6 leading-relaxed text-muted-foreground">
          Planning separately lockable storage bays, restaurant equipment storage or a bicycle room in Koramangala? See{" "}
          <Link href="/cities-we-serve/shipping-container-koramangala" className="text-accent hover:underline">
            shipping and storage containers in Koramangala
          </Link>{" "}
          for layouts, placement and hire enquiries.
        </p>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <BuyNowCTA productId="29" />
          <a
            href={`tel:${primaryPhone.e164}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-8 py-3 font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            Call {primaryPhone.display}
          </a>
        </div>
      </div>
    </section>
  );
}
