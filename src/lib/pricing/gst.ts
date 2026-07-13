/**
 * THE single source of truth for money on this site.
 *
 * Google Merchant Center (India) requires the landing-page price to be the final,
 * tax-inclusive price the customer pays for the item. Every surface that shows or
 * submits a price — product page, product card, cart, checkout, Product JSON-LD and
 * the Merchant feed — MUST derive it from `sellPrice()` here. If any surface does its
 * own arithmetic, the numbers drift and GMC disapproves the offer for a price mismatch.
 *
 * Catalog prices are stored EXCLUSIVE of GST (that is how the business quotes and
 * invoices). The customer-facing price is always base + GST.
 */

/** GST charged on every purchasable SKU in this catalog. Owner-confirmed: 18%. */
export const GST_RATE = 0.18;

/** GST as a display string, e.g. "18%". */
export const GST_PERCENT_LABEL = `${Math.round(GST_RATE * 100)}%`;

/**
 * The customer-facing selling price: base (ex-GST) + GST, rounded to whole rupees.
 *
 * Rounded ONCE, here, so the page, the cart, the checkout, the JSON-LD and the feed all
 * land on the identical integer. Never re-round a value that came out of this function.
 */
export function sellPrice(baseExGst: number): number {
  return Math.round(baseExGst * (1 + GST_RATE));
}

/** The GST component of a base price, in whole rupees. */
export function gstAmount(baseExGst: number): number {
  return sellPrice(baseExGst) - baseExGst;
}

/** Indian-format rupee string, e.g. ₹3,36,300. Display only — never feed this to GMC. */
export function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

/**
 * The price as Merchant Center and schema.org require it: a plain decimal with no
 * grouping separators and no symbol, e.g. "336300.00". The feed appends " INR".
 */
export function priceForFeed(amount: number): string {
  return Math.round(amount).toFixed(2);
}
