import { describe, it, expect } from "vitest";
import { SHIPPING_BLR_FAQS } from "./ShippingContainerBangaloreContent";
import { DISPATCH_WORKING_DAYS, FREE_DELIVERY_PIN_PREFIXES_TEXT, SHIPPING_ZONES } from "@/data/shippingZones";

/**
 * The Bangalore shipping-container page's delivery FAQ (also its FAQ JSON-LD) must agree with the
 * page's own delivery block and with checkout: dispatch window, the free zone's PIN codes and its
 * transit time. It used to say "transit typically taking 1–5 working days" (found in the #355 live check).
 */
describe("Bangalore shipping container FAQ — delivery answer matches checkout", () => {
  const faq = SHIPPING_BLR_FAQS.find((f) => f.question === "How long does delivery take in Bangalore?")!;
  const free = SHIPPING_ZONES.find((z) => z.rate === 0 && z.pincodePrefixes.length > 0)!;

  it("states the dispatch window, the free PIN codes and the free zone's transit time", () => {
    expect(faq.answer).toContain(`dispatched within ${DISPATCH_WORKING_DAYS.min}–${DISPATCH_WORKING_DAYS.max} working days`);
    expect(faq.answer).toContain(`PIN codes beginning ${FREE_DELIVERY_PIN_PREFIXES_TEXT} is free`);
    expect(faq.answer).toContain(`takes ${free.transitDaysMin}–${free.transitDaysMax} working days in transit`);
  });

  it("no longer claims a blanket 1–5 working-day transit", () => {
    expect(faq.answer).not.toMatch(/1–5 working days/);
  });
});
