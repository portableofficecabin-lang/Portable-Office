import { describe, it, expect } from "vitest";
import {
  PRODUCT_COMMERCE,
  feedEligible,
  getCommerce,
  isOutrightSale,
  isPurchasable,
  isRentalPrice,
  priceUnitSuffix,
} from "./productCommerce";

/**
 * The predicates that gate Add to Cart, the JSON-LD offers block and Merchant feed inclusion.
 * If they drift, a product can appear buyable in one place and not another — the mismatch that
 * suspended the account.
 *
 * TWO predicates now, not one, and the distinction is the point:
 *   isPurchasable  — "can this be paid for online". TRUE for the rental booking.
 *   isOutrightSale — "is this figure the price of OWNING the unit". FALSE for the rental.
 *
 * Anything that states or compares a SALE price (price tables, category price bands,
 * ItemList/Offer schema, the feed) must use isOutrightSale. Monthly rent rendered as a
 * purchase price is a Merchant Center violation, not a cosmetic bug.
 */

const RENTAL_ID = "18"; // POC-SC-RENT — basePrice is monthly rent

describe("purchasability vs sale price — two predicates, one truth", () => {
  it("feedEligible() is a SUBSET of isPurchasable(), never a superset", () => {
    const purchasable = new Set(PRODUCT_COMMERCE.filter((c) => isPurchasable(c.id)).map((c) => c.id));
    const eligible = feedEligible().map((c) => c.id);
    expect(eligible.length).toBeGreaterThan(0);
    for (const id of eligible) expect(purchasable.has(id)).toBe(true);
  });

  it("feedEligible() and isOutrightSale() describe the exact same set", () => {
    const eligibleIds = feedEligible().map((c) => c.id).sort();
    const saleIds = PRODUCT_COMMERCE.filter((c) => isOutrightSale(c.id)).map((c) => c.id).sort();
    expect(eligibleIds).toEqual(saleIds);
  });

  it("every feed-eligible SKU is a confirmed, in-stock, outright-priced product", () => {
    for (const c of feedEligible()) {
      expect(c.kind).toBe("product");
      expect(c.priceConfirmed).toBe(true);
      expect(c.inStock).toBe(true);
      expect(c.basePrice).toBeGreaterThan(0);
      expect(c.priceBasis ?? "outright").toBe("outright");
    }
  });

  it("NO rental price can ever reach the Merchant feed", () => {
    for (const c of feedEligible()) expect(isRentalPrice(c.id)).toBe(false);
    expect(feedEligible().some((c) => c.id === RENTAL_ID)).toBe(false);
  });

  it("the rental stays bookable on-site but is never an outright sale", () => {
    expect(getCommerce(RENTAL_ID)).toBeDefined();
    expect(isPurchasable(RENTAL_ID)).toBe(true); // Buy Now / Add to Cart must keep working
    expect(isRentalPrice(RENTAL_ID)).toBe(true);
    expect(isOutrightSale(RENTAL_ID)).toBe(false); // no price table, no Offer, no feed
  });

  it("a rental price is never shown bare — it always carries a unit", () => {
    expect(priceUnitSuffix(RENTAL_ID)).toBe(" / month");
    for (const c of PRODUCT_COMMERCE) {
      if (!isRentalPrice(c.id)) expect(priceUnitSuffix(c.id)).toBe("");
    }
  });

  it("non-product kinds are never purchasable", () => {
    const quoteKinds = new Set(["custom", "rental", "service", "guide", "location"]);
    for (const c of PRODUCT_COMMERCE) {
      if (quoteKinds.has(c.kind)) expect(isPurchasable(c.id)).toBe(false);
    }
  });

  it("a product with priceConfirmed=false is never purchasable, whatever its kind", () => {
    for (const c of PRODUCT_COMMERCE) {
      if (!c.priceConfirmed) expect(isPurchasable(c.id)).toBe(false);
    }
  });

  it("feed SKUs are unique by g:id (a duplicate rejects the whole feed)", () => {
    const skus = feedEligible().map((c) => c.sku);
    expect(new Set(skus).size).toBe(skus.length);
  });

  it("getCommerce returns undefined for an unknown id and refuses it everywhere", () => {
    expect(getCommerce("nope")).toBeUndefined();
    expect(isPurchasable("nope")).toBe(false);
    expect(isOutrightSale("nope")).toBe(false);
    expect(isRentalPrice("nope")).toBe(false);
  });
});
