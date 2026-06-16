"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";

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

  // Track page views on route change
  useEffect(() => {
    const now = Date.now();
    
    // Update duration for previous page
    if (currentPath.current !== pathname) {
      const duration = (now - pageEntryTime.current) / 1000;
      updatePageDuration(currentPath.current, duration);
    }

    // Track new page view
    trackPageView(pathname);
    pageEntryTime.current = now;
    currentPath.current = pathname;
  }, [pathname, trackPageView, updatePageDuration]);

  // Track click events
  useEffect(() => {
    document.addEventListener("click", trackClick);
    return () => document.removeEventListener("click", trackClick);
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
