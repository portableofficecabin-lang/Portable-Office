import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { OPT_OUT_STORAGE_KEY, PRODUCTION_HOSTS, readOptOut, trackingDecision } from "./trackingPolicy";

/**
 * Analytics must record real visitors on the live site and nothing else: local builds, automated
 * browsers (post-deploy checks, Lighthouse, Puppeteer/Playwright) and opted-out staff wrote rows
 * into the production page_views / click_events tables before this guard (2026-11-26).
 */

const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const GOOGLEBOT = "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

function memoryStorage(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    dump: () => Object.fromEntries(m),
  };
}

describe("trackingDecision", () => {
  it("tracks real visitors on both production hosts", () => {
    for (const hostname of PRODUCTION_HOSTS) {
      expect(trackingDecision({ hostname, webdriver: false, userAgent: CHROME })).toEqual({ track: true });
      expect(trackingDecision({ hostname, webdriver: false, userAgent: IPHONE })).toEqual({ track: true });
    }
    expect(trackingDecision({ hostname: "PortableOfficeCabin.com", userAgent: CHROME })).toEqual({ track: true });
  });

  it("keeps tracking JavaScript-running search crawlers exactly as before", () => {
    expect(trackingDecision({ hostname: "portableofficecabin.com", webdriver: false, userAgent: GOOGLEBOT })).toEqual({ track: true });
  });

  it("never tracks local or non-production hosts", () => {
    for (const hostname of ["127.0.0.1", "localhost", "0.0.0.0", "portableofficecabin.com.evil.test", "staging.portableofficecabin.com"]) {
      expect(trackingDecision({ hostname, userAgent: CHROME })).toEqual({ track: false, reason: "non-production-host" });
    }
  });

  it("never tracks automation-controlled browsers or test/audit user agents", () => {
    const host = "portableofficecabin.com";
    expect(trackingDecision({ hostname: host, webdriver: true, userAgent: CHROME })).toEqual({ track: false, reason: "automation" });
    for (const ua of [
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36",
      `${CHROME} Chrome-Lighthouse`,
      "Mozilla/5.0 (post-deploy check)",
      "Mozilla/5.0 (post-deploy purchase check; stops at Pay)",
      `${CHROME} Playwright/1.48`,
    ]) {
      expect(trackingDecision({ hostname: host, webdriver: false, userAgent: ua })).toEqual({ track: false, reason: "automation" });
    }
  });

  it("respects an opt-out", () => {
    expect(trackingDecision({ hostname: "portableofficecabin.com", userAgent: CHROME, optedOut: true })).toEqual({ track: false, reason: "opt-out" });
  });
});

describe("readOptOut", () => {
  it("?no_track=1 opts out and is remembered; ?no_track=0 clears it", () => {
    const s = memoryStorage();
    expect(readOptOut("?no_track=1", s)).toBe(true);
    expect(s.dump()).toEqual({ [OPT_OUT_STORAGE_KEY]: "1" });
    expect(readOptOut("", s)).toBe(true);
    expect(readOptOut("?utm_source=x", s)).toBe(true);
    expect(readOptOut("?no_track=0", s)).toBe(false);
    expect(s.dump()).toEqual({});
    expect(readOptOut("", s)).toBe(false);
  });

  it("works without storage (private mode / blocked site data)", () => {
    expect(readOptOut("?no_track=1", null)).toBe(true);
    expect(readOptOut("", null)).toBe(false);
    const throwing = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); } };
    expect(readOptOut("?no_track=1", throwing)).toBe(true);
    expect(readOptOut("", throwing)).toBe(false);
  });
});

describe("wiring", () => {
  const src = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
  it("every first-party analytics write goes through analyticsAllowed()", () => {
    const hook = src("src/hooks/useAnalyticsTracking.ts");
    expect(hook).toMatch(/const sbInsert[\s\S]*?if \(!SB_URL \|\| !SB_KEY \|\| !analyticsAllowed\(\)\) return;/);
    expect(hook).toMatch(/const sbRpc[\s\S]*?if \(!SB_URL \|\| !SB_KEY \|\| !analyticsAllowed\(\)\) return;/);
    // No other direct REST write in the hook.
    expect((hook.match(/fetch\(`/g) || []).length).toBe(2); // real calls take a template-literal URL; comments do not count
  });
  it("Google Analytics is never loaded when analytics are not allowed", () => {
    expect(src("src/components/analytics/GoogleAnalytics.tsx")).toMatch(/if \(load \|\| !analyticsAllowed\(\)\) return;/);
  });
});
