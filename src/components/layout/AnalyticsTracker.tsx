"use client";

import { useAnalyticsTracking } from "@/hooks/useAnalyticsTracking";

// Tiny client island that runs the (idle-deferred) first-party analytics hook.
// Extracted out of Layout so Layout itself can be a Server Component — that lets
// the presentational Footer/WhatsAppButton and the static <main> render on the
// server (no hydration) on server-rendered routes (home, product detail). This
// component renders nothing.
export function AnalyticsTracker() {
  useAnalyticsTracking();
  return null;
}
