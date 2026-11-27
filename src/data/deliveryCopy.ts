/**
 * DELIVERY & INSTALLATION LINES shared by the product-page Shipping & Delivery pop-up
 * (ShippingDeliveryModal) and the "What's included" block on category pages (WhatsIncluded).
 *
 * Every figure is read from src/data/shippingZones.ts — the table checkout itself charges from —
 * so a page can never promise a different delivery charge, zone or installation price than the
 * cart and checkout. These strings were moved here verbatim from ShippingDeliveryModal.tsx
 * (2026-11-27) so both places print the identical sentence.
 */
import { FREE_DELIVERY_PIN_PREFIXES_TEXT, INSTALLATION, INSTALLATION_NOT_COVERED, INSTALLATION_SCOPE } from "@/data/shippingZones";
import { formatINR, GST_PERCENT_LABEL } from "@/lib/pricing/gst";

/** Zone 1 — the PIN-code prefixes checkout delivers free. */
export const FREE_DELIVERY_LINE = `Free delivery to PIN codes beginning ${FREE_DELIVERY_PIN_PREFIXES_TEXT}`;

/** Every other zone — charged by zone, shown at checkout before payment. */
export const OTHER_ZONES_LINE = "Other PIN codes: transport is charged by delivery zone and shown at checkout before you pay";

/** The paid checkout option (bought-online products), priced from INSTALLATION. */
export const INSTALLATION_OPTION_LINE = `Optional ${INSTALLATION.label.toLowerCase()}: ${formatINR(INSTALLATION.rate)} including ${GST_PERCENT_LABEL} GST, added at checkout`;

/** Rentals and quote-only products: installation is part of the written quotation. */
export const INSTALLATION_BY_QUOTATION_LINE = "Installation: set out in your written quotation";

/** Quote-only products: transport is part of the written quotation. */
export const TRANSPORT_BY_QUOTATION_LINE = "Transport: confirmed in your written quotation";

/* ──────────────────────────────────────────────────────────────────────────────────────────────
 *  "WHAT'S INCLUDED" — category pages (Search Console phase, 2026-11-27)
 * ────────────────────────────────────────────────────────────────────────────────────────────── */

/** Category landing pages that show the "What's included" block (8b's first-five spec). */
export const WHATS_INCLUDED_CATEGORY_SLUGS: readonly string[] = [
  "site-office-containers",
  "portable-toilet-cabins",
  "security-cabins",
];

export interface WhatsIncludedGroup {
  title: string;
  kind: "included" | "delivery" | "installation" | "excluded";
  lines: string[];
}

/**
 * The block's content, built ONLY from the lines above and shippingZones.ts — no new delivery or
 * installation wording. The note for rental / "Price on request" models is QUOTED_MODELS_NOTE
 * below: those are quoted in writing rather than charged at checkout.
 */
export function whatsIncludedGroups(): WhatsIncludedGroup[] {
  return [
    {
      title: "In the listed price",
      kind: "included",
      lines: [
        "The model as specified on its product page — the specifications listed there describe the unit you receive",
        `${GST_PERCENT_LABEL} GST: every price shown is GST-inclusive`,
      ],
    },
    { title: "Delivery", kind: "delivery", lines: [FREE_DELIVERY_LINE, OTHER_ZONES_LINE] },
    {
      title: "Optional installation",
      kind: "installation",
      lines: [INSTALLATION_OPTION_LINE, ...INSTALLATION_SCOPE.map((s) => `${s.title}: ${s.text}`)],
    },
    { title: "Not included", kind: "excluded", lines: [...INSTALLATION_NOT_COVERED] },
  ];
}

/** Shown under the block when a rental or "Price on request" model is listed. */
export const QUOTED_MODELS_NOTE = `Rental and "Price on request" models: ${TRANSPORT_BY_QUOTATION_LINE.charAt(0).toLowerCase()}${TRANSPORT_BY_QUOTATION_LINE.slice(1)}; ${INSTALLATION_BY_QUOTATION_LINE.charAt(0).toLowerCase()}${INSTALLATION_BY_QUOTATION_LINE.slice(1)}.`;
