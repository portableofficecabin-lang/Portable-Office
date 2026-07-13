/**
 * Zone-based transport (freight) rates, resolved from the delivery pincode at checkout.
 *
 * OWNER: this is the file you edit to change freight pricing. Nothing else needs touching —
 * the checkout, the order total, the Merchant feed <g:shipping> block and the Shipping &
 * Delivery page all read from here, so they can never disagree with each other.
 *
 * Rates are INCLUSIVE of GST, because every price the customer sees on this site is
 * GST-inclusive (see src/lib/pricing/gst.ts).
 *
 * Installation is deliberately NOT bundled in here — it is a separate, optional line item
 * at checkout (see INSTALLATION).
 */

export interface ShippingZone {
  id: string;
  name: string;
  /** Shown to the customer at checkout and on the Shipping & Delivery page. */
  description: string;
  /** Freight charge in INR, GST-inclusive. 0 = genuinely free (do not use 0 as "unknown"). */
  rate: number;
  /** Delivery estimate AFTER dispatch, in days — the transit leg only. */
  transitDaysMin: number;
  transitDaysMax: number;
  /**
   * Pincode prefixes routed to this zone. Matched longest-prefix-first, so a more specific
   * prefix always wins over a shorter one. Zone 1 is listed by its exact local prefixes.
   */
  pincodePrefixes: string[];
}

/**
 * Dispatch (manufacturing) lead time, in WORKING days, before transit begins.
 * This is the figure published across the site — keep them in step.
 */
export const DISPATCH_WORKING_DAYS = { min: 7, max: 15 } as const;

/**
 * Optional on-site installation. Charged only if the customer opts in at checkout.
 * GST-inclusive. Set to null to remove the option from checkout entirely.
 */
export const INSTALLATION = {
  label: "On-site installation & positioning",
  description:
    "Our team levels the base, positions the unit and completes handover. Crane/hydra charges at site are included for standard single-unit placements.",
  rate: 15000,
} as const;

/**
 * ZONE 1 IS GENUINELY FREE — owner-confirmed. Free delivery within ~50 km of the facility.
 * Do not set a zone's rate to 0 unless delivery there really is free of charge.
 */
export const SHIPPING_ZONES: ShippingZone[] = [
  {
    id: "zone-1",
    name: "Zone 1 — Local (within ~50 km)",
    description: "Free delivery within approximately 50 km of our facility.",
    rate: 0,
    transitDaysMin: 1,
    transitDaysMax: 2,
    // Bengaluru + Hoskote/Kolar belt and the Hosur/Krishnagiri belt around the two factories.
    pincodePrefixes: ["560", "562", "563", "635"],
  },
  {
    id: "zone-2",
    name: "Zone 2 — Karnataka & Tamil Nadu",
    description: "Rest of Karnataka and Tamil Nadu.",
    rate: 18000,
    transitDaysMin: 2,
    transitDaysMax: 4,
    pincodePrefixes: ["56", "57", "58", "59", "60", "61", "62", "63", "64"],
  },
  {
    id: "zone-3",
    name: "Zone 3 — South India",
    description: "Andhra Pradesh, Telangana, Kerala and Puducherry.",
    rate: 28000,
    transitDaysMin: 3,
    transitDaysMax: 5,
    pincodePrefixes: ["50", "51", "52", "53", "67", "68", "69"],
  },
  {
    id: "zone-4",
    name: "Zone 4 — Rest of India",
    description: "All other serviceable pincodes across India.",
    rate: 45000,
    transitDaysMin: 5,
    transitDaysMax: 10,
    pincodePrefixes: [], // fallback — see resolveShippingZone()
  },
];

/** The zone used when no prefix matches. Must be one of SHIPPING_ZONES. */
export const FALLBACK_ZONE_ID = "zone-4";

/**
 * Resolve a 6-digit Indian pincode to a zone. Longest matching prefix wins, so "560"
 * (Zone 1) beats "56" (Zone 2) for a Bengaluru address.
 *
 * Returns null for anything that is not a well-formed 6-digit pincode, so the caller can
 * ask the customer to correct it rather than silently charging a fallback rate.
 */
export function resolveShippingZone(pincode: string): ShippingZone | null {
  const digits = (pincode || "").trim();
  if (!/^\d{6}$/.test(digits)) return null;

  let best: ShippingZone | null = null;
  let bestLength = -1;
  for (const zone of SHIPPING_ZONES) {
    for (const prefix of zone.pincodePrefixes) {
      if (digits.startsWith(prefix) && prefix.length > bestLength) {
        best = zone;
        bestLength = prefix.length;
      }
    }
  }
  return best ?? SHIPPING_ZONES.find((z) => z.id === FALLBACK_ZONE_ID) ?? null;
}

/** Total delivery window (dispatch + transit) for a zone, in days — for display. */
export function deliveryEstimate(zone: ShippingZone): { min: number; max: number } {
  return {
    min: DISPATCH_WORKING_DAYS.min + zone.transitDaysMin,
    max: DISPATCH_WORKING_DAYS.max + zone.transitDaysMax,
  };
}
