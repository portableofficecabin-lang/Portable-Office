/**
 * RETIRED 2026-10-10 — intentionally renders nothing and runs no effects.
 *
 * This component dates from the Vite / react-helmet era, when the <head> was assembled in the
 * browser. After hydration, on every page, it rewrote <link rel="canonical">, og:url, og:image,
 * twitter:image, twitter:card and the geo.* meta tags, set document.title / description fallbacks,
 * and re-wrote every <img> alt and title (the geo suffix itself has been a no-op since 2026-09-07,
 * see src/utils/imageGeoTagging.ts).
 *
 * Every one of those values is now emitted by the server through buildPageMetadata()
 * (src/lib/seo/metadata.ts) or the route's own generateMetadata, so the client rewrite was at best
 * redundant and at worst a regression: it replaced each product page's own og:image with the
 * generic site image, and it re-stamped the canonical from window.location — a JavaScript-set
 * canonical is exactly what Google's documentation says to avoid. Removing it also drops a client
 * island from every public page and the layout-thrashing full-document <img> scan.
 *
 * Kept as an inert export rather than deleted so any historical import still compiles; it is no
 * longer mounted from src/components/layout/Layout.tsx. If a page ever lacks a canonical or a
 * social image, fix it in that page's metadata — never here.
 */
export function GlobalGeoSignals() {
  return null;
}
