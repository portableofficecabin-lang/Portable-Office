import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { stripComments } from "./cityBlocks";

/**
 * Product templates (every product page and every size-variant page) must not state the ISO 9001
 * certification or an "ISO-Grade" steel grade while no evidence is on record: no certificate copy,
 * certifying body, scope or validity (claims inventory E1), and "ISO grade" is not a steel grade
 * (claims inventory D, row "ProductDetailServer:526"). IsoCertificationBadge.tsx is kept so the
 * badge can be restored; if the owner supplies a current certificate, revert this guard together
 * with the template change.
 */
const TEMPLATES = ["src/views/ProductDetailServer.tsx", "src/views/ProductVariantView.tsx"];

const CLAIMS: RegExp[] = [/\bISO\s*9001/i, /QT-99968/, /\bisoCertificate\b/, /\bIsoCertificationBadge\b/, /\bISO[- ]?grade\b/i];

describe("product templates state no unverified ISO claim", () => {
  it("ProductDetailServer and ProductVariantView", () => {
    for (const file of TEMPLATES) {
      const code = stripComments(readFileSync(file, "utf8"));
      const found = CLAIMS.filter((re) => re.test(code)).map((re) => re.source);
      expect({ file, found }).toEqual({ file, found: [] });
    }
  });

  it("the Steel Grade row keeps its verified sheet standards", () => {
    const code = stripComments(readFileSync("src/views/ProductDetailServer.tsx", "utf8"));
    expect(code).toContain("MS CR Sheet / CRCA Sheet — IS 513 &amp; IS 2062 · Corten");
  });
});
