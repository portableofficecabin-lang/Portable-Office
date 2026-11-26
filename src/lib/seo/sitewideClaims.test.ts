import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { stripComments } from "./cityBlocks";

/**
 * Site-wide copy and structured data must not state claims nothing on record supports (removed
 * 2026-11-26; inventory and evidence in docs/claims/sitewide-claims-2026-11-26.md):
 * "India's leading / trusted / most trusted", "Industry Leader", "Industry-Leading", "60% cheaper",
 * "500+ projects / cabins / cities", "98% happy clients", "15+ years", "2 Factories", deliveries to
 * "government agencies", "since the 2010s", "40+ industrial hubs" and "ISO-grade" containers.
 *
 * Comments are stripped first, so a note recording what was removed does not count as the claim.
 * Not covered here: the ISO 9001:2015 certificate and the client logos (waiting for the owner's
 * evidence), and product, category and Merchant-feed files (owned by the product SEO work).
 */
const FILES = [
  "app/layout.tsx",
  "app/(site)/careers/page.tsx",
  "src/components/home/HeroSection.tsx",
  "src/components/home/WhatSetsUsApart.tsx",
  "src/components/home/CTASection.tsx",
  "src/components/home/WhyChooseUs.tsx",
  "src/components/home/InternalLinkingHub.tsx",
  "src/views/About.tsx",
  "src/views/Careers.tsx",
  "src/views/Blog.tsx",
  "src/views/blog/MSPortableCabinBlog.tsx",
  "src/views/blog/PortaCabinsOnRent.tsx",
  "src/views/blog/PortableCabinManufacturersBangalore.tsx",
  "src/views/blog/PrefabLabourColonyBengaluru.tsx",
  "src/views/blog/LabourShedPrefabricatedStructures.tsx",
  "src/utils/imageGeoTagging.ts",
  "src/lib/seo/structured-data.ts",
];

const BANNED: RegExp[] = [
  /india(&apos;|'|’)?s (leading|trusted|most trusted)/i,
  /one of india(&apos;|'|’)?s most trusted/i,
  /\bindustry[- ]lead/i,
  /\bindustry leader\b/i,
  /\b(a|one of the) leading (portable|manufacturer)/i,
  /^\s*"?leading (portable|manufacturer)/im,
  /\b\d+\s*%\s*cheaper/i,
  /\b500\s*\+/,
  /\b98\s*%/,
  // Business age only; product lifespans ("8–15+ year lifespan") are a separate, product-level question.
  /\b15\s*\+\s*years?\s+(of\s+)?(experience|in business|delivering|building|manufacturing)/i,
  /over 15 years/i,
  /\bhappy clients\b/i,
  /government agenc/i,
  // The company's age only; "demand has grown … since the early 2010s" is market context.
  /(delivering|experience|operating|in business)[^.]{0,80}since (the )?(early )?20[01]0s/i,
  /experience since/i,
  /national teams of experts/i,
  /\bISO[- ]grade\b/i,
  /\b40\s*\+\s*industrial hubs/i,
];

/** Sentences left for the owner's decision (listed in the claims inventory, not yet removed). */
const PENDING_OWNER: Record<string, string[]> = {
  "src/views/blog/PrefabLabourColonyBengaluru.tsx": [
    // C-21: names another company as "a leading manufacturer"; keep or remove is the owner's call.
    "Industrial Foams Private Limited is also a leading manufacturer",
    // C-22: a capacity statement (colonies of 20–30 up to 500+ workers), not a delivery count.
    "large-scale developments housing 500+ workers",
  ],
};

function claimsIn(text: string): string[] {
  return BANNED.filter((re) => re.test(text)).map((re) => re.source);
}

describe("site-wide copy states no unsupported claims", () => {
  it("homepage, about, careers, blog, metadata and structured-data sources", () => {
    for (const file of FILES) {
      let code = stripComments(readFileSync(file, "utf8"));
      for (const pending of PENDING_OWNER[file] ?? []) {
        expect({ file, pending, present: code.includes(pending) }).toEqual({ file, pending, present: true });
        code = code.split(pending).join("");
      }
      expect({ file, claims: claimsIn(code) }).toEqual({ file, claims: [] });
    }
  });

  it("public/llms.txt", () => {
    expect(claimsIn(readFileSync("public/llms.txt", "utf8"))).toEqual([]);
  });

  it("the homepage hero no longer shows the unsupported stats and keeps four facts", () => {
    const hero = stripComments(readFileSync("src/components/home/HeroSection.tsx", "utf8"));
    for (const gone of [">2<", "Factories", "Cabins Delivered", "Years in Business"]) {
      expect({ gone, found: hero.includes(gone) }).toEqual({ gone, found: false });
    }
    expect(hero).toContain("heroFacts.map");
    expect(hero).toContain("DISPATCH_WORKING_DAYS");
  });

  it("the About page has no unverified timeline", () => {
    const about = stripComments(readFileSync("src/views/About.tsx", "utf8"));
    expect(about).not.toContain("milestones");
    expect(about).not.toContain("Our Journey");
  });
});
