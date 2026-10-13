/**
 * Data for the container-offices category landing content — kept apart from the component so the
 * category route can build its metadata and JSON-LD from exactly the same functions the page
 * renders from. Read the source-of-truth notes at the top of ContainerOfficesCategoryContent.tsx.
 */

import { getProductDetailPath, type Product } from "@/data/products";
import { getCommerce, isOutrightSale } from "@/data/productCommerce";
import { formatINR, sellPrice } from "@/lib/pricing/gst";
import { DISPATCH_WORKING_DAYS, INSTALLATION, SHIPPING_ZONES } from "@/data/shippingZones";
import { COMPANY, formatAddress } from "@/lib/company";
import { CITY_PAGES } from "@/data/cityPages";

export const CONTAINER_OFFICES_SLUG = "container-offices";

/**
 * SKUs in this category that are NOT steel container offices. "Office Cabins" (POC-CO-CABIN) is a
 * glass-partition cabin installed INSIDE an existing building — its own record says "Steel Frame with
 * Glass Partitions", "Indoor Workspaces". It stays in the models table (it is listed in this category
 * and sold at this price), but it is kept out of the container-office price range and the steel
 * specification comparison, which would otherwise describe it as something it is not. Keyed by SKU,
 * the stable commerce identity. Remove the entry if the product is ever moved to another category.
 */
const NOT_A_STEEL_CONTAINER_UNIT = new Set<string>(["POC-CO-CABIN"]);

/** One row of the category's live model table. */
export interface ContainerOfficeModel {
  id: string;
  sku: string;
  /** Card / catalogue name — the same anchor text the product grid uses. */
  name: string;
  /** Canonical product URL path (handles nested product-child URLs). */
  path: string;
  size: string;
  material: string;
  bestFor: string;
  /** GST-inclusive selling price — identical to the card, product page, JSON-LD, cart and feed. */
  price: number;
  steelUnit: boolean;
  specs: { label: string; value: string }[];
}

/** The category's purchasable models, cheapest first, read from the catalogue + commerce records. */
export function containerOfficeModels(products: Product[]): ContainerOfficeModel[] {
  return products
    .filter((p) => p.categorySlug === CONTAINER_OFFICES_SLUG && isOutrightSale(p.id))
    .map((p) => {
      const c = getCommerce(p.id)!;
      return {
        id: p.id,
        sku: c.sku,
        name: p.name,
        path: getProductDetailPath(p),
        size: c.size,
        material: c.material,
        bestFor: c.bestFor,
        price: sellPrice(c.basePrice),
        steelUnit: !NOT_A_STEEL_CONTAINER_UNIT.has(c.sku),
        specs: p.specifications.map((s) => ({ label: s.label, value: s.value })),
      };
    })
    .sort((a, b) => a.price - b.price);
}

/** First specification row whose label matches one of `labels`, else an em dash (never a guess). */
export function specValue(model: ContainerOfficeModel, labels: string[]): string {
  const row = model.specs.find((s) => labels.includes(s.label));
  return row ? row.value : "—";
}

/** The steel models that illustrate each construction method, found from their own material field. */
export function constructionExamples(models: ContainerOfficeModel[]) {
  const steel = models.filter((m) => m.steelUnit);
  return {
    shell: steel.find((m) => /container shell/i.test(m.material)),
    fabricated: steel.find((m) => /ISMB|ISMC/i.test(m.material)),
  };
}

/** Freight wording for one zone, from the checkout table. */
export const freightLabel = (rate: number) => (rate === 0 ? "Free" : `${formatINR(rate)} incl. GST`);

/** "₹2,83,200 to ₹18,88,000", or one figure when there is one model. */
export function priceBand(models: ContainerOfficeModel[]): string | null {
  const steel = models.filter((m) => m.steelUnit);
  if (!steel.length) return null;
  const lo = steel[0].price;
  const hi = steel[steel.length - 1].price;
  return lo === hi ? formatINR(lo) : `${formatINR(lo)} to ${formatINR(hi)}`;
}

export const zone1 = SHIPPING_ZONES.find((z) => z.rate === 0);
const paidZones = SHIPPING_ZONES.filter((z) => z.rate > 0);
export const maxFreight = paidZones.length ? Math.max(...paidZones.map((z) => z.rate)) : 0;
export const dispatch = `${DISPATCH_WORKING_DAYS.min}–${DISPATCH_WORKING_DAYS.max} working days`;
export const factory = COMPANY.addresses.tamilNaduFactory;
export const office = COMPANY.addresses.bangaloreOffice;

/** Meta description for the category route — built from the same models, so its price cannot drift. */
export function containerOfficesMetaDescription(products: Product[]): string {
  const steel = containerOfficeModels(products).filter((m) => m.steelUnit);
  const from = steel.length ? ` from ${formatINR(steel[0].price)}` : "";
  return `Steel container offices built at our Tamil Nadu factory near Hosur. Compare ${steel.length} models, fixed GST-inclusive prices${from}, specs and delivery.`;
}

/** FAQ — rendered on the page as H3 blocks AND injected verbatim as FAQPage JSON-LD. */
export function containerOfficeFaqs(products: Product[]): { question: string; answer: string }[] {
  const models = containerOfficeModels(products);
  const steel = models.filter((m) => m.steelUnit);
  const band = priceBand(models);
  const list = steel.map((m) => `${m.name}, ${m.size}: ${formatINR(m.price)}`).join("; ");
  const sizes = steel.map((m) => `${m.name} ${m.size}`).join("; ");
  const { shell, fabricated } = constructionExamples(models);
  return [
    {
      question: "What is the price of a container office in India?",
      answer:
        `Our listed steel container offices cost ${band ?? "a fixed price shown on each model"} including 18% GST: ${list}. `
        + `That is the price of the unit. Transport is charged by delivery pincode: ${zone1 ? `free in ${zone1.name}, and ` : ""}up to ${formatINR(maxFreight)} incl. GST elsewhere in India. `
        + `Installation is an optional ${formatINR(INSTALLATION.rate)} incl. GST. Both are shown at checkout before you pay.`,
    },
    {
      question: "What container office sizes can I buy?",
      answer:
        `The fixed-price sizes are: ${sizes}. Other sizes and layouts are built to order against a written quotation and drawing rather than sold online.`,
    },
    {
      question: "Is the price inclusive of GST?",
      answer:
        "Yes. Every price on this page and on the product pages includes 18% GST, and it is the amount charged at checkout for the unit. The GST tax invoice shows the taxable value and the GST separately.",
    },
    {
      question: "What is the difference between a converted shipping container and a fabricated container office?",
      answer:
        "A converted container office starts from an ISO shipping container shell, so its corrugated steel walls carry the structure and its size is fixed by the container (20 ft or 40 ft long, 8 ft wide). A fabricated container office is built on a purpose-made steel frame and clad with insulated panels or sheets, so it can be wider or a non-standard length."
        + (shell ? ` The ${shell.name} is built on a ${shell.material.toLowerCase()}.` : "")
        + (fabricated ? ` The ${fabricated.name} is fabricated from ${fabricated.material.replace(/^Heavy-Duty /, "heavy-duty ").replace(/ Sections$/, " sections")}.` : ""),
    },
    {
      question: "How long does delivery take?",
      answer:
        `Manufacturing and dispatch take ${dispatch} after the order is confirmed and paid. Transit then depends on the delivery zone: `
        + SHIPPING_ZONES.map((z) => `${z.name}: ${z.transitDaysMin}–${z.transitDaysMax} days`).join("; ")
        + ".",
    },
    {
      question: "Do you install the container office at my site?",
      answer:
        `Yes, as an optional checkout line of ${formatINR(INSTALLATION.rate)} incl. GST. ${INSTALLATION.description} Without it, unloading and positioning at the site are arranged by the buyer.`,
    },
    {
      question: "Can I pay online?",
      answer:
        "Yes. Fixed-price models are paid in full at checkout through Razorpay by UPI, credit or debit card, or net banking. There is no advance or part-payment option for online orders. Custom builds follow the quotation route, which requires an advance of 40–50% before manufacturing starts.",
    },
    {
      question: "Can I cancel or return a container office?",
      answer:
        "An order can be cancelled for a full refund within 48 hours of confirmation, provided manufacturing has not started. Because each unit is manufactured to order, a delivered unit is not returnable; damage or defects present on delivery are handled under the Refund & Cancellation Policy.",
    },
    {
      question: "Where are your container offices manufactured?",
      answer:
        `At our factory at ${formatAddress(factory)}. Our Bangalore office is at Electronic City Phase 1, Bengaluru ${office.postalCode}.`,
    },
  ];
}

/** Container-office city landing pages, for the "by location" links (read from the city catalogue). */
export function containerOfficeCityLinks(): { href: string; label: string }[] {
  return CITY_PAGES.filter((c) => c.slug.includes("container-office")).map((c) => ({
    href: `/cities-we-serve/${c.slug}`,
    label:
      c.listTitle
      ?? (/^near\b/i.test(c.city) ? `Container Office ${c.city.replace(/^near/i, "near")}` : `Container Office in ${c.city}`),
  }));
}
