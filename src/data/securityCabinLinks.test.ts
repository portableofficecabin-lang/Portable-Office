import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getProductBuyerGuide } from "./productBuyerGuides";

/**
 * Security cabins (Search Console phase, 2026-11-27): both model pages point to the category, which
 * owns "security cabin(s)"; /products/security-cabin gains a WhatsApp action; its two content images
 * are generated illustrations and say so, without a location claim.
 */
const content = readFileSync(join(process.cwd(), "src/components/products/SecurityCabinContent.tsx"), "utf8");

describe("security cabin pages", () => {
  it("/products/security-cabin offers WhatsApp and links the category", () => {
    expect(content).toContain("href={COMPANY.whatsapp.url}");
    expect(content).toMatch(/href="\/products\/category\/security-cabins"[^>]*>\s*security cabins\s*<\/Link>/);
  });

  it("its content images are captioned as illustrations with no location claim", () => {
    const alts = [...content.matchAll(/alt="([^"]+)"/g)].map((m) => m[1]);
    expect(alts.length).toBe(2);
    for (const alt of alts) {
      expect(alt.startsWith("Illustrative render")).toBe(true);
      expect(/Bangalore|India/.test(alt)).toBe(false);
    }
    expect((content.match(/<figcaption[^>]*>Illustrative render<\/figcaption>/g) ?? []).length).toBe(2);
  });

  it("the Guard Security Cabin guide links the category", () => {
    const guide = getProductBuyerGuide("6")!;
    const links = guide.sections.flatMap((s) => s.paragraphs ?? []).filter((p) => typeof p !== "string");
    expect(links.some((p) => typeof p !== "string" && p.link.href === "/products/category/security-cabins" && p.link.label === "security cabins")).toBe(true);
  });
});
