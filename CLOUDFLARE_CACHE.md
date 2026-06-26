# Cloudflare / CDN cache configuration

This app is `output: "standalone"` (self-hosted Node origin). Putting Cloudflare
(or any CDN/reverse proxy) in front of the origin is the single biggest lever for
field **TTFB / FCP / LCP**, because public pages are static/ISR and can be served
from the edge instead of the origin.

The app already emits the right `Cache-Control` headers (see `next.config.ts`
`headers()`); the rules below tell Cloudflare to honor them.

> ⚠️ **Never cache user/session data.** The bypass rule for the private paths is
> mandatory. The origin also sends `no-store` for those paths as defense-in-depth,
> but do not rely on headers alone — add the explicit bypass rule too.

---

## 1. Route-wise cache behavior (what the origin sends)

| Route(s) | `Cache-Control` (from `next.config.ts`) | Cache at edge? |
|---|---|---|
| `/`, `/products`, `/products/[slug]`, `/products/category/[slug]`, `/blog`, `/blog/[slug]`, `/about-us`, `/faq`, `/gallery`, `/rental-service`, `/marketplace`, `/contact`, policy pages, `/sitemap.xml`, `/robots.txt` | `public, max-age=0, s-maxage=3600, stale-while-revalidate=86400` | **Yes** — edge caches HTML, browser revalidates |
| `/_next/static/*` | `public, max-age=31536000, immutable` | Yes — forever |
| `/_next/image` (optimized images) | `public, max-age=31536000, immutable` | Yes — forever |
| `/admin/*`, `/cart`, `/checkout`, `/login`, `/register`, `/my-account/*`, `/forgot-password`, `/reset-password`, `/auth/*` | `private, no-store, no-cache, must-revalidate, max-age=0` | **No — bypass** |

`s-maxage=3600` is a sane default; it roughly matches the ISR `revalidate` windows
(home/listings 1h, product/category 30m, blog 24h). `stale-while-revalidate`
lets the edge serve a slightly-stale page instantly while it refreshes in the
background, so users almost never wait on the origin.

---

## 2. Cloudflare settings to apply (outside code)

### a) Enable compression
- **Speed → Optimization → Content Optimization**: ensure **Brotli** is **On**
  (gzip is on by default). This is important — the origin's Tailwind CSS is
  ~175 KB raw / ~27 KB Brotli; without edge compression first paint pays the full
  raw transfer on slow connections.

### b) Cache public HTML (Cache Rules — Caching → Cache Rules)
Create a rule **"Cache public HTML"**:
- **When incoming requests match:**
  `(not starts_with(http.request.uri.path, "/admin")) and (not starts_with(http.request.uri.path, "/cart")) and (not starts_with(http.request.uri.path, "/checkout")) and (not starts_with(http.request.uri.path, "/login")) and (not starts_with(http.request.uri.path, "/register")) and (not starts_with(http.request.uri.path, "/my-account")) and (not starts_with(http.request.uri.path, "/forgot-password")) and (not starts_with(http.request.uri.path, "/reset-password")) and (not starts_with(http.request.uri.path, "/auth"))`
- **Then:**
  - Cache eligibility: **Eligible for cache**
  - Edge TTL: **Use cache-control header if present** (respects `s-maxage`), or set
    "Override origin → 1 hour" if you prefer a fixed window.
  - Browser TTL: **Respect origin** (the origin sends `max-age=0`).
  - **Serve stale content while revalidating: On** (honors `stale-while-revalidate`).

### c) Bypass cache for private/dynamic routes (Cache Rules)
Create a rule **"Bypass private"** and order it **above** the public rule:
- **When incoming requests match:**
  `starts_with(http.request.uri.path, "/admin") or starts_with(http.request.uri.path, "/cart") or starts_with(http.request.uri.path, "/checkout") or starts_with(http.request.uri.path, "/login") or starts_with(http.request.uri.path, "/register") or starts_with(http.request.uri.path, "/my-account") or starts_with(http.request.uri.path, "/forgot-password") or starts_with(http.request.uri.path, "/reset-password") or starts_with(http.request.uri.path, "/auth")`
- **Then:** Cache eligibility → **Bypass cache**.

### d) Static + image assets
`/_next/static/*` and `/_next/image*` already send `immutable` — Cloudflare will
cache them automatically. No rule needed, but you may add an explicit
"Cache everything, Edge TTL 1 year" rule for `/_next/static/*` for clarity.

### e) Do NOT cache cookies-bearing responses
In the public rule, keep Cloudflare's default behavior of not caching responses
that set cookies. Public pages here do not set cookies; private pages do (and are
bypassed), so this is naturally safe.

### f) Recommended extras
- **Tiered Cache**: On (improves origin offload).
- **Early Hints**: On (works with the `<link rel=preload>` hints already in the app).
- Region: serve from a PoP near the primary audience (India) — origin geography is
  the main remaining field-TTFB factor once edge caching is on.

---

## 3. How to verify

```bash
# Public page → expect: cache-control: public, ... s-maxage=3600 ... and after a
# second request, cf-cache-status: HIT
curl -sI https://portableofficecabin.com/products | grep -i 'cache-control\|cf-cache-status'

# Private page → expect: cache-control: ... no-store ... and cf-cache-status: BYPASS
curl -sI https://portableofficecabin.com/cart | grep -i 'cache-control\|cf-cache-status'
```
