import { describe, it, expect } from "vitest";
import { PRODUCT_COMMERCE, feedEligible, isPurchasable, getCommerce } from "./productCommerce";

/**
 * The single classification predicate that gates Add to Cart, the JSON-LD offers block AND
 * Merchant feed inclusion. If these drift, a product can appear buyable in one place and not
 * another — the mismatch that suspended the account. These lock the three to one truth.
 */

describe("isPurchasable / feedEligible — one truth for what can be sold online", () => {
  it("feedEligible() and isPurchasable() describe the exact same set", () => {
    const eligibleIds = feedEligible().map((c) => c.id).sort();
    const purchasableIds = PRODUCT_COMMERCE.filter((c) => isPurchasable(c.id)).map((c) => c.id).sort();
    expect(eligibleIds).toEqual(purchasableIds);
    expect(eligibleIds.length).toBeGreaterThan(0);
  });

  it("every feed-eligible SKU is a confirmed, in-stock, fixed-price product", () => {
    for (const c of feedEligible()) {
      expect(c.kind).toBe("product");
      expect(c.priceConfirmed).toBe(true);
      expect(c.inStock).toBe(true);
      expect(c.basePrice).toBeGreaterThan(0);
    }
  });

  it("quote-only kinds are never purchasable", () => {
    const quoteKinds = new Set(["custom", "rental", "service", "guide", "location"]);
    for (const c of PRODUCT_COMMERCE) {
      if (quoteKinds.has(c.kind)) {
        expect(isPurchasable(c.id)).toBe(false);
      }
    }
  });

  it("a product with priceConfirmed=false is never purchasable, whatever its kind", () => {
    for (const c of PRODUCT_COMMERCE) {
      if (!c.priceConfirmed) expect(isPurchasable(c.id)).toBe(false);
    }
  });

  it("known quote-only SKUs stay out (custom project, rental, service, location)", () => {
    expect(isPurchasable("10")).toBe(false); // custom container office (size is a range)
    expect(isPurchasable("18")).toBe(false); // shipping container rental (monthly)
    expect(isPurchasable("19")).toBe(false); // manufacturers service page
    expect(isPurchasable("29")).toBe(false); // location landing page
  });

  it("feed SKUs are unique by g:id (a duplicate rejects the whole feed)", () => {
    const skus = feedEligible().map((c) => c.sku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it("getCommerce returns undefined for an unknown id and refuses it as unpurchasable", () => {
    expect(getCommerce("nope")).toBeUndefined();
    expect(isPurchasable("nope")).toBe(false);
  });
});
