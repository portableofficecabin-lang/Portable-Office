import type { NextConfig } from "next";

// Content-Security-Policy.
// A static (non-nonce) policy is used deliberately so the site's static/ISR
// rendering is preserved — a per-request nonce would force every page into
// dynamic rendering AND breaks Next.js chunk loading under strict-dynamic if the
// nonce is not propagated perfectly. Because of that, 'unsafe-inline' is required
// for scripts (inline gtag bootstrap in app/layout.tsx + JSON-LD blocks) and
// styles (React inline styles, recharts). External origins are limited to the
// ones the app actually talks to.
const isDev = process.env.NODE_ENV !== "production";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://qsrlfsjtuymuhvwnsegq.supabase.co";
const supabaseWs = supabaseUrl.replace(/^https:/, "wss:");

// Razorpay Checkout is loaded from checkout.razorpay.com and renders the card/UPI/netbanking
// form inside its own iframe, talking back to api.razorpay.com (+ lumberjack.razorpay.com for
// its telemetry). Without all three of script-src / frame-src / connect-src below, the payment
// modal opens blank and fails silently — the browser blocks it and nothing surfaces in the UI.
const razorpayOrigins = "https://checkout.razorpay.com https://api.razorpay.com https://*.razorpay.com";

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://checkout.razorpay.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' https: data: blob:",
  `connect-src 'self' ${supabaseUrl} ${supabaseWs} https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com ${razorpayOrigins}${isDev ? " ws: wss:" : ""}`,
  `frame-src 'self' ${razorpayOrigins}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  // Razorpay's netbanking/3-D Secure flows hand off to the issuing bank, so the checkout
  // iframe must be able to POST to origins other than our own.
  "form-action 'self' https://*.razorpay.com",
  "frame-ancestors 'none'",
];
if (!isDev) cspDirectives.push("upgrade-insecure-requests");
const contentSecurityPolicy = cspDirectives.join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// Private/dynamic routes that must NEVER be cached by a browser, proxy or CDN
// (they render per-user session/cart/admin data). These get an explicit no-store
// at the edge AND most already export `dynamic = "force-dynamic"`. Keep this list
// in sync with the Cloudflare "bypass cache" rule (see CLOUDFLARE_CACHE.md).
const PRIVATE_PATHS = [
  "/admin/:path*",
  "/cart",
  "/checkout",
  "/login",
  "/register",
  "/my-account/:path*",
  "/forgot-password",
  "/reset-password",
  "/auth/:path*",
  /* Shared concept-animation previews. PRIVATE CONTENT reachable by URL: each one shows a
   * customer's own building render behind an unguessable slug.
   *
   * It belongs here, not in the public bucket, for two separate reasons:
   *   • CACHING — the public rule is `s-maxage=3600`, so a CDN would keep serving a preview for
   *     an hour AFTER the owner revoked the link. `no-store` makes revocation immediate.
   *   • INDEXING — X-Robots-Tag: noindex,nofollow, matching the page's own metadata. The page is
   *     deliberately NOT robots.txt-disallowed: blocking the crawl would stop Google reading the
   *     noindex it is meant to obey.
   * The page is also absent from the sitemap. */
  "/concept-animation/:path*",
];
const NO_STORE = "private, no-store, no-cache, must-revalidate, max-age=0";

// Public/SEO HTML: the browser always revalidates (max-age=0) so users never see
// stale HTML, but a shared cache / CDN MAY cache the document (s-maxage) and serve
// it stale while it revalidates in the background. s-maxage is a sane default that
// roughly mirrors the ISR `revalidate` windows used by the route segments (home /
// listings 1h, product/category 30m, blog 24h); Cloudflare can refine per-path.
const PUBLIC_HTML_CACHE = "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

// MERCHANT LANDING PAGES (/products/<slug>) get a much shorter edge window. These are the
// exact URLs Googlebot fetches from the Merchant feed, and they are the ONLY URLs a shopper
// reaches from Shopping. A transient bad response (deploy restart, truncated stream, origin
// error) cached at the edge poisons precisely the CLEAN canonical URL — while every tracked
// ?srsltid=... variant busts the cache and renders fine — which Google reports as "user
// cannot complete purchase". With s-maxage 3600 + SWR 86400 a poisoned copy could survive a
// DAY; with 300/600 it heals in minutes, and the origin is ISR-cached so the extra CDN
// misses stay cheap.
const PRODUCT_HTML_CACHE = "public, max-age=0, s-maxage=300, stale-while-revalidate=600";
// Matches every path EXCEPT the private routes above, Next internals and API.
// Errs on the safe side: anything starting with a private prefix is excluded, so a
// session/cart/admin response can never receive the cacheable public header.
const PUBLIC_HTML_MATCHER =
  "/((?!admin|cart|checkout|login|register|my-account|forgot-password|reset-password|auth|concept-animation|api|_next).*)";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    // Tree-shake large barrel packages so route chunks only include the icons /
    // components actually used, reducing JS parsed and executed on the client.
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "portableofficecabin.com" },
      { protocol: "https", hostname: "qsrlfsjtuymuhvwnsegq.supabase.co" },
    ],
    // Next.js image optimization is ON (sharp is a prod dependency and is bundled
    // with output:"standalone"). next/image call sites (Marketplace, promotion
    // heroes) now get on-the-fly AVIF/WebP + responsive resizing; the first
    // transform per (image,width,format) is cached on disk with a 1-year TTL and,
    // behind Cloudflare, served from the edge thereafter. Raw <img> usages
    // (hero, OptimizedImage, product/blog images) are unaffected and rely on the
    // pre-resized static files instead.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
  },
  async redirects() {
    return [
      // ── Canonical host: www → non-www ─────────────────────────────────────
      // The canonical origin is the apex (https://portableofficecabin.com). If a
      // request ever reaches this app on the www host, 301 it to the apex so www
      // can never serve duplicate/slow content. NOTE: this only fires for traffic
      // that actually hits THIS DO app — if www points at a separate/legacy origin
      // at the DNS level, that must be repointed/redirected in the host/DNS config
      // (see CLOUDFLARE_CACHE.md); a code redirect alone cannot reach it.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.portableofficecabin.com" }],
        destination: "https://portableofficecabin.com/:path*",
        statusCode: 301,
      },
      { source: "/about", destination: "/about-us", statusCode: 301 },
      { source: "/projects", destination: "/gallery", statusCode: 301 },
      { source: "/terms", destination: "/terms-and-conditions", statusCode: 301 },
      // ── Home Construction service pages ───────────────────────────────────
      // Home Construction is a CATEGORY (/products/category/home-construction),
      // so its child pages live under /products/<parent>/<child> like every
      // other child in this codebase — see src/data/productChildPages.ts for
      // that URL contract. The shorter top-level form is a reasonable guess and
      // was the originally requested address, so it 301s to the canonical URL
      // rather than 404ing. One canonical page, no duplicate content.
      {
        source: "/home-construction/building-construction-contractor",
        destination: "/products/home-construction/building-construction-contractor",
        statusCode: 301,
      },
      {
        source: "/home-construction",
        destination: "/products/category/home-construction",
        statusCode: 301,
      },
      // The bare parent of the new page is not a page of its own; send it to the
      // category, which is what someone trimming the URL is looking for.
      {
        source: "/products/home-construction",
        destination: "/products/category/home-construction",
        statusCode: 301,
      },
      // ── Legacy .html → clean extensionless URLs ───────────────────────────
      // Product `.html` URLs 301 to the clean form (the page's rel=canonical,
      // sitemap, internal links and JSON-LD all use the clean form).
      { source: "/products/:slug.html", destination: "/products/:slug", statusCode: 301 },
      // Known legacy top-level `.html` landing pages → their clean product pages.
      // Add more here if Search Console reports other indexed `.html` URLs.
      { source: "/portable-cabin.html", destination: "/products/portable-cabin", statusCode: 301 },
      { source: "/portable-toilet-cabin.html", destination: "/products/portable-toilet-cabin", statusCode: 301 },
      // ── Canonical product-slug consolidation ──────────────────────────────
      // Short, keyword-rich slugs are now the SINGLE canonical URL for these
      // products (set via the `slug` override in src/data/products.ts). 301 the
      // older name-derived slugs onto them so existing/indexed links consolidate.
      // ── Size variants served at their family's PARENT page ────────────────
      // A product family's size ladder normally gives each size its own URL
      // (/products/<family>/<size>). One size per family may instead be served
      // BY the family's parent page, because it was a product there long before
      // the ladder existed — the Container Office Cabin's 25 ft x 14 ft build
      // (POC-CO-GEN) is exactly that, and it carries `rendersAtParent` in
      // src/data/productFamilies.ts.
      //
      // Its ladder-shaped URL is guessable, so it 301s to the page that really
      // serves it: one canonical URL per size, no 404 on a reasonable guess, and
      // no second copy of the parent page at a second address.
      //
      // WHY HERE AND NOT IN THE PAGE: a `permanentRedirect()` inside the
      // [slug]/[child] route is swallowed during static prerendering — with
      // dynamicParams:false Next prerenders the path and serves the not-found
      // body at HTTP 200 (verified). A config redirect runs before routing, so
      // it is a real 301 whether or not the path is prerendered.
      //
      // Kept in step with the family data by scripts/product-variants.test.ts,
      // which fails if a `rendersAtParent` size has no rule here.
      { source: "/products/container-office/25x14-ft", destination: "/products/container-office", statusCode: 301 },
      { source: "/products/ms-portable-cabins", destination: "/products/ms-portable-cabin", statusCode: 301 },
      /* Steel Portable Cabin -> MS Portable Cabin (owner decision, 2026-09-04).
       *
       * MS steel and "steel" are the same material, so the two pages were the same product at
       * the same price. Two self-canonical URLs for one item split the ranking signal and let
       * Google pick the winner; the MS page is the established one, so it keeps the traffic,
       * the Merchant offer (POC-PC-MSPC) and its feed history, and absorbs "steel portable
       * cabin" as a secondary keyword.
       *
       * A 301 here rather than a cross-canonical: a canonical is a HINT Google may ignore,
       * a redirect is binding, and it also consolidates any inbound links. The steel SKU is
       * removed from the catalogue entirely, so this path is no longer prerendered and the
       * config redirect (which runs before routing) is what answers it. */
      { source: "/products/steel-portable-cabin", destination: "/products/ms-portable-cabin", statusCode: 301 },
      { source: "/products/new-used-shipping-container-for-sale-in-india", destination: "/products/shipping-container-for-sale", statusCode: 301 },
      { source: "/products/cargo-container-buy-rent-or-convert", destination: "/products/cargo-container-for-sale", statusCode: 301 },
      // Other legacy aliases that point at the canonical short slugs / products.
      { source: "/products/shipping-container", destination: "/products/shipping-container-for-sale", statusCode: 301 },
      { source: "/products/cargo-storage-container-shipping-container", destination: "/products/20ft-40ft-storage-container-corten-steel", statusCode: 301 },
      // NOTE: legacy `/products?category=<x>` URLs 301 → `/products/category/<x>`
      // in middleware.ts. It is handled there (not here) because next.config
      // redirects always forward the original query string, so a config redirect
      // would land on `/products/category/x?category=x` (a new non-canonical URL).
      // Middleware can build a clean Location with no query, which SEO requires.
    ];
  },
  async headers() {
    // ── Cache behaviour (route-wise) ───────────────────────────────────────────
    // Cloudflare / CDN setup that pairs with these headers lives in
    // CLOUDFLARE_CACHE.md. Summary of intent:
    //   • /_next/static/*  → immutable, 1 year (content-hashed assets)
    //   • /_next/image     → immutable, 1 year (optimized image variants)
    //   • PRIVATE_PATHS    → no-store (never cached: admin, cart, checkout, login,
    //                        register, my-account, forgot/reset-password, auth)
    //   • everything else  → public, s-maxage + stale-while-revalidate (CDN-cacheable
    //                        HTML, browser always revalidates)
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        // Optimized image variants are content-addressed → safe to cache forever.
        source: "/_next/image",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      // Private/dynamic routes — explicit no-store at the edge (defense-in-depth on
      // top of force-dynamic). Listed before the public matcher; the public matcher
      // excludes these prefixes so a route can never receive two Cache-Control values.
      // Also send `X-Robots-Tag: noindex, nofollow` so these never get indexed even
      // if linked/discovered (robots.txt only blocks crawling, not indexing of the
      // URL). Public/SEO pages get NO X-Robots-Tag and keep their <meta robots> index.
      ...PRIVATE_PATHS.map((source) => ({
        source,
        headers: [
          { key: "Cache-Control", value: NO_STORE },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      })),
      // Public/SEO HTML — CDN-cacheable with background revalidation.
      {
        source: PUBLIC_HTML_MATCHER,
        headers: [{ key: "Cache-Control", value: PUBLIC_HTML_CACHE }],
      },
      // Merchant landing pages — LAST so it overrides the public default for the same key.
      // "/products/:slug" matches exactly one segment: every product detail URL, but NOT
      // "/products" itself and NOT "/products/category/<slug>" (two segments), which keep
      // the longer public window.
      {
        source: "/products/:slug",
        headers: [{ key: "Cache-Control", value: PRODUCT_HTML_CACHE }],
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
};

export default nextConfig;
