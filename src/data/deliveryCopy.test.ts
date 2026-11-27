import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  FREE_DELIVERY_LINE,
  INSTALLATION_OPTION_LINE,
  OTHER_ZONES_LINE,
  QUOTED_MODELS_NOTE,
  WHATS_INCLUDED_CATEGORY_SLUGS,
  whatsIncludedGroups,
} from "./deliveryCopy";
import { FREE_DELIVERY_PIN_PREFIXES_TEXT, INSTALLATION, INSTALLATION_NOT_COVERED, INSTALLATION_SCOPE } from "./shippingZones";
import { CATEGORY_LANDING_SLUGS } from "./categoryLandings";
import { CARD_IMAGE_DISCLOSURE, RENDER_LABEL, getCardImageDisclosure, imageFileBasename } from "./productImageDisclosure";
import { getImageAltText, getImageLabel } from "./productImageCaptions";
import { formatINR, GST_PERCENT_LABEL } from "@/lib/pricing/gst";

/**
 * "What's included" on category pages (Search Console phase, 2026-11-27): every line must come
 * from shippingZones.ts — the table checkout charges from — so the block can never promise more
 * than the cart and checkout sell. The product-page pop-up prints the same shared lines.
 */
const ROOT = process.cwd();

describe("What's included block", () => {
  const groups = whatsIncludedGroups();
  const lines = groups.flatMap((g) => g.lines);

  it("delivery lines carry the checkout's free-delivery PIN prefixes and zone rule", () => {
    expect(FREE_DELIVERY_LINE).toBe(`Free delivery to PIN codes beginning ${FREE_DELIVERY_PIN_PREFIXES_TEXT}`);
    expect(groups.find((g) => g.kind === "delivery")!.lines).toEqual([FREE_DELIVERY_LINE, OTHER_ZONES_LINE]);
  });

  it("installation shows the checkout rate and exactly INSTALLATION_SCOPE", () => {
    expect(INSTALLATION_OPTION_LINE).toContain(formatINR(INSTALLATION.rate));
    expect(INSTALLATION_OPTION_LINE).toContain(`${GST_PERCENT_LABEL} GST`);
    expect(groups.find((g) => g.kind === "installation")!.lines).toEqual([
      INSTALLATION_OPTION_LINE,
      ...INSTALLATION_SCOPE.map((s) => `${s.title}: ${s.text}`),
    ]);
  });

  it("exclusions are exactly INSTALLATION_NOT_COVERED", () => {
    expect(groups.find((g) => g.kind === "excluded")!.lines).toEqual([...INSTALLATION_NOT_COVERED]);
  });

  it("states no ₹ figure other than the installation rate", () => {
    const rupees = lines.join(" ").match(/₹[\d,]+/g) ?? [];
    expect(rupees).toEqual([formatINR(INSTALLATION.rate)]);
    expect(QUOTED_MODELS_NOTE).not.toMatch(/₹/);
  });

  it("renders only on landing categories that exist", () => {
    expect(WHATS_INCLUDED_CATEGORY_SLUGS.length).toBeGreaterThan(0);
    for (const slug of WHATS_INCLUDED_CATEGORY_SLUGS) expect(CATEGORY_LANDING_SLUGS).toContain(slug);
  });

  it("the product-page pop-up prints the shared lines (no second copy of the wording)", () => {
    const modal = readFileSync(join(ROOT, "src/components/products/ShippingDeliveryModal.tsx"), "utf8");
    expect(modal).toContain("FREE_DELIVERY_LINE");
    expect(modal).toContain("OTHER_ZONES_LINE");
    expect(modal).not.toMatch(/"Free delivery to PIN codes beginning|"Other PIN codes: transport is charged/);
  });
});

describe("card image disclosure", () => {
  it("strips Next's asset content hash and query strings", () => {
    expect(imageFileBasename("/_next/static/media/standard-site-office-container.3f2a1b9c.webp")).toBe("standard-site-office-container.webp");
    expect(imageFileBasename("/images/products/guard-security-cabin-front.webp?v=2")).toBe("guard-security-cabin-front.webp");
    expect(getCardImageDisclosure("/_next/static/media/standard-site-office-container.3f2a1b9c.webp")?.label).toBe(RENDER_LABEL);
  });

  it("every listed image exists, renders are labelled and say so, the photograph is not labelled", () => {
    for (const [file, d] of Object.entries(CARD_IMAGE_DISCLOSURE)) {
      const exists = existsSync(join(ROOT, "public/images/products", file)) || existsSync(join(ROOT, "src/assets/products", file));
      expect({ file, exists }).toEqual({ file, exists: true });
      if (d.label) {
        expect(d.label).toBe(RENDER_LABEL);
        expect({ file, render: d.alt.startsWith("Illustrative render") }).toEqual({ file, render: true });
      } else {
        expect({ file, photo: d.alt.startsWith("Photograph") }).toEqual({ file, photo: true });
      }
    }
    expect(CARD_IMAGE_DISCLOSURE["container-site-office-main.webp"].label).toBeUndefined();
  });

  it("the product-page gallery uses the same alt text and label", () => {
    for (const [file, d] of Object.entries(CARD_IMAGE_DISCLOSURE)) {
      expect(getImageAltText(`/images/products/${file}`)).toBe(d.alt);
      expect(getImageLabel(`/images/products/${file}`)).toBe(d.label);
    }
  });
});
