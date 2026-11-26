import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { GUIDE_MOVES, GUIDES_PATH } from "./guideMoves";
import { allChildParams, allGuidePages, childPagePath, getChildGroup, getChildPage, getGuidePage } from "./productChildPages";
import sitemap from "../../app/sitemap";

/**
 * D5 — portable-cabin guides moved to /guides. Checks the registry helpers, the one-hop 301s in
 * next.config.ts (read as text, like scripts/product-variants.test.ts), the sitemap and every
 * internal link in the source tree.
 */

const ROOT = process.cwd();
const SITE = "https://portableofficecabin.com";
const config = readFileSync(join(ROOT, "next.config.ts"), "utf8");

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(tsx?|mjs|json)$/.test(entry)) out.push(full);
  }
  return out;
}

describe("D5 guide moves", () => {
  it("moves exactly the eight informational portable-cabin guides, each to a unique portable-cabin-* slug", () => {
    expect(GUIDE_MOVES.length).toBe(8);
    const group = getChildGroup("portable-cabin")!;
    for (const m of GUIDE_MOVES) {
      expect({ child: m.childSlug, inRegistry: group.children.some((c) => c.slug === m.childSlug) }).toEqual({ child: m.childSlug, inRegistry: true });
      expect(m.guideSlug.startsWith("portable-cabin-")).toBe(true);
    }
    expect(new Set(GUIDE_MOVES.map((m) => m.guideSlug)).size).toBe(8);
    // The three commercial-intent children stay nested.
    for (const kept of ["with-toilet-and-pantry", "for-schools-and-classrooms", "insulation-and-cooling"]) {
      expect(getChildPage("portable-cabin", kept)).toBeDefined();
    }
  });

  it("a moved guide is served at /guides only, with its content unchanged", () => {
    const nested = new Set(allChildParams().map((p) => `${p.slug}/${p.child}`));
    for (const m of GUIDE_MOVES) {
      expect(nested.has(`${m.parentSlug}/${m.childSlug}`)).toBe(false);
      expect(getChildPage(m.parentSlug, m.childSlug)).toBeUndefined();
      const hit = getGuidePage(m.guideSlug)!;
      const original = getChildGroup(m.parentSlug)!.children.find((c) => c.slug === m.childSlug)!;
      expect({ slug: m.guideSlug, h1: hit.page.h1, title: hit.page.title }).toEqual({ slug: m.guideSlug, h1: original.h1, title: original.title });
      expect(childPagePath(hit.group, hit.page)).toBe(`${GUIDES_PATH}/${m.guideSlug}`);
    }
    expect(allGuidePages().length).toBe(8);
  });

  it("next.config.ts 301s each old URL and its legacy-extension form straight to /guides, above the generic rule", () => {
    const generic = config.indexOf(`{ source: "/products/:slug.html"`);
    expect(generic).toBeGreaterThan(0);
    for (const m of GUIDE_MOVES) {
      const old = `/products/${m.parentSlug}/${m.childSlug}`;
      for (const source of [old, `${old}.html`]) {
        const rule = `{ source: "${source}", destination: "${GUIDES_PATH}/${m.guideSlug}", statusCode: 301 }`;
        const at = config.indexOf(rule);
        expect({ source, present: at > 0, beforeGeneric: at > 0 && at < generic }).toEqual({ source, present: true, beforeGeneric: true });
      }
    }
  });

  it("the sitemap lists /guides and every moved guide, and none of the retired URLs", async () => {
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain(`${SITE}${GUIDES_PATH}`);
    for (const m of GUIDE_MOVES) {
      expect(urls).toContain(`${SITE}${GUIDES_PATH}/${m.guideSlug}`);
      expect(urls.includes(`${SITE}/products/${m.parentSlug}/${m.childSlug}`)).toBe(false);
    }
  });

  it("no internal link in the source tree still points at a retired guide URL", () => {
    const allowed = new Set([join(ROOT, "src/data/guideMoves.ts"), join(ROOT, "src/data/guideMoves.test.ts")]);
    const files = [...sourceFiles(join(ROOT, "src")), ...sourceFiles(join(ROOT, "app"))].filter((f) => !allowed.has(f));
    for (const m of GUIDE_MOVES) {
      const linkLike = new RegExp(`["'\`]/products/${m.parentSlug}/${m.childSlug}["'\`#?]`);
      const hits = files.filter((f) => linkLike.test(readFileSync(f, "utf8")));
      expect({ child: m.childSlug, hits }).toEqual({ child: m.childSlug, hits: [] });
    }
  });
});
