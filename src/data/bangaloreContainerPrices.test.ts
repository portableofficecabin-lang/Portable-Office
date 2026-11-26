import { describe, it, expect } from "vitest";
import { BANGALORE_CONTAINER_ROWS, bangaloreContainerRows } from "./bangaloreContainerPrices";
import { products } from "./products";
import { getCommerce, isPurchasable } from "./productCommerce";
import { formatINR, sellPrice } from "@/lib/pricing/gst";

/**
 * The Bangalore promotion's price table may only list exact catalogue products of the configuration
 * each row names, at their own fixed GST-inclusive price (owner, 2026-11-26). These lock that.
 */
const byId = (id: string) => products.find((p) => String(p.id) === id)!;
const label = (id: string) => `${byId(id).name} ${getCommerce(id)?.feedTitle ?? ""}`;

describe("Bangalore container price table — catalogue products only", () => {
  it("every listed product exists, is purchasable and shows its catalogue price incl. GST", () => {
    const rows = bangaloreContainerRows();
    expect(rows.length).toBe(BANGALORE_CONTAINER_ROWS.length);
    for (const row of rows) {
      for (const item of row.items) {
        expect(isPurchasable(item.id)).toBe(true);
        expect(item.price).toBe(formatINR(sellPrice(getCommerce(item.id)!.basePrice)));
        expect(item.href.startsWith("/products/")).toBe(true);
      }
    }
  });

  it("each row lists only products of that exact configuration", () => {
    const [used, storage20, office20, office40] = BANGALORE_CONTAINER_ROWS;
    for (const id of used.productIds) expect(/^(Used|Refurbished) 20 ft Shipping Container/.test(byId(id).name)).toBe(true);
    expect(used.productIds.length).toBe(6);
    for (const id of storage20.productIds) expect(/20\s?ft/i.test(label(id)) && /storage/i.test(label(id))).toBe(true);
    for (const id of office20.productIds) expect(/20ft x 8ft/i.test(label(id)) && /office/i.test(label(id))).toBe(true);
    for (const id of office40.productIds) expect(/40\s?(ft|x)/i.test(label(id)) && /office/i.test(label(id))).toBe(true);
  });

  it("no row without a matching single product, no claim the product page does not make, no duplicates", () => {
    const types = BANGALORE_CONTAINER_ROWS.map((r) => r.type);
    expect(types.some((t) => /40 ft storage/i.test(t))).toBe(false);
    expect(types.some((t) => /\bnew\b/i.test(t))).toBe(false);
    expect(types.some((t) => /accommodation/i.test(t))).toBe(false);
    const ids = BANGALORE_CONTAINER_ROWS.flatMap((r) => r.productIds);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
