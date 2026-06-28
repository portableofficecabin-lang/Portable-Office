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
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://ojemqfexagnevqbaszop.supabase.co";
const supabaseWs = supabaseUrl.replace(/^https:/, "wss:");

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' https: data: blob:",
  `connect-src 'self' ${supabaseUrl} ${supabaseWs} https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com${isDev ? " ws: wss:" : ""}`,
  "frame-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
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
      { protocol: "https", hostname: "ojemqfexagnevqbaszop.supabase.co" },
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
      { source: "/about", destination: "/about-us", permanent: true },
      { source: "/projects", destination: "/gallery", permanent: true },
      { source: "/terms", destination: "/terms-and-conditions", permanent: true },
      // ── SEO canonical consolidation ────────────────────────────────────────
      // Product URLs are now the clean form (no `.html`); the page's rel=canonical,
      // sitemap, internal links and JSON-LD all use it. 301 the legacy `.html`
      // form to the clean URL so old/indexed/external links consolidate.
      { source: "/products/:slug.html", destination: "/products/:slug", permanent: true },
      // NOTE: legacy `/products?category=<x>` URLs are intentionally NOT redirected.
      // All internal links now use the canonical path form (/products/category/<x>),
      // so nothing advertises the query form. Old/external `?category=` links still
      // work (the static /products page applies the filter client-side) and correctly
      // canonicalise to /products. A redirect here can't be clean: Next.js always
      // forwards the original query string, so `?category=x` → /products/category/x
      // would land on `/products/category/x?category=x` (a new non-canonical URL),
      // and redirecting to /products would loop. Client-side filter + canonical wins.
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
      ...PRIVATE_PATHS.map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: NO_STORE }],
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
