import { formatINR } from "@/lib/pricing/gst";

/**
 * The fixed-price offer a landing-page content component renders INSTEAD of its generic
 * "indicative pricing" copy.
 *
 * WHY THIS EXISTS: the long-form category content (ContainerOfficeContent, PortableToiletContent,
 * PortaCabinContent, …) publishes indicative ₹ ranges and per-sq-ft figures. That is fine on a
 * quotation-only page — but on a PURCHASABLE product page those ranges sit next to a real,
 * chargeable offer price, and a visible number that contradicts the offer is exactly the
 * landing-page mismatch that got the Merchant Center account suspended. So ProductDetailServer
 * passes this object into the content component whenever `isPurchasable(product.id)` is true, and
 * the component swaps every generic price claim for the ONE real figure.
 *
 * `sellPriceInr` is always sellPrice(commerce.basePrice) — derived from the commerce catalog,
 * never typed by hand — so the content section can never disagree with the buy box, the cart,
 * the JSON-LD or the feed.
 */
export interface FixedOffer {
  /** GST-inclusive selling price in whole rupees — sellPrice(commerce.basePrice). */
  sellPriceInr: number;
  /** The product's display name, so the callout says exactly what the price buys. */
  name: string;
}

/** The one price block a purchasable product's content section is allowed to show. */
export function FixedPriceCallout({ offer, note }: { offer: FixedOffer; note?: string }) {
  return (
    <div className="bg-card border border-accent/30 rounded-xl p-6 shadow-card">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
        Fixed price — {offer.name}
      </p>
      <p className="font-display text-2xl md:text-3xl font-bold text-foreground">
        {formatINR(offer.sellPriceInr)}
      </p>
      <p className="text-sm text-muted-foreground mt-2">
        Inclusive of 18% GST. This is the exact amount charged at checkout — transport and
        installation are calculated separately by delivery pincode.
      </p>
      {note && <p className="text-sm font-medium text-foreground mt-2">{note}</p>}
    </div>
  );
}
