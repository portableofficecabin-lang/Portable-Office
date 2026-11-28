import { describe, it, expect } from "vitest";
import { SHIPPING_BLR_FAQS } from "./ShippingContainerBangaloreContent";
import { pinPrefixList } from "./PromotionBuyerFacts";
import { DISPATCH_WORKING_DAYS, SHIPPING_ZONES, deliveryEstimate, resolveShippingZone } from "@/data/shippingZones";
import { generateFAQSchema } from "@/lib/seo/structured-data";

/**
 * The Bangalore shipping-container page's delivery FAQ (the visible accordion and the FAQ JSON-LD,
 * both built from SHIPPING_BLR_FAQS) must agree with checkout: the dispatch window, the free zone's
 * transit time, and which PIN codes deliver free. It used to say "transit typically taking 1–5 working
 * days" (found in the #355 live check). Owner wording (2026-11-27): "the 560, 562, 563 and 635 PIN-code
 * prefixes".
 */
describe("Bangalore shipping container FAQ — delivery answer matches checkout", () => {
  const faq = SHIPPING_BLR_FAQS.find((f) => f.question === "How long does delivery take in Bangalore?")!;
  const free = SHIPPING_ZONES.find((z) => z.rate === 0 && z.pincodePrefixes.length > 0)!;

  it("states the dispatch window checkout adds to transit", () => {
    expect(faq.answer).toContain(`dispatched within ${DISPATCH_WORKING_DAYS.min}–${DISPATCH_WORKING_DAYS.max} working days`);
    // Checkout's "Estimated delivery" for the free zone is dispatch + transit.
    expect(deliveryEstimate(free)).toEqual({
      min: DISPATCH_WORKING_DAYS.min + free.transitDaysMin,
      max: DISPATCH_WORKING_DAYS.max + free.transitDaysMax,
    });
  });

  it("names exactly the PIN-code prefixes checkout delivers free, in the owner's wording", () => {
    expect(pinPrefixList(free.pincodePrefixes)).toBe("560, 562, 563 and 635");
    expect(faq.answer).toContain("Delivery is free for the 560, 562, 563 and 635 PIN-code prefixes");
    // Each named prefix resolves to the free zone at checkout; a Karnataka PIN outside them does not.
    for (const prefix of free.pincodePrefixes) {
      const zone = resolveShippingZone(`${prefix}001`);
      expect(zone?.id).toBe(free.id);
      expect(zone?.rate).toBe(0);
    }
    expect(resolveShippingZone("561001")?.rate).toBeGreaterThan(0);
  });

  it("states the free zone's transit time from checkout", () => {
    expect(faq.answer).toContain(`takes ${free.transitDaysMin}–${free.transitDaysMax} working days in transit`);
    expect(faq.answer).not.toMatch(/1–5 working days/);
  });

  it("puts the same answer in the FAQ structured data as on the page", () => {
    const schema = generateFAQSchema(SHIPPING_BLR_FAQS);
    const entry = schema.mainEntity.find((q) => q.name === faq.question)!;
    expect(entry.acceptedAnswer.text).toBe(faq.answer);
  });
});
