import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { stripComments } from "../seo/cityBlocks";

/**
 * The three PDF generators must not print the ISO 9001:2015 certification claim (claims inventory
 * E1, docs/claims/sitewide-claims-2026-11-26.md): no certificate copy, certification body, scope or
 * validity is on record. Covers the admin quotation / proforma / invoice / challan PDF and its
 * on-screen preview, the admin warranty certificate PDF and its preview, and the public cabin
 * calculator's estimate PDF.
 *
 * Comments are stripped first, so a note recording the removal does not count as the claim. If the
 * owner supplies a current certificate, revert this guard together with the wording.
 */
const PDF_FILES = [
  "src/views/admin/QuotationPro.tsx",
  "src/views/admin/WarrantyCertificate.tsx",
  "src/components/home/cabin-calculator/CabinCalculator.tsx",
];

const CERT_CLAIM: RegExp[] = [
  /\bISO\s*9001/i,
  /QT-99968/,
  /Certified Company/i,
  /Quality Management System/i,
  /\bisoCertificate\b/,
  /\bIsoCertificationBadge\b/,
];

describe("PDF generators print no unverified certification claim", () => {
  it("quotation, warranty certificate and cabin calculator", () => {
    for (const file of PDF_FILES) {
      const code = stripComments(readFileSync(file, "utf8"));
      const found = CERT_CLAIM.filter((re) => re.test(code)).map((re) => re.source);
      expect({ file, found }).toEqual({ file, found: [] });
    }
  });
});
