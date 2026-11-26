import { resolveCatalogueRows } from "./bangaloreContainerPrices";

/**
 * "Current prices for common configurations" on /blog/portable-cabin-manufacturers-in-bangalore (the
 * Bengaluru buyer's guide). The guide used to print market ranges ("₹80,000–1.2 lakh" guard booths,
 * "₹5–7 lakh" 20 ft offices, "₹12–18 lakh" 40 ft offices, "₹1,200–1,800/sq.ft.") that the catalogue did
 * not support (D6 review, 2026-11-26). Each row now links the EXACT catalogue products of the
 * configuration it names, with their own fixed GST-inclusive price, resolved at render — the same rule
 * as the Bangalore promotion's price table (#343). Only products whose catalogue size matches the row:
 *  - 20 × 10 ft portable cabin: 1 "Executive Portable Cabin 20ft" (20 × 10 × 9.5 ft),
 *    46 "Steel Portable Cabin" (20 × 10 × 8.5 ft);
 *  - 20 × 8 ft site office container: 2 "Standard Site Office Container" (20 × 8 × 8.5 ft);
 *  - 40 ft container office: 42 "Container Site Office" (40 × 10 ft), 41 "VIP Container Office" (40 ft),
 *    3 "Modern Container Office" (40 × 8 × 9.5 ft) — the same three as the Bangalore promotion;
 *  - 20 × 10 ft guard / security cabin: 6 "Guard Security Cabin" (20 × 10 × 8 ft);
 *  - 4-unit portable toilet block: 5 "Portable Toilet Block - 4 Unit" (20 × 8 × 8 ft).
 * "Custom sizes" listings are deliberately left out: one price cannot stand for every size.
 */
export const BENGALURU_GUIDE_ROWS: readonly { type: string; productIds: readonly string[] }[] = [
  { type: "20 × 10 ft portable cabin", productIds: ["1", "46"] },
  { type: "20 × 8 ft site office container", productIds: ["2"] },
  { type: "40 ft container office", productIds: ["42", "41", "3"] },
  { type: "20 × 10 ft guard / security cabin", productIds: ["6"] },
  { type: "Portable toilet block, 4 units (20 × 8 ft)", productIds: ["5"] },
];

export const bengaluruGuideRows = () => resolveCatalogueRows(BENGALURU_GUIDE_ROWS);
