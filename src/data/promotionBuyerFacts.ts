import { resolveCatalogueRows } from "./bangaloreContainerPrices";
import { products } from "./products";
import {
  DISPATCH_WORKING_DAYS,
  INSTALLATION,
  INSTALLATION_NOT_COVERED,
  INSTALLATION_SCOPE,
  SHIPPING_ZONES,
} from "./shippingZones";
import { formatINR } from "@/lib/pricing/gst";
import { COMPANY } from "@/lib/company";

/**
 * BUYER FACTS for selected promotion pages (SEO phase 2, owner brief 2026-11-26: "make the selected
 * pages more useful to buyers — verified specifications, size options, what's included in the price,
 * delivery and installation scope, and a clear quote or WhatsApp action").
 *
 * SOURCING RULE — nothing here is typed by hand that a buyer could act on:
 *   • configurations, product names, URLs and fixed GST-inclusive prices come from the catalogue at
 *     render (resolveCatalogueRows: products.ts + productCommerce.ts + sellPrice), and only products
 *     whose catalogue size IS the configuration a row names are listed (locked by the test);
 *   • specification rows are the product's own catalogue `specifications`, shown verbatim, limited to
 *     build facts (SPEC_LABELS) — never lifespans, performance figures, certifications or claims;
 *   • delivery, dispatch and installation come from src/data/shippingZones.ts — the same constants
 *     checkout charges from — so this block can never promise more than checkout sells.
 * Resolved on the SERVER (the promotion route) and passed to the client view as plain data, so the
 * catalogue is never shipped to the browser.
 */

export interface PromotionBuyerFactsData {
  place: string;
  rows: {
    type: string;
    items: { id: string; name: string; href: string; price: string; specs: { label: string; value: string }[] }[];
  }[];
  delivery: DeliveryInstallationData;
  whatsappUrl: string;
}

export interface DeliveryInstallationData {
  dispatch: string;
  freePins: string[];
  freeTransit: string;
  otherZones: { name: string; description: string; price: string; transit: string }[];
  installation: { label: string; price: string; scope: string[]; notCovered: string[] };
}

/** Catalogue specification labels that describe the BUILT unit. Anything else (expected life, design
 *  life, acoustic figures, delivery areas, "grades"…) stays on the product page, not here. */
export const SPEC_LABELS = /^(dimensions|size|priced configuration|configuration|floor area|frame|structural frame|wall panels|walls|roof|flooring|electricals?|windows|openings|doors|front|capacity|bunks|bathroom|kitchen|not in the price)$/i;

/** A build row is still left out when its text makes a claim awaiting the owner's evidence (e.g.
 *  "BIS-certified" — claims inventory E10) or a lifespan / warranty / percentage figure. */
export const SPEC_CLAIM = /certif|life|warrant|acoustic|cheaper|%|\byears?\b/i;

export const PROMOTION_BUYER_FACTS: Record<
  string,
  { place: string; rows: readonly { type: string; productIds: readonly string[] }[]; whatsappText: string }
> = {
  /* Portable cabins, Bengaluru (D1: Keep hub — linked from 11 Bengaluru city pages). Catalogue sizes:
   * 48 "10 ft × 10 ft (100 sq ft)" · 20 "15ft x 10ft" · 1 "20ft x 10ft x 9.5ft" · 46 "20 ft × 10 ft ×
   * 8.5 ft" · 7 "40ft x 10ft x 9.5ft" · 9 "40ft x 12ft x 9ft". "Custom sizes" listings are left out:
   * one price cannot stand for every size. */
  "portable-cabin-in-bangalore": {
    place: "Bengaluru",
    rows: [
      { type: "10 × 10 ft cabin (shop or kiosk)", productIds: ["48"] },
      { type: "15 × 10 ft site office cabin", productIds: ["20"] },
      { type: "20 × 10 ft office cabin", productIds: ["1", "46"] },
      { type: "40 × 10 ft bunkhouse (8–12 persons)", productIds: ["7"] },
      { type: "40 × 12 ft porta cabin", productIds: ["9"] },
    ],
    whatsappText: "Hi, I'd like a written quotation for a portable cabin in Bengaluru.",
  },
};

const days = (min: number, max: number) => (min === max ? `${min} working day${min === 1 ? "" : "s"}` : `${min}–${max} working days`);

/** Delivery and installation facts, straight from the checkout constants. */
export function deliveryInstallationFacts(): DeliveryInstallationData {
  const free = SHIPPING_ZONES.find((zone) => zone.rate === 0 && zone.pincodePrefixes.length > 0);
  return {
    dispatch: days(DISPATCH_WORKING_DAYS.min, DISPATCH_WORKING_DAYS.max),
    freePins: free ? [...free.pincodePrefixes] : [],
    freeTransit: free ? days(free.transitDaysMin, free.transitDaysMax) : "",
    otherZones: SHIPPING_ZONES.filter((zone) => zone !== free).map((zone) => ({
      name: zone.name.replace(/^Zone \d+\s*[—-]\s*/, ""),
      description: zone.description,
      price: `${formatINR(zone.rate)} incl. GST`,
      transit: days(zone.transitDaysMin, zone.transitDaysMax),
    })),
    installation: {
      label: INSTALLATION.label,
      price: `${formatINR(INSTALLATION.rate)} incl. GST`,
      scope: INSTALLATION_SCOPE.map((s) => s.text),
      notCovered: [...INSTALLATION_NOT_COVERED],
    },
  };
}

/** Buyer facts for a promotion slug, or null when that page has none configured. */
export function promotionBuyerFacts(slug: string): PromotionBuyerFactsData | null {
  const config = PROMOTION_BUYER_FACTS[slug];
  if (!config) return null;
  const rows = resolveCatalogueRows(config.rows).map((row) => ({
    type: row.type,
    items: row.items.map((item) => {
      const product = products.find((p) => String(p.id) === item.id);
      const specs = ((product?.specifications ?? []) as { label: string; value: string }[])
        .filter((s) => SPEC_LABELS.test(String(s.label).trim()) && !SPEC_CLAIM.test(`${s.label} ${s.value}`))
        .map((s) => ({ label: String(s.label), value: String(s.value) }));
      return { ...item, specs };
    }),
  }));
  return {
    place: config.place,
    rows,
    delivery: deliveryInstallationFacts(),
    whatsappUrl: `${COMPANY.whatsapp.url}?text=${encodeURIComponent(config.whatsappText)}`,
  };
}
