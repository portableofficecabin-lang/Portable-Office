import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PROMOTION_BUYER_FACTS, SPEC_LABELS, deliveryInstallationFacts, promotionBuyerFacts } from "./promotionBuyerFacts";
import { products, getProductDetailPath } from "./products";
import { getCommerce, isPurchasable } from "./productCommerce";
import { DISPATCH_WORKING_DAYS, INSTALLATION, INSTALLATION_NOT_COVERED, INSTALLATION_SCOPE, SHIPPING_ZONES } from "./shippingZones";
import { formatINR, sellPrice } from "@/lib/pricing/gst";
import { seoPromotions, getPromotionSlug } from "./seoPromotions";

/**
 * Buyer facts on promotion pages (SEO phase 2) may only show: exact catalogue products of the
 * configuration a row names, at their own fixed GST-inclusive price; each product's own catalogue
 * build specification; and the checkout's delivery / installation constants.
 */
const byId = (id: string) => products.find((p) => String(p.id) === id)!;
const size = (id: string) => String(getCommerce(id)?.size ?? "");
/** "10 × 10 ft …" → [10, 10]; the first two dimensions of a row label or a catalogue size. */
const dims = (s: string) => (s.match(/(\d{1,2})\s*(?:ft|feet)?\s*[x×]\s*(\d{1,2})/i) ?? []).slice(1, 3).map(Number);

describe("promotion buyer facts — catalogue and checkout data only", () => {
  it("configured slugs are real promotion pages", () => {
    const slugs = new Set(seoPromotions.map((p) => getPromotionSlug(p.keyword, p.location)));
    for (const slug of Object.keys(PROMOTION_BUYER_FACTS)) expect(slugs.has(slug)).toBe(true);
  });

  it("every listed product exists, is purchasable, links its live URL and shows its catalogue price", () => {
    for (const slug of Object.keys(PROMOTION_BUYER_FACTS)) {
      const facts = promotionBuyerFacts(slug)!;
      expect(facts.rows.length).toBe(PROMOTION_BUYER_FACTS[slug].rows.length);
      for (const row of facts.rows) {
        const ids = PROMOTION_BUYER_FACTS[slug].rows.find((r) => r.type === row.type)!.productIds;
        expect(row.items.map((i) => i.id)).toEqual([...ids]);
        for (const item of row.items) {
          expect(isPurchasable(item.id)).toBe(true);
          expect(item.href).toBe(getProductDetailPath(byId(item.id)));
          expect(item.price).toBe(formatINR(sellPrice(getCommerce(item.id)!.basePrice)));
        }
      }
    }
  });

  it("each row lists only products whose catalogue size is the configuration the row names", () => {
    for (const config of Object.values(PROMOTION_BUYER_FACTS)) {
      for (const row of config.rows) {
        const want = dims(row.type);
        expect(want.length).toBe(2);
        for (const id of row.productIds) {
          expect(/custom/i.test(size(id))).toBe(false);
          expect({ row: row.type, id, size: size(id), dims: dims(size(id)) }).toEqual({ row: row.type, id, size: size(id), dims: want });
        }
      }
    }
  });

  it("specifications are the catalogue's own build rows, verbatim — no lifespan, claim or performance row", () => {
    for (const slug of Object.keys(PROMOTION_BUYER_FACTS)) {
      for (const item of promotionBuyerFacts(slug)!.rows.flatMap((r) => r.items)) {
        const catalogue = (byId(item.id).specifications ?? []) as { label: string; value: string }[];
        for (const s of item.specs) {
          expect(SPEC_LABELS.test(s.label)).toBe(true);
          expect(catalogue.some((c) => c.label === s.label && c.value === s.value)).toBe(true);
          expect(/life|warrant|certif|acoustic|cheaper|%|years?\b/i.test(`${s.label} ${s.value}`)).toBe(false);
        }
      }
    }
  });

  it("delivery and installation come straight from the checkout constants", () => {
    const d = deliveryInstallationFacts();
    expect(d.dispatch).toBe(`${DISPATCH_WORKING_DAYS.min}–${DISPATCH_WORKING_DAYS.max} working days`);
    const free = SHIPPING_ZONES.find((z) => z.rate === 0 && z.pincodePrefixes.length > 0)!;
    expect(d.freePins).toEqual([...free.pincodePrefixes]);
    expect(d.otherZones.map((z) => z.price)).toEqual(SHIPPING_ZONES.filter((z) => z !== free).map((z) => `${formatINR(z.rate)} incl. GST`));
    expect(d.installation.price).toBe(`${formatINR(INSTALLATION.rate)} incl. GST`);
    expect(d.installation.scope).toEqual(INSTALLATION_SCOPE.map((s) => s.text));
    expect(d.installation.notCovered).toEqual([...INSTALLATION_NOT_COVERED]);
  });

  it("the client view imports only types from the data module (the catalogue never ships to the browser)", () => {
    for (const file of ["src/views/SEOPromotionPage.tsx", "src/components/promotions/PromotionBuyerFacts.tsx"]) {
      const src = readFileSync(file, "utf8");
      expect(/import\s+\{[^}]*\}\s+from\s+"@\/data\/promotionBuyerFacts"/.test(src)).toBe(false);
      expect(/from\s+"@\/data\/products"/.test(src)).toBe(false);
    }
  });
});
