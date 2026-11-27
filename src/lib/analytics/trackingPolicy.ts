/**
 * WHO GETS TRACKED — one rule for first-party analytics (page_views / click_events via
 * useAnalyticsTracking) and Google Analytics (GoogleAnalytics.tsx).
 *
 * WHY: local builds (`next start` on 127.0.0.1) and automated browsers (post-deploy checks,
 * Lighthouse, Puppeteer/Playwright, headless Chrome) run the same client code as the live site
 * and use the same public Supabase URL/key, so every test run wrote page_views and click_events
 * rows into the PRODUCTION analytics tables and sent hits to the production GA property
 * (found 2026-11-26: ~16 page_views + 2 click_events per headless checkout run).
 *
 * THE RULE: track only when ALL of these hold —
 *   1. the page is served from the production host (portableofficecabin.com or www.);
 *   2. the browser is not automation-controlled (`navigator.webdriver` is not true) and its
 *      user agent is not a known test/audit tool (HeadlessChrome, Lighthouse, PageSpeed, our
 *      own "post-deploy" checks, Puppeteer/Playwright/Selenium/Cypress);
 *   3. the visitor has not opted out (`?no_track=1`, remembered in localStorage; `?no_track=0`
 *      clears it — for staff who browse the live site while testing).
 * Real visitors — including search-engine crawlers that execute JavaScript — are tracked
 * exactly as before; this file deliberately does NOT filter ordinary bots, because that would
 * change what the production numbers mean.
 */

export const PRODUCTION_HOSTS: readonly string[] = ["portableofficecabin.com", "www.portableofficecabin.com"];
export const OPT_OUT_PARAM = "no_track";
export const OPT_OUT_STORAGE_KEY = "poc_no_track";

/** User agents of test and audit tools — never real visitors. */
export const AUTOMATION_UA = /HeadlessChrome|Chrome-Lighthouse|Lighthouse|PageSpeed|post-deploy|Puppeteer|Playwright|Selenium|Cypress|PhantomJS/i;

export type TrackingDecision =
  | { track: true }
  | { track: false; reason: "non-production-host" | "automation" | "opt-out" };

export interface TrackingEnv {
  hostname: string;
  webdriver?: boolean;
  userAgent?: string;
  optedOut?: boolean;
}

/** Pure decision (unit-tested): may this page view / click be recorded? */
export function trackingDecision(env: TrackingEnv): TrackingDecision {
  if (!PRODUCTION_HOSTS.includes(env.hostname.toLowerCase())) return { track: false, reason: "non-production-host" };
  if (env.webdriver === true || AUTOMATION_UA.test(env.userAgent ?? "")) return { track: false, reason: "automation" };
  if (env.optedOut) return { track: false, reason: "opt-out" };
  return { track: true };
}

/**
 * Applies `?no_track=1|0` to localStorage and reports whether this visitor opted out.
 * Storage can be unavailable (private mode, blocked site data) — then only the URL counts.
 */
export function readOptOut(search: string, storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null): boolean {
  const param = new URLSearchParams(search).get(OPT_OUT_PARAM);
  try {
    if (param === "1") storage?.setItem(OPT_OUT_STORAGE_KEY, "1");
    if (param === "0") storage?.removeItem(OPT_OUT_STORAGE_KEY);
    if (param === "1") return true;
    if (param === "0") return false;
    return storage?.getItem(OPT_OUT_STORAGE_KEY) === "1";
  } catch {
    return param === "1";
  }
}

let cached: TrackingDecision | null = null;

/** Browser-side decision, computed once per page load. False on the server. */
export function analyticsAllowed(): boolean {
  if (typeof window === "undefined") return false;
  if (!cached) {
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      storage = null;
    }
    cached = trackingDecision({
      hostname: window.location.hostname,
      webdriver: typeof navigator !== "undefined" && navigator.webdriver === true,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      optedOut: readOptOut(window.location.search, storage),
    });
  }
  return cached.track;
}
