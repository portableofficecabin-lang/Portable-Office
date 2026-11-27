import { describe, it, expect } from "vitest";

import type { CityPage } from "@/data/cityPages";
import { CITY_PAGES } from "@/data/cityPages";
import manifest from "@/data/sitemapLastmod.json";
import { cityContentHash, cityLastModified } from "./cityLastmod";
import { undatedCityPages } from "./cityLastmodCheck";

const page = (slug: string, extra: Record<string, unknown> = {}) => ({ slug, ...extra }) as unknown as CityPage;

describe("undatedCityPages", () => {
  it("reports a page edited after the manifest was generated as content-changed", () => {
    const edited = page("a", { title: "new copy" });
    const r = undatedCityPages([edited], new Set(["a"]), () => undefined);
    expect(r).toEqual([{ slug: "a", reason: "content-changed" }]);
  });

  it("reports a page added after the manifest was generated as not-in-manifest", () => {
    const r = undatedCityPages([page("new-page")], new Set(["a"]), () => undefined);
    expect(r).toEqual([{ slug: "new-page", reason: "not-in-manifest" }]);
  });

  it("does not report a dated page", () => {
    expect(undatedCityPages([page("a")], new Set(["a"]), () => "2026-11-27T13:11:50+05:30")).toEqual([]);
  });

  it("uses the sitemap's own rule by default (date only while the content hash matches the manifest)", () => {
    const M = (manifest as { cities: Record<string, { sha: string }> }).cities;
    for (const p of CITY_PAGES.slice(0, 20)) {
      const expectDated = M[p.slug]?.sha === cityContentHash(p);
      expect(Boolean(cityLastModified(p))).toBe(expectDated);
    }
    const undated = undatedCityPages(CITY_PAGES, new Set(Object.keys(M)));
    expect(undated.every((u) => !cityLastModified(CITY_PAGES.find((p) => p.slug === u.slug)!))).toBe(true);
  });
});
