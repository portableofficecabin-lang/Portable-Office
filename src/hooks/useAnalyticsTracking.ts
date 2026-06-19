"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

// Load the Supabase client lazily so its (~heavy) bundle is not parsed/executed
// during initial page load. All analytics work already runs after the page is
// interactive (see runWhenIdle below), so importing on demand keeps Supabase off
// the critical JS-execution path.
const getSupabase = () =>
  import("@/integrations/supabase/client").then((m) => m.supabase);

// Run non-critical work after the browser is idle so analytics (and the Supabase
// client it pulls in) never contend with hydration / the LCP paint. Falls back to
// a timeout where requestIdleCallback is unavailable (Safari/older browsers).
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

interface GeoInfo {
  ip_address: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
}

const GEO_CACHE_KEY = "poc_visitor_geo";
const GEO_CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

const getVisitorGeo = async (): Promise<GeoInfo> => {
  if (typeof window === "undefined") {
    return { ip_address: null, country: null, region: null, city: null };
  }
  try {
    const cached = localStorage.getItem(GEO_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.ts && Date.now() - parsed.ts < GEO_CACHE_TTL) {
        return parsed.data;
      }
    }
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) throw new Error("geo lookup failed");
    const j = await res.json();
    const data: GeoInfo = {
      ip_address: j.ip || null,
      country: j.country_name || null,
      region: j.region || null,
      city: j.city || null,
    };
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
    return data;
  } catch {
    return { ip_address: null, country: null, region: null, city: null };
  }
};

export function useAnalyticsTracking() {
  const pathname = usePathname();
  const pageEntryTime = useRef<number>(Date.now());
  const currentPath = useRef<string>(pathname);
  const visitorId = useRef<string>(getVisitorId());

  // Track page view
  const trackPageView = useCallback(async (path: string) => {
    try {
      const geo = await getVisitorGeo();
      const supabase = await getSupabase();
      await supabase.from("page_views").insert({
        visitor_id: visitorId.current,
        page_path: path,
        page_title: document.title,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        duration_seconds: 0,
        ip_address: geo.ip_address,
        country: geo.country,
        region: geo.region,
        city: geo.city,
      } as any);
    } catch (err) {
      console.error("Failed to track page view:", err);
    }
  }, []);

  // Update page duration when leaving
  const updatePageDuration = useCallback(async (path: string, duration: number) => {
    try {
      const supabase = await getSupabase();
      // Update the most recent page view for this visitor and path
      const { data } = await supabase
        .from("page_views")
        .select("id")
        .eq("visitor_id", visitorId.current)
        .eq("page_path", path)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        await supabase
          .from("page_views")
          .update({ duration_seconds: Math.round(duration) })
          .eq("id", data.id);
      }
    } catch (err) {
      // Silently fail - don't disrupt user experience
    }
  }, []);

  // Track click events
  const trackClick = useCallback(async (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target) return;

    // Only track meaningful clicks (links, buttons, etc.)
    const clickableElement = target.closest("a, button, [role='button'], [data-track]");
    if (!clickableElement) return;

    const elementText = clickableElement.textContent?.trim().substring(0, 100) || "";
    const elementType = clickableElement.tagName.toLowerCase();
    const elementId = clickableElement.id || null;
    const elementClass = clickableElement.className?.toString().substring(0, 200) || null;

    // Skip if no meaningful text
    if (!elementText) return;

    try {
      const supabase = await getSupabase();
      await supabase.from("click_events").insert({
        visitor_id: visitorId.current,
        page_path: pathname,
        element_type: elementType,
        element_text: elementText,
        element_id: elementId,
        element_class: elementClass,
      });
    } catch (err) {
      // Silently fail
    }
  }, [pathname]);

  // Track page views on route change. Deferred to idle so the Supabase client +
  // ipapi geo lookup load after the page is interactive, not during hydration.
  useEffect(() => {
    const now = Date.now();
    const prevPath = currentPath.current;
    const prevEntry = pageEntryTime.current;
    const pathChanged = prevPath !== pathname;

    pageEntryTime.current = now;
    currentPath.current = pathname;

    return runWhenIdle(() => {
      // Update duration for previous page
      if (pathChanged) {
        updatePageDuration(prevPath, (now - prevEntry) / 1000);
      }
      // Track new page view
      trackPageView(pathname);
    });
  }, [pathname, trackPageView, updatePageDuration]);

  // Track click events. Listener attached after idle to keep it off the critical
  // hydration path.
  useEffect(() => {
    const cancel = runWhenIdle(() => document.addEventListener("click", trackClick));
    return () => {
      cancel();
      document.removeEventListener("click", trackClick);
    };
  }, [trackClick]);

  // Track duration on page unload
  useEffect(() => {
    const handleUnload = () => {
      const duration = (Date.now() - pageEntryTime.current) / 1000;
      // Use sendBeacon for reliable tracking on page unload
      const data = JSON.stringify({
        visitor_id: visitorId.current,
        page_path: currentPath.current,
        duration_seconds: Math.round(duration),
      });
      
      navigator.sendBeacon?.(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/update_page_duration`,
        data
      );
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);
}
