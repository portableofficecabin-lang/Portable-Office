import { describe, it, expect } from "vitest";
import { computeTotals } from "./orderTotals";
import { sellPrice } from "./gst";
import { getCommerce, feedEligible, isPurchasable } from "@/data/productCommerce";
import { INSTALLATION } from "@/data/shippingZones";

/**
 * The order-maths contract shared by the cart, the checkout summary AND the server Razorpay
 * route. Guest and logged-in checkout both run through computeTotals, so these invariants are
 * exactly what keeps the charged amount identical to the displayed amount (the Merchant Center
 * price-consistency requirement) and what stops a tampered guest cart from changing the price.
 */

// A stable purchasable SKU to price against. Derives its expected price from the catalog so the
// test survives an owner price edit — it asserts the RELATIONSHIP, not a frozen number.
const SELLABLE = feedEligible()[0];

describe("computeTotals — purchasable pricing is GST-inclusive and matches the catalog", () => {
  it("prices a purchasable line at sellPrice(basePrice) (base + 18% GST)", () => {
    const commerce = getCommerce(SELLABLE.id)!;
    const totals = computeTotals({ items: [{ productId: SELLABLE.id, quantity: 1 }], pincode: "560001" });
    expect(totals.lines).toHaveLength(1);
    expect(totals.lines[0].unitPrice).toBe(sellPrice(commerce.basePrice));
    expect(totals.lines[0].unitPrice).toBeGreaterThan(commerce.basePrice); // GST added
    expect(totals.skipped).toHaveLength(0);
    expect(totals.itemsSubtotal).toBe(sellPrice(commerce.basePrice));
  });

  it("multiplies by quantity and exposes an integer paise amount", () => {
    const commerce = getCommerce(SELLABLE.id)!;
    const totals = computeTotals({ items: [{ productId: SELLABLE.id, quantity: 3 }], pincode: "560001" });
    expect(totals.lines[0].lineTotal).toBe(sellPrice(commerce.basePrice) * 3);
    expect(Number.isInteger(totals.amountPaise)).toBe(true);
    expect(totals.amountPaise).toBe(Math.round(totals.grandTotal * 100));
  });
});

describe("computeTotals — four shipping zones resolve from the pincode", () => {
  const cases: { pincode: string; expectedRate: number; label: string }[] = [
    { pincode: "560001", expectedRate: 0, label: "Zone 1 — Bengaluru, free" },
    { pincode: "570001", expectedRate: 18000, label: "Zone 2 — rest of KA/TN" },
    { pincode: "500001", expectedRate: 28000, label: "Zone 3 — South India" },
    { pincode: "110001", expectedRate: 45000, label: "Zone 4 — rest of India" },
  ];
  for (const { pincode, expectedRate, label } of cases) {
    it(label, () => {
      const totals = computeTotals({ items: [{ productId: SELLABLE.id, quantity: 1 }], pincode });
      expect(totals.zone).not.toBeNull();
      expect(totals.shipping).toBe(expectedRate);
      expect(totals.payable).toBe(true);
      expect(totals.grandTotal).toBe(totals.itemsSubtotal + expectedRate);
    });
  }
});

describe("computeTotals — an invalid pincode is UNKNOWN, never free", () => {
  it("resolves no zone and refuses to be payable", () => {
    const totals = computeTotals({ items: [{ productId: SELLABLE.id, quantity: 1 }], pincode: "12" });
    expect(totals.zone).toBeNull();
    expect(totals.shipping).toBeNull(); // null = unknown, NOT 0
    expect(totals.payable).toBe(false);
  });

  it("with no pincode at all, shipping is unknown and not payable", () => {
    const totals = computeTotals({ items: [{ productId: SELLABLE.id, quantity: 1 }] });
    expect(totals.shipping).toBeNull();
    expect(totals.payable).toBe(false);
  });
});

describe("computeTotals — installation is optional and a separate line", () => {
  it("adds nothing when not selected (default off)", () => {
    const totals = computeTotals({ items: [{ productId: SELLABLE.id, quantity: 1 }], pincode: "560001" });
    expect(totals.installation).toBe(0);
  });

  it("adds exactly INSTALLATION.rate when selected, on top of items + freight", () => {
    const totals = computeTotals({
      items: [{ productId: SELLABLE.id, quantity: 1 }],
      pincode: "110001",
      wantsInstallation: true,
    });
    expect(totals.installation).toBe(INSTALLATION.rate);
    expect(totals.grandTotal).toBe(totals.itemsSubtotal + 45000 + INSTALLATION.rate);
  });
});

describe("computeTotals — a quote-only product can never be charged", () => {
  it("skips a non-purchasable SKU instead of pricing it", () => {
    const quoteOnly = getCommerce("10"); // Container Office (kind: custom) — quote-only by design
    expect(quoteOnly).toBeDefined();
    expect(isPurchasable("10")).toBe(false);
    const totals = computeTotals({ items: [{ productId: "10", quantity: 1 }], pincode: "560001" });
    expect(totals.lines).toHaveLength(0);
    expect(totals.skipped.map((s) => s.productId)).toContain("10");
    expect(totals.payable).toBe(false);
  });

  it("prices the purchasable line but skips the quote-only one in a mixed cart", () => {
    const totals = computeTotals({
      items: [{ productId: SELLABLE.id, quantity: 1 }, { productId: "10", quantity: 1 }],
      pincode: "560001",
    });
    expect(totals.lines).toHaveLength(1);
    expect(totals.skipped).toHaveLength(1);
    expect(totals.payable).toBe(false); // a skipped item blocks the whole order
  });

  it("treats an unknown product id as skipped", () => {
    const totals = computeTotals({ items: [{ productId: "does-not-exist", quantity: 1 }], pincode: "560001" });
    expect(totals.lines).toHaveLength(0);
    expect(totals.skipped).toHaveLength(1);
  });
});
