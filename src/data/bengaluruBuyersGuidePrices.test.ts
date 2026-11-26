import { describe, it, expect } from "vitest";
import { BENGALURU_GUIDE_ROWS, bengaluruGuideRows } from "./bengaluruBuyersGuidePrices";
import { products, getProductDetailPath } from "./products";
import { getCommerce, isPurchasable } from "./productCommerce";
import { formatINR, sellPrice } from "@/lib/pricing/gst";

/**
 * The Bengaluru buyer's guide may only link exact catalogue products of the configuration each row
 * names, at their own fixed GST-inclusive price (D6 review, 2026-11-26).
 */
const byId = (id: string) => products.find((p) => String(p.id) === id)!;
const size = (id: string) => String(getCommerce(id)?.size ?? "");

describe("Bengaluru buyer's guide price list — exact catalogue products only", () => {
  it("every product exists, is purchasable, links its live product URL and shows its catalogue price", () => {
    const rows = bengaluruGuideRows();
    expect(rows.length).toBe(BENGALURU_GUIDE_ROWS.length);
    for (const row of rows) {
      const ids = BENGALURU_GUIDE_ROWS.find((r) => r.type === row.type)!.productIds;
      expect(row.items.map((i) => i.id)).toEqual([...ids]);
      for (const item of row.items) {
        expect(isPurchasable(item.id)).toBe(true);
        expect(item.href).toBe(getProductDetailPath(byId(item.id)));
        expect(item.price).toBe(formatINR(sellPrice(getCommerce(item.id)!.basePrice)));
      }
    }
  });

  it("each row lists only products whose catalogue size is that configuration", () => {
    const [cabin20, office20, office40, guard, toilet] = BENGALURU_GUIDE_ROWS;
    for (const id of cabin20.productIds) expect(/^20\s?ft\s?[x×]\s?10\s?ft/i.test(size(id))).toBe(true);
    for (const id of office20.productIds) expect(/^20\s?ft\s?x\s?8\s?ft/i.test(size(id)) && /office/i.test(byId(id).name)).toBe(true);
    for (const id of office40.productIds) expect(/^40\s?ft/i.test(size(id)) && /office/i.test(byId(id).name)).toBe(true);
    for (const id of guard.productIds) expect(/^20\s?ft\s?x\s?10\s?ft/i.test(size(id)) && /security/i.test(byId(id).name)).toBe(true);
    for (const id of toilet.productIds) expect(/toilet/i.test(byId(id).name) && /4 unit/i.test(byId(id).name)).toBe(true);
  });

  it("no 'custom sizes' listing stands in for a configuration, and no product is listed twice", () => {
    const ids = BENGALURU_GUIDE_ROWS.flatMap((r) => r.productIds);
    for (const id of ids) expect(/custom/i.test(size(id))).toBe(false);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
