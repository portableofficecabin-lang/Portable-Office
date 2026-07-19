import { describe, it, expect, beforeEach } from "vitest";
import {
  readGuestCart,
  writeGuestCart,
  addGuestCartItem,
  setGuestCartQuantity,
  removeGuestCartItem,
  clearGuestCart,
  GUEST_CART_KEY,
} from "./guestCart";

/**
 * The logged-out visitor's cart lives in localStorage (cart_items RLS forbids anon writes).
 * These lock the behaviour the whole guest checkout depends on: it survives reads/writes,
 * clamps quantities, de-duplicates, and never throws on corrupt data.
 */

beforeEach(() => {
  window.localStorage.clear();
});

describe("guestCart — basic add / read / persist", () => {
  it("starts empty", () => {
    expect(readGuestCart()).toEqual([]);
  });

  it("adds an item and reads it back", () => {
    addGuestCartItem("1", 2);
    expect(readGuestCart()).toEqual([{ product_id: "1", quantity: 2 }]);
  });

  it("re-adding a product SETS the quantity (mirrors the logged-in upsert), never stacks", () => {
    addGuestCartItem("1", 1);
    addGuestCartItem("1", 1);
    expect(readGuestCart()).toEqual([{ product_id: "1", quantity: 1 }]);
  });

  it("keeps distinct products as separate lines", () => {
    addGuestCartItem("1", 1);
    addGuestCartItem("12", 2);
    const cart = readGuestCart();
    expect(cart).toHaveLength(2);
    expect(cart.find((l) => l.product_id === "12")?.quantity).toBe(2);
  });
});

describe("guestCart — quantities", () => {
  it("sets an exact quantity", () => {
    addGuestCartItem("1", 1);
    setGuestCartQuantity("1", 5);
    expect(readGuestCart()[0].quantity).toBe(5);
  });

  it("removes the line when quantity drops below 1", () => {
    addGuestCartItem("1", 1);
    setGuestCartQuantity("1", 0);
    expect(readGuestCart()).toEqual([]);
  });

  it("clamps a non-positive or fractional add up to at least 1 whole unit", () => {
    addGuestCartItem("1", 0);
    expect(readGuestCart()[0].quantity).toBe(1);
    addGuestCartItem("1", 2.9);
    expect(readGuestCart()[0].quantity).toBe(2);
  });
});

describe("guestCart — remove / clear", () => {
  it("removes a single product", () => {
    addGuestCartItem("1", 1);
    addGuestCartItem("12", 1);
    removeGuestCartItem("1");
    expect(readGuestCart().map((l) => l.product_id)).toEqual(["12"]);
  });

  it("clear empties everything and removes the storage key", () => {
    addGuestCartItem("1", 1);
    clearGuestCart();
    expect(readGuestCart()).toEqual([]);
    expect(window.localStorage.getItem(GUEST_CART_KEY)).toBeNull();
  });
});

describe("guestCart — resilience", () => {
  it("reads empty from corrupt JSON instead of throwing", () => {
    window.localStorage.setItem(GUEST_CART_KEY, "{not json");
    expect(readGuestCart()).toEqual([]);
  });

  it("drops invalid entries and de-duplicates by product_id (last wins)", () => {
    window.localStorage.setItem(
      GUEST_CART_KEY,
      JSON.stringify([
        { product_id: "1", quantity: 1 },
        { product_id: "", quantity: 4 }, // invalid — dropped
        { product_id: "1", quantity: 3 }, // dup — last wins
        { nope: true }, // invalid — dropped
      ]),
    );
    expect(readGuestCart()).toEqual([{ product_id: "1", quantity: 3 }]);
  });

  it("writing an empty array clears the key", () => {
    addGuestCartItem("1", 1);
    writeGuestCart([]);
    expect(window.localStorage.getItem(GUEST_CART_KEY)).toBeNull();
  });
});
