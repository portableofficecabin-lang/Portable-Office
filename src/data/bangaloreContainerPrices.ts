import { products, getProductDetailPath } from "@/data/products";
import { getCommerce, isPurchasable } from "@/data/productCommerce";
import { formatINR, sellPrice } from "@/lib/pricing/gst";

/**
 * The price table on /promotions/shipping-container-in-bangalore: each row names a container
 * configuration and links to the EXACT catalogue products of that configuration, showing each
 * product's own fixed, GST-inclusive price from the commerce source of truth (productCommerce.ts +
 * sellPrice). Nothing here is typed by hand, so the table can never disagree with the product page,
 * the cart or checkout, and a renamed product URL (getProductDetailPath) follows automatically.
 *
 * WHY (owner, 2026-11-26): the table used to show indicative ranges ("₹1.5 – ₹2.5 lakh" …) that no
 * catalogue configuration supported. Rows were replaced with catalogue links; a row with no matching
 * product was removed ("40 ft storage container": the catalogue has only multi-size listings with one
 * price, no single 40 ft storage unit). Only products verified to be that configuration are listed:
 *  - used / refurbished 20 ft: ids 29, 33, 32, 34, 30, 31 (all named "Used 20 ft" / "Refurbished 20 ft");
 *  - 20 ft storage container: id 12 "20ft Storage Container – Corten Steel" (its page does not say
 *    "new", so the row does not either);
 *  - 20 ft site office: id 2 "Standard Site Office Container" (20ft x 8ft; page states insulation and
 *    finished wiring);
 *  - 40 ft container office: ids 42 (40 x 10 ft site office), 41 (VIP, furnished), 3 (Modern, insulated).
 */
export const BANGALORE_CONTAINER_ROWS: readonly { type: string; productIds: readonly string[] }[] = [
  { type: "Used or refurbished 20 ft shipping container", productIds: ["29", "33", "32", "34", "30", "31"] },
  { type: "20 ft storage container (Corten steel)", productIds: ["12"] },
  { type: "20 ft site office container (20 × 8 ft, insulated, wired)", productIds: ["2"] },
  { type: "40 ft container office", productIds: ["42", "41", "3"] },
];

export interface BangaloreContainerItem {
  id: string;
  name: string;
  href: string;
  /** Fixed price including GST, formatted (e.g. "₹1,48,000"). */
  price: string;
}

/** Rows resolved against the live catalogue. A product that is missing or no longer purchasable is
 *  dropped (never shown with a stale price); a row left with no products is dropped too. */
export function bangaloreContainerRows(): { type: string; items: BangaloreContainerItem[] }[] {
  return BANGALORE_CONTAINER_ROWS.map((row) => ({
    type: row.type,
    items: row.productIds.flatMap((id) => {
      const product = products.find((p) => String(p.id) === id);
      const commerce = getCommerce(id);
      if (!product || !commerce || !isPurchasable(id)) return [];
      return [{ id, name: product.name, href: getProductDetailPath(product), price: formatINR(sellPrice(commerce.basePrice)) }];
    }),
  })).filter((row) => row.items.length > 0);
}
