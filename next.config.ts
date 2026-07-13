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
];
const NO_STORE = "private, no-store, no-cache, must-revalidate, max-age=0";

// Public/SEO HTML: the browser always revalidates (max-age=0) so users never see
// stale HTML, but a shared cache / CDN MAY cache the document (s-maxage) and serve
// it stale while it revalidates in the background. s-maxage is a sane default that
// roughly mirrors the ISR `revalidate` windows used by the route segments (home /
// listings 1h, product/category 30m, blog 24h); Cloudflare can refine per-path.
const PUBLIC_HTML_CACHE = "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";
// Matches every path EXCEPT the private routes above, Next internals and API.
// Errs on the safe side: anything starting with a private prefix is excluded, so a
// session/cart/admin response can never receive the cacheable public header.
const PUBLIC_HTML_MATCHER =
  "/((?!admin|cart|checkout|login|register|my-account|forgot-password|reset-password|auth|api|_next).*)";

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
      { source: "/products/ms-portable-cabins", destination: "/products/ms-portable-cabin", statusCode: 301 },
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
