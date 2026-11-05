import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { categories as catalogueCategories } from "./products";
import { RETIRED_CATEGORY_REDIRECTS, withoutRetiredCategories } from "./retiredCategories";

/**
 * Keeps the verified 404 / soft-404 repairs of 2026-11-04 honest:
 *   • every retired database-only category slug 301s (next.config.ts) to a live catalogue category,
 *   • the used-container URL 301s to the cargo & shipping containers category,
 *   • no redirect in next.config.ts is a chain or a loop,
 *   • the rendered category lists drop the retired slugs and nothing else,
 *   • no source file still links to one of the three old URLs.
 * Problems are collected as readable strings so a failure names the slug or file at fault.
 */
const ROOT = process.cwd();
const config = readFileSync(join(ROOT, "next.config.ts"), "utf8");
const catalogueSlugs = new Set(catalogueCategories.map((c) => c.slug));

/** Every static `{ source, destination, statusCode }` redirect written in next.config.ts. */
const redirects = [...config.matchAll(/source:\s*"([^"]+)",\s*destination:\s*"([^"]+)",\s*(?:statusCode:\s*(\d+)|permanent:\s*(true|false))/g)].map(
  (m) => ({ source: m[1], destination: m[2], status: m[3] ? Number(m[3]) : m[4] === "true" ? 308 : 307 }),
);
const redirectOf = (source: string) => redirects.find((r) => r.source === source);

const USED_CONTAINER_URL = "/products/used-shipping-container-for-sale";
const CARGO_CATEGORY = "cargo-storage-shipping-containers";

describe("retired database-only categories", () => {
  it("each retired slug duplicates, and points at, a live catalogue category", () => {
    const problems: string[] = [];
    for (const [retired, target] of Object.entries(RETIRED_CATEGORY_REDIRECTS)) {
      if (catalogueSlugs.has(retired)) problems.push(`${retired} must not be a catalogue category`);
      if (!catalogueSlugs.has(target)) problems.push(`${target} must be a catalogue category`);
      if (Object.hasOwn(RETIRED_CATEGORY_REDIRECTS, target)) problems.push(`${target} must not itself be retired`);
    }
    expect(problems).toEqual([]);
  });

  it("next.config.ts 301s each retired category URL to its catalogue category", () => {
    const found = Object.entries(RETIRED_CATEGORY_REDIRECTS).map(([retired]) => {
      const r = redirectOf(`/products/category/${retired}`);
      return { retired, destination: r?.destination ?? null, status: r?.status ?? null };
    });
    const expected = Object.entries(RETIRED_CATEGORY_REDIRECTS).map(([retired, target]) => ({
      retired,
      destination: `/products/category/${target}`,
      status: 301,
    }));
    expect(found).toEqual(expected);
  });

  it("withoutRetiredCategories drops exactly the retired slugs, in order", () => {
    const merged = [
      { slug: "portable-cabins" },
      { slug: "portable-toilets" },
      { slug: "site-office-containers" },
      { slug: "site-offices" },
      { slug: "portable-toilet-cabins" },
    ];
    expect(withoutRetiredCategories(merged).map((c) => c.slug)).toEqual([
      "portable-cabins",
      "site-office-containers",
      "portable-toilet-cabins",
    ]);
    // The catalogue list is never trimmed.
    expect(withoutRetiredCategories(catalogueCategories)).toHaveLength(catalogueCategories.length);
  });
});

describe("used shipping container URL", () => {
  it("301s to the cargo & shipping containers category, which is a catalogue category", () => {
    const r = redirectOf(USED_CONTAINER_URL);
    expect({ destination: r?.destination ?? null, status: r?.status ?? null }).toEqual({
      destination: `/products/category/${CARGO_CATEGORY}`,
      status: 301,
    });
    expect(catalogueSlugs.has(CARGO_CATEGORY)).toBe(true);
  });
});

describe("next.config.ts redirects", () => {
  it("are parsed from the config (guards the regex above)", () => {
    expect(redirects.length > 3).toBe(true);
  });

  it("contain no chains or loops", () => {
    const sources = new Set(redirects.map((r) => r.source));
    const problems: string[] = [];
    for (const r of redirects) {
      if (r.destination.startsWith("http")) continue; // host canonicalisation
      if (sources.has(r.destination)) problems.push(`${r.source} → ${r.destination} is a chain`);
      if (r.destination === r.source) problems.push(`${r.source} redirects to itself`);
    }
    expect(problems).toEqual([]);
  });
});

describe("internal links", () => {
  /** Every .ts/.tsx file under src/ and app/ except this test and the redirect source of truth. */
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) return name === "node_modules" ? [] : sourceFiles(p);
      return /\.(ts|tsx)$/.test(name) && !/retiredCategories(\.test)?\.ts$/.test(name) ? [p] : [];
    });
  }
  const oldUrls = [USED_CONTAINER_URL, ...Object.keys(RETIRED_CATEGORY_REDIRECTS).map((s) => `/products/category/${s}`)];

  it("no longer point at any of the three redirected URLs", () => {
    const hits: string[] = [];
    for (const file of [...sourceFiles(join(ROOT, "src")), ...sourceFiles(join(ROOT, "app"))]) {
      const text = readFileSync(file, "utf8");
      for (const url of oldUrls) {
        // A link is an href / to / path string that IS the old URL (comments that name it are fine).
        if (new RegExp(`(?:href|to|path)\\s*[=:]\\s*\\{?\\s*["'\`]${url.replace(/[/-]/g, "\\$&")}["'\`]`).test(text)) {
          hits.push(`${file.replace(ROOT, "")}: ${url}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
