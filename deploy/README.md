# Production deploy — Hostinger VPS

`.github/workflows/deploy-hostinger.yml` runs on every push to `main`: it SSHes to the VPS as
`deploy` and runs `sudo /usr/local/bin/deploy-portable-office`. That server-side script is not in
this repository; its output (visible in the Actions log) shows what it does today:

```
git fetch origin main → git reset --hard → npm ci → next build (in the live directory) → pm2 reload
```

A deploy takes about 2–3 minutes from the merge. **Until the PM2 reload at the very end, the site is
still served by the previous process** — a page that only exists in the merged commit answers 404
during that window. That is expected; check a new page only once the Actions run is green.

## The real defect: in-place build + ISR 404 caching (2026-10-10)

`next build` empties `.next` and rewrites it while the old process is still serving from it.
Next.js persists the result of `notFound()` for an ISR route to disk for the revalidate window
(`.next/server/app/cities-we-serve/<slug>.{html,meta,rsc}`, answered with `x-nextjs-cache: HIT`;
reproduced locally). So a request for a just-merged city page that reaches the **old** process
after the build has prerendered that page but before the reload is rendered with the old code,
which does not know the slug, and its cached 404 overwrites the fresh 200. The **new** process then
serves that 404 for up to an hour. The same race serves an **updated** page stale for an hour.

Three layers of defence now exist:

1. **Code** — `app/(site)/cities-we-serve/[slug]/page.tsx` sets `dynamicParams = false`, so an
   unknown slug is a 404 decided by the router before rendering and is never written to the cache.
   The old process can no longer poison a new city page. (Other ISR routes — products, promotions,
   blog — keep the default and remain exposed until layer 3 is in place.)
2. **Workflow** — a *Verify the deployed pages* step after the SSH deploy requests every city page of
   the deployed commit (plus `/`, `/sitemap.xml`, `/cities-we-serve`) with retries and fails the run
   on any non-200. A red run means: re-run the workflow (*Run workflow*), which rebuilds and replaces
   every cached entry.
3. **Server** — `deploy/deploy-portable-office.sh` is a drop-in replacement for the server-side script
   that builds each commit into its own `releases/<sha>` directory and flips a `current` symlink
   before `pm2 reload`. Nothing is ever built in place, so the old process cannot write into the new
   build and never loses the files it is serving from. It needs the one-time setup described at the
   top of the script (release layout, `.env` in `shared/`, PM2 started from the `current` symlink);
   apply it on the VPS as root and keep the Actions workflow unchanged.

## nginx micro-cache (`deploy/nginx.conf`)

The live server does not currently run this config (responses carry no `X-Cache-Status`). If it is
enabled later, note that nginx honours the upstream `Cache-Control: s-maxage=3600` that
`next.config.ts` sends on **every** public HTML response, including 404s — a 404 cached before a
deploy would then outlive the deploy by an hour regardless of `proxy_cache_valid 404 10s`. Add
`proxy_ignore_headers Cache-Control Expires;` to the `location /` block (the micro-cache then uses
only the `proxy_cache_valid` windows) before switching it on.
