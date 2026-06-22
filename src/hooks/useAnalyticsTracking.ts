"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

// First-party analytics via direct Supabase REST (PostgREST) fetch calls. This
// deliberately AVOIDS importing the heavy @supabase/supabase-js client bundle on
// public/SEO pages — a couple of tiny fetch() calls replace ~tens of KB of JS.
// All work is deferred to browser idle so it never competes with hydration / LCP,
// and there is NO third-party geo lookup (Google Analytics already provides
// geography), so no ipapi.co request is made on page load.

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const sbHeaders = (): Record<string, string> => ({
  "Content-Type": "application/json",
  apikey: SB_KEY ?? "",
  Authorization: `Bearer ${SB_KEY ?? ""}`,
  Prefer: "return=minimal",
});

const sbInsert = (table: string, row: Record<string, unknown>): void => {
  if (!SB_URL || !SB_KEY) return;
  fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: sbHeaders(),
    body: JSON.stringify(row),
    keepalive: true,
  }).catch(() => {});
};

const sbRpc = (fn: string, args: Record<string, unknown>): void => {
  if (!SB_URL || !SB_KEY) return;
  fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: sbHeaders(),
    body: JSON.stringify(args),
    keepalive: true,
  }).catch(() => {});
};

// Run non-critical work after the browser is idle so analytics never contends with
// hydration / the LCP paint. Falls back to a timeout where requestIdleCallback is
// unavailable (Safari/older browsers).
const runWhenIdle = (cb: () => void): (() => void) => {
  if (typeof window === "undefined") return () => {};
  const ric = (window as any).requestIdleCallback as
    | ((cb: () => void, opts?: { timeout: number }) => number)
    | undefined;
  if (ric) {
    const id = ric(cb, { timeout: 3000 });
    return () => (window as any).cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(cb, 1200);
  return () => window.clearTimeout(id);
};

// Generate or retrieve a persistent visitor ID
const getVisitorId = (): string => {
  if (typeof window === "undefined") return "ssr_visitor";
  const storageKey = "poc_visitor_id";
  let visitorId = localStorage.getItem(storageKey);
  if (!visitorId) {
    visitorId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(storageKey, visitorId);
  }
  return visitorId;
};

export function useAnalyticsTracking() {
  const pathname = usePathname();
  const pageEntryTime = useRef<number>(Date.now());
  const currentPath = useRef<string>(pathname);
  const visitorId = useRef<string>(getVisitorId());

  const trackPageView = useCallback((path: string) => {
    sbInsert("page_views", {
      visitor_id: visitorId.current,
      page_path: path,
      page_title: typeof document !== "undefined" ? document.title : null,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      duration_seconds: 0,
    });
  }, []);

  const updatePageDuration = useCallback((path: string, duration: number) => {
    sbRpc("update_page_duration", {
      visitor_id: visitorId.current,
      page_path: path,
      duration_seconds: Math.round(duration),
    });
  }, []);

  const trackClick = useCallback(
    (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target) return;
      const el = target.closest("a, button, [role='button'], [data-track]");
      if (!el) return;
      const elementText = el.textContent?.trim().substring(0, 100) || "";
      if (!elementText) return;
      sbInsert("click_events", {
        visitor_id: visitorId.current,
        page_path: pathname,
        element_type: el.tagName.toLowerCase(),
        element_text: elementText,
        element_id: el.id || null,
        element_class: el.className?.toString().substring(0, 200) || null,
      });
    },
    [pathname],
  );

  // Track page views on route change. Deferred to idle so it runs after the page
  // is interactive, not during hydration.
  useEffect(() => {
    const now = Date.now();
    const prevPath = currentPath.current;
    const prevEntry = pageEntryTime.current;
    const pathChanged = prevPath !== pathname;

    pageEntryTime.current = now;
    currentPath.current = pathname;

    return runWhenIdle(() => {
      if (pathChanged) updatePageDuration(prevPath, (now - prevEntry) / 1000);
      trackPageView(pathname);
    });
  }, [pathname, trackPageView, updatePageDuration]);

  // Click listener attached after idle to keep it off the critical hydration path.
  useEffect(() => {
    const cancel = runWhenIdle(() => document.addEventListener("click", trackClick));
    return () => {
      cancel();
      document.removeEventListener("click", trackClick);
    };
  }, [trackClick]);

  // Duration on page unload via sendBeacon (reliable, no client bundle).
  useEffect(() => {
    const handleUnload = () => {
      const duration = (Date.now() - pageEntryTime.current) / 1000;
      const data = JSON.stringify({
        visitor_id: visitorId.current,
        page_path: currentPath.current,
        duration_seconds: Math.round(duration),
      });
      navigator.sendBeacon?.(`${SB_URL}/rest/v1/rpc/update_page_duration`, data);
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);
}
