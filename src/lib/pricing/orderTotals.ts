/**
 * THE one place order maths happens.
 *
 * The cart, the checkout summary and the amount handed to Razorpay all call this exact
 * function, so the three can never disagree. A customer who is shown ₹4,01,340 pays
 * ₹4,01,340 — that identity is what keeps Merchant Center approval (and the business)
 * honest, so do not compute an order total anywhere else.
 *
 * EVERY number returned here is GST-INCLUSIVE:
 *   • unit prices come from sellPrice(commerce.basePrice) — never Product.price, which is
 *     a stale, ex-GST, display-only figure in src/data/products.ts.
 *   • freight comes from the zone table, whose rates are already GST-inclusive.
 *   • installation comes from INSTALLATION.rate, likewise GST-inclusive.
 *
 * The server RE-RUNS this against the user's own cart rows before charging (see
 * app/api/razorpay/order/route.ts). The browser's arithmetic is never trusted.
 */

import { sellPrice } from "./gst";
import { getCommerce, isPurchasable } from "@/data/productCommerce";
import { INSTALLATION, resolveShippingZone, type ShippingZone } from "@/data/shippingZones";

/** One requested cart row. `name` is display-only; pricing never depends on it. */
export interface OrderTotalsItem {
  productId: string;
  quantity: number;
  /** Optional display name. Falls back to the SKU so a line is never nameless. */
  name?: string | null;
}

export interface OrderTotalsInput {
  items: OrderTotalsItem[];
  /** 6-digit delivery pincode. Anything else resolves to no zone → shipping: null. */
  pincode?: string | null;
  wantsInstallation?: boolean;
}

/** A priced line. `unitPrice` and `lineTotal` are GST-inclusive whole rupees. */
export interface OrderLine {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

/** A row that was dropped because it is not purchasable. The server rejects the order. */
export interface SkippedLine {
  productId: string;
  reason: string;
}

export interface OrderTotals {
  lines: OrderLine[];
  /** Rows refused by isPurchasable() — quote-only products that must never be charged. */
  skipped: SkippedLine[];
  /** Sum of the GST-inclusive line totals. */
  itemsSubtotal: number;
  /**
   * Freight for the resolved zone, or NULL when the pincode is missing/malformed.
   * null means "unknown", NOT "free" — the UI must ask for a pincode rather than
   * silently charging ₹0, and the server must refuse to create an order.
   */
  shipping: number | null;
  zone: ShippingZone | null;
  /** INSTALLATION.rate when opted in, else 0. A separate line item — never inside freight. */
  installation: number;
  /** itemsSubtotal + shipping + installation. Treats an unresolved zone as 0 — only
   *  meaningful once `shipping !== null`, which is why both callers gate on `payable`. */
  grandTotal: number;
  /** What Razorpay is charged, in paise. */
  amountPaise: number;
  /** True only when there is something to buy AND freight is actually known. */
  payable: boolean;
}

export function computeTotals({
  items,
  pincode,
  wantsInstallation = false,
}: OrderTotalsInput): OrderTotals {
  const lines: OrderLine[] = [];
  const skipped: SkippedLine[] = [];

  for (const item of items) {
    const commerce = getCommerce(item.productId);

    // The SAME predicate that gates Add to Cart, the JSON-LD offers block and the feed.
    // If it says no, the item cannot be charged for — no exceptions, no fallbacks.
    if (!commerce || !isPurchasable(item.productId)) {
      skipped.push({
        productId: item.productId,
        reason: commerce
          ? "This product is made to order — it is quote-only and cannot be bought online."
          : "Unknown product.",
      });
      continue;
    }

    const quantity = Math.max(1, Math.floor(item.quantity));
    const unitPrice = sellPrice(commerce.basePrice); // base + 18% GST, rounded once.

    lines.push({
      productId: item.productId,
      sku: commerce.sku,
      name: item.name || commerce.sku,
      quantity,
      unitPrice,
      lineTotal: unitPrice * quantity,
    });
  }

  const itemsSubtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);

  const zone = resolveShippingZone(pincode ?? "");
  // A zone of 0 is genuinely free (Zone 1). Only a null ZONE means "we don't know yet".
  const shipping = zone ? zone.rate : null;

  const installation = wantsInstallation ? INSTALLATION.rate : 0;

  const grandTotal = itemsSubtotal + (shipping ?? 0) + installation;

  return {
    lines,
    skipped,
    itemsSubtotal,
    shipping,
    zone,
    installation,
    grandTotal,
    amountPaise: Math.round(grandTotal * 100),
    payable: lines.length > 0 && skipped.length === 0 && shipping !== null,
  };
}
