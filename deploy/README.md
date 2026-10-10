# Production deploy — Hostinger VPS

`.github/workflows/deploy-hostinger.yml` runs on every push to `main`: it SSHes to the VPS as
`deploy` and runs `sudo /usr/local/bin/deploy-portable-office`. The script installed at that path
today is **not** this repository's `deploy/deploy-portable-office.sh`; its output (visible in the
Actions log) shows what it does:

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

Three layers of defence exist:

1. **Code** — `app/(site)/cities-we-serve/[slug]/page.tsx` sets `dynamicParams = false`, so an
   unknown slug is a 404 decided by the router before rendering and is never written to the cache.
   The old process can no longer poison a new city page. (Other ISR routes — products, promotions,
   blog — keep the default and remain exposed until layer 3 is in place.)
2. **Workflow** — a *Verify the deployed pages* step after the SSH deploy requests every city page of
   the deployed commit (plus `/`, `/sitemap.xml`, `/cities-we-serve`) with retries and fails the run
   on any non-200. A red run means: re-run the workflow (*Run workflow*), which rebuilds and replaces
   every cached entry. The workflow also offers a manual **rollback** run (*Run workflow* → action =
   `rollback`), which only works once layer 3 is installed.
3. **Server** — `deploy/deploy-portable-office.sh` is a drop-in replacement for the server-side script.
   It builds every commit into its own release directory, starts it under PM2 in an idle slot on its
   own port, health-checks it, and only then switches the nginx upstream to it. Nothing is built in
   place, the live process is never stopped before its replacement is verified, and the previous
   release stays on disk for a one-command rollback. It needs the one-time migration below, applied
   on the VPS as root. The Actions workflow does not change for it.

## nginx micro-cache (`deploy/nginx.conf`)

The live server does not currently run this config (responses carry no `X-Cache-Status`). If it is
enabled later, note that nginx honours the upstream `Cache-Control: s-maxage=3600` that
`next.config.ts` sends on **every** public HTML response, including 404s — a 404 cached before a
deploy would then outlive the deploy by an hour regardless of `proxy_cache_valid 404 10s`. Add
`proxy_ignore_headers Cache-Control Expires;` to the `location /` block (the micro-cache then uses
only the `proxy_cache_valid` windows) before switching it on.

---

# Release-based deployment runbook (layer 3)

## What is on the server today (read-only audit of 2026-10-10, as the `deploy` user)

| Item | Finding |
| --- | --- |
| Host | `srv2025838`, 187.126.117.26, Ubuntu 24.04.5, 2 vCPU, 7.9 GB RAM (about 6.5 GB available), **no swap**, 96 GB disk with 89 GB free |
| Node / PM2 | Node v22.23.3 and PM2 7.0.4 in `/usr/bin` (the repo's `.nvmrc` says 24; the build runs on 22 today). The PM2 daemon runs as **root** (`PM2_HOME=/root/.pm2`) and is restored at boot by `pm2-root.service` (`pm2 resurrect`). |
| Live app | PM2 process `portable-office` (id 0), fork mode, started as `npm start` → `sh -c next start` → `next-server`, listening on `*:3000`, working directory `/srv/apps/portable-office` (a git checkout of `main`, 2.5 GB including `node_modules`; `output: "standalone"` is configured but `next start` is what runs). |
| Other tenants | `built-on-trust` on ports **3001 and 3002** (two releases, both running) and a local PostgreSQL 16 on 5432. Port **3010 is free**. |
| nginx | 1.24. `sites-enabled/portableofficecabin.com`: plain `proxy_pass http://127.0.0.1:3000;`, Certbot-managed TLS (ECDSA, `certbot.timer`, `installer = nginx`), custom `/error.html` for 5xx. No `upstream` block, no proxy cache. `conf.d/` is empty and is included at `http` level, so an upstream file can live there. |
| Firewall | Only 22, 80 and 443 answer from the internet; 3000–3002 do not. |
| Deploy script | `/usr/local/bin/deploy-portable-office`: root:root, mode 750, 827 bytes, not readable by `deploy`. Its log output shows the in-place sequence above plus a website check, `pm2 save` and an orphan-process cleanup (a side effect of the `npm` → `sh` → `next` wrapper chain). sudoers: `deploy ALL=(root) NOPASSWD: /usr/local/bin/deploy-portable-office` — no argument list, so arguments are permitted. |
| Environment | `/srv/apps/portable-office/.env` (931 bytes, **mode 644**, readable by every local user). `next build` reads it, so `NEXT_PUBLIC_*` values are baked into each build. |
| Server-only file | `/srv/apps/portable-office/public/bimi/logo.svg` is **not in git**. A deploy that starts from a clean export drops `/bimi/logo.svg` unless it is carried over. |
| Caches | `.next/cache` = 1.1 GB webpack cache + 70 MB `next/image` output (1,327 entries) + fetch cache. Preserved across in-place builds today. |
| Timing | Merge → deploy run start: 3 s. Build 71 s compile + ~25 s prerender. PM2 reload ≈ 15:29:37, "successful" 15:29:41 — a 2–3 minute window per merge, plus a sub-second to few-second 502 at the reload. |

PM2 facts checked in the installed source (`/usr/lib/node_modules/pm2/lib`): `pm2 start` stores
`pm_cwd = path.resolve(cwd)` and `pm_exec_path = path.resolve(cwd, script)` **lexically** (symlinks
are not resolved), every restart spawns with that stored `pm_cwd`, and fork-mode `reload` is a
restart (`KILL_TIMEOUT` 1600 ms). The design below never restarts a process in place: each release is
a fresh `pm2 start --cwd <release dir>`, so stored paths are always the real release directory and
no symlink has to be re-resolved by PM2.

## Target layout

```
/srv/apps/portableofficecabin.com/
├── releases/<utc-stamp>-<sha7>/   one directory per deploy: source export + node_modules + .next
├── current  -> releases/…         live release (bookkeeping; rollback source of truth)
├── previous -> releases/…         the release before it (default rollback target)
├── shared/.env                    the one environment file (root, mode 600), symlinked into each release
├── shared/next-cache/             shared .next/cache (webpack, next/image, fetch) across releases
├── shared/public/bimi/logo.svg    server-only public files, copied into each release's public/
└── repo/                          cached clone used for `git fetch` + `git archive`
```

Two PM2 slots, one live at a time, selected by `/etc/nginx/conf.d/portable-office-upstream.conf`
(`deploy/nginx/portable-office-upstream.conf`):

| Slot | PM2 name | Port |
| --- | --- | --- |
| A | `portable-office` (the existing name, kept) | 127.0.0.1:3000 |
| B | `portable-office-b` | 127.0.0.1:3010 |

## Deploy sequence (`deploy-portable-office deploy`)

1. `git fetch` main into `repo/`, `git archive` the commit into a new `releases/<id>/`.
2. Symlink `shared/.env` and `shared/next-cache` into it, copy `shared/public/` over `public/`.
3. `npm ci`, `next build` — in the release directory only. The live app is not touched.
4. `pm2 start` the **idle** slot from the release directory (`next start -H 127.0.0.1 -p <port>`).
5. Health checks against that port: wait for `/` = 200 (up to 120 s), then `/`,
   `/cities-we-serve`, `/products`, `/sitemap.xml`, `/robots.txt` must all be 200, and the HTML
   must reference the release's `BUILD_ID`.
6. Rewrite the upstream include to the idle port, `nginx -t`, `systemctl reload nginx`
   (graceful: in-flight requests finish on the old port). Verify **through nginx over TLS**
   (`--resolve portableofficecabin.com:443:127.0.0.1`) that the new `BUILD_ID` is served.
7. Drain 15 s, `pm2 delete` the old slot, `pm2 save`, move `current`/`previous`, keep the newest
   three releases (never the current, previous or any directory a PM2 process runs from).

Failure handling: anything failing in steps 1–5 or `nginx -t` leaves production untouched (the
failed slot is deleted, the release is kept as `<id>.failed`). A failed step-6 verification writes
the old port back and reloads nginx, while the old process is still running. A `flock` prevents two
runs overlapping; every run is logged to `/var/log/deploy-portable-office/`.

## One-time migration (root on the VPS, after this is merged)

Each step is reversible and the site stays up throughout.

```bash
# 0. Backups
cp -a /etc/nginx/sites-available/portableofficecabin.com /root/portableofficecabin.com.nginx.bak
cp -a /usr/local/bin/deploy-portable-office /root/deploy-portable-office.legacy

# 1. Layout + shared files (copies; the live checkout is not modified)
install -d -m 755 /srv/apps/portableofficecabin.com /srv/apps/portableofficecabin.com/releases \
  /srv/apps/portableofficecabin.com/shared /srv/apps/portableofficecabin.com/shared/public/bimi \
  /srv/apps/portableofficecabin.com/shared/next-cache
install -o root -g root -m 600 /srv/apps/portable-office/.env /srv/apps/portableofficecabin.com/shared/.env
cp -a /srv/apps/portable-office/public/bimi/logo.svg /srv/apps/portableofficecabin.com/shared/public/bimi/
cp -a /srv/apps/portable-office/.next/cache/. /srv/apps/portableofficecabin.com/shared/next-cache/   # optional: warm cache (1.2 GB)
git clone https://github.com/portableofficecabin-lang/Portable-Office.git /srv/apps/portableofficecabin.com/repo

# 2. nginx: upstream block that points at the CURRENT app → no behaviour change
install -m 644 /srv/apps/portableofficecabin.com/repo/deploy/nginx/portable-office-upstream.conf \
  /etc/nginx/conf.d/portable-office-upstream.conf
sed -i 's#proxy_pass http://127.0.0.1:3000;#proxy_pass http://portable_office;#' \
  /etc/nginx/sites-available/portableofficecabin.com
grep -n proxy_pass /etc/nginx/sites-available/portableofficecabin.com      # expect: proxy_pass http://portable_office;
nginx -t && systemctl reload nginx
curl -sI --resolve portableofficecabin.com:443:127.0.0.1 https://portableofficecabin.com/ | head -1   # expect HTTP/1.1 200

# 3. Install the new script at the SAME path (sudoers and the GitHub workflow stay unchanged)
install -o root -g root -m 750 /srv/apps/portableofficecabin.com/repo/deploy/deploy-portable-office.sh \
  /usr/local/bin/deploy-portable-office
/usr/local/bin/deploy-portable-office preflight

# 4. First release, run by hand and watched
/usr/local/bin/deploy-portable-office deploy
/usr/local/bin/deploy-portable-office status
```

After step 4 the live site runs from `releases/<id>` as `portable-office-b` on 3010; the legacy
`portable-office` PM2 process has been deleted and its directory `/srv/apps/portable-office` is left
on disk as a last-resort rollback. Every later merge to `main` deploys through the unchanged
workflow, alternating between the two slots; the second deploy recreates the `portable-office` name
from a release directory. Optional, later and only with approval: remove `/srv/apps/portable-office`
(2.5 GB) once a few releases have gone through cleanly.

## Rollback

| Situation | Action |
| --- | --- |
| Deploy failed before the switch | Nothing to do: production was never touched. The failed slot is deleted and the release is kept as `<id>.failed` for inspection. |
| Post-switch verification failed | The script has already switched nginx back to the old port; the new slot is left running for inspection. `deploy-portable-office status`. |
| Bad release found later | `sudo /usr/local/bin/deploy-portable-office rollback` re-activates `previous` on the idle slot (health-checked, then the nginx switch; about 20 s). `rollback <release-id>` targets any release shown by `list`. From GitHub: *Run workflow* with action = `rollback`. |
| Undo the migration (steps 2–3) | `install -m 750 /root/deploy-portable-office.legacy /usr/local/bin/deploy-portable-office`; `cp /root/portableofficecabin.com.nginx.bak /etc/nginx/sites-available/portableofficecabin.com && rm /etc/nginx/conf.d/portable-office-upstream.conf && nginx -t && systemctl reload nginx`. |
| Back to the legacy app after the first release | `pm2 start npm --name portable-office --cwd /srv/apps/portable-office -- start` → wait until `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/` prints 200 → `sed -i 's/:3010;/:3000;/' /etc/nginx/conf.d/portable-office-upstream.conf && nginx -t && systemctl reload nginx` → `pm2 delete portable-office-b && pm2 save`. |

## What is preserved

- Environment variables: the same `.env` content, now `shared/.env` (mode 600), read by every build
  and every process exactly as before.
- SSL and DNS: untouched. Certbot keeps managing the TLS lines of the site file; the only edit there
  is the `proxy_pass` target. DNS still points at the VPS.
- The PM2 process name `portable-office` (slot A), the root PM2 daemon and `pm2-root.service`.
- The GitHub trigger: a push to `main` runs the same workflow, the same SSH user and the same
  `sudo` command with no arguments. The `workflow_dispatch` input only adds a manual rollback.
- The running website: never stopped before its replacement has passed the health checks and has
  been verified through nginx.

## Operational notes

- A release is about 2.5 GB (mostly `node_modules`); three are kept (about 7.5 GB of 89 GB free).
- The new slots bind to `127.0.0.1` explicitly (the legacy process listens on `*:3000`).
- `npm ci` runs for every release (about a minute). Reusing the previous release's `node_modules`
  when `package-lock.json` is unchanged is a possible later optimisation.
- Suggested follow-ups, not part of this change: a 2 GB swapfile as an OOM safety net during
  builds; running the app as a non-root user; `proxy_http_version 1.1` + `keepalive` on the
  upstream.
