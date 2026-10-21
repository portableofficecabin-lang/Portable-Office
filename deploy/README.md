# Production deploy — Hostinger VPS

`.github/workflows/deploy-hostinger.yml` runs on every push to `main`: it SSHes to the VPS as
`deploy` and runs `sudo /usr/local/bin/deploy-portable-office`, then verifies the public site.

**After the one-time installation below, merging a PR is all it takes**: the workflow builds the
merged commit in its own release directory, proves every page of it works on a private port,
switches nginx to it without dropping a request, re-checks the public site, and keeps the
previous release ready for a one-command rollback. No VPS or terminal step is needed per merge.

Until that installation is done, the server still runs the legacy in-place script described in
the next section, with its known window of 404s.

## Build identity: which commit is live (works with both scripts)

`GET https://portableofficecabin.com/api/build-info` (read-only JSON, `no-store`, `noindex`):

```json
{ "commit": "<40-hex sha>", "buildId": "<sha12>-<base36>", "builtAt": "<ISO>", "startedAt": "<ISO>" }
```

| Field | Source | What it proves |
| --- | --- | --- |
| `commit` | Fixed by `next.config.ts` when `next build` starts. The first valid value of: `DEPLOY_COMMIT_SHA`, `REVISION` (written by the release script, whose `git archive` export has no `.git`), `git rev-parse HEAD` (the legacy in-place checkout, and CI), `GITHUB_SHA`. Otherwise `"unknown"`. | The exact commit the serving build was made from |
| `buildId` | `generateBuildId` returns `<sha12>_<base36 ms>`, so this is Next's `BUILD_ID`, and every page carries it as `"b"` in its RSC payload | Each page can be tied to the same build; the ID is still unique per build, so the stale-page checks keep working on a re-run of the same commit |
| `builtAt` | Build start time, inlined at build time | When the live build was made |
| `startedAt` | `process.uptime()` of the process answering | `startedAt < builtAt` means the process was not restarted after the build: it still runs the previous code |

After every deploy, `.github/workflows/deploy-hostinger.yml` works out which commit the server built:
- `DEPLOYED_REVISION=` from the release script, or the legacy script's `=== Deployment successful: <sha> ===` / `Target: <sha>` lines.
- If the server built a newer `main` than the run's commit (it deploys `origin/main` when the job runs), GitHub must confirm the newer commit contains the run's commit.

`scripts/deploy/verify-release.mjs --expect-commit <sha>` then requires:
- `/api/build-info` names exactly that commit;
- the serving process started after the build;
- every city page carries the reported build ID.

Any mismatch fails the run with the reason. The PR build job runs the same check against the build of the PR itself. The run summary records the live JSON.

Security: the repository is public and the build ID was already in every page, so nothing new is disclosed. No environment variables, paths, hostnames or versions are read or returned. `/api/` is disallowed in `robots.txt`, and the endpoint is not in the sitemap.

**Fixed with this change.** Next 15 (App Router) prints the build ID reliably in one place only: the RSC payload, `\"b\":\"<id>\"`, on every page. The checks used two other markers, measured on production on 2026-10-17:
- **`/_next/static/<id>/`** is a Pages Router path that this site's HTML never contains, not even right after a build. The release script's health check and nginx check looked only for it, so once installed the script would have aborted every deploy.
- **`<!--<id>-->`** is written only into pages prerendered at build time, with `-` rewritten to `_` and the ID cut to 24 characters. ISR-regenerated pages lose it: 0 of 20 live city pages had it, hours after a deploy. So `verify-release.mjs` could only confirm a build right after it went live, and only for an ID without a hyphen.

The test fixtures printed both old markers, so CI never noticed. Both the fixtures and the checks now rely on the RSC marker. The old markers are still accepted as extra evidence.

## Root cause of the "new page answers 404" incidents (2026-10-10 and 2026-10-12)

The installed script (`/usr/local/bin/deploy-portable-office`, 827 bytes, root-only, dated Oct 2)
does `git fetch` → `git reset --hard` → `npm ci` → `next build` **inside the live directory**
`/srv/apps/portable-office` → `pm2 reload`. Two defects follow from that:

1. **The old process poisons the new build.** `next build` rewrites `.next/` while the old
   `next-server` keeps serving from the same directory. When a request for a page that exists only
   in the new commit reaches the old process after the build has prerendered that page but before
   the reload, the old code (which does not know the page) writes its 404 into the **new** build's
   ISR cache. The new process then serves that cached 404 (`x-nextjs-cache: HIT`) for up to the
   revalidate window of one hour. Evidence from the VPS:
   - #92 Shipping Container in Mysore: `shipping-container-in-mysore.meta` = `"status":404` written
     10:20:17Z, after static generation finished (10:19:59Z), 3.6 s before `Reloading PM2` (10:20:20Z).
   - #94 Shipping Container in Mettur, Salem: `.html/.meta/.rsc` rewritten 10:46:21Z with
     `"status":404`, 15 s after the build (10:46:06Z), 30 s before the new process started (10:46:51Z).

   `dynamicParams = false` on the city route (PR #75) did not prevent it. The same race can also
   freeze a stale 200 of an **updated** page, and it applies to every ISR route (products,
   promotions, blog), not only city pages.
2. **A re-run cannot repair it.** The legacy script prints `Current: <sha> / Target: <sha> /
   Already up to date.` and exits when `main` has not moved (proven by run 38240824471): no build,
   no reload. Both incidents were only cleared by the *next* merge.
3. **An interrupted build leaves the live directory half-built (2026-10-21, #166).** Run
   39610102765 (deploy #95, 12ddd61) lost its SSH session during `next build`
   (`client_loop: send disconnect: Broken pipe`, exit 255, about 4.5 minutes into the step). By then
   the script had already reset the live directory to the new commit, run `npm ci` and started
   rewriting `.next/`, but it never reached `pm2 reload`. The old process kept serving: `/`, the
   product pages and checkout stayed 200, while 57 ISR pages (all 45 city pages, the 11
   `/products/portable-cabin/*` guides and the prefab marketing office) answered cached 404s
   (`x-nextjs-cache: HIT`). Attempt 2 of the same run printed `Already up to date` (defect 2), so
   only a new commit on `main` triggers the full build and reload that repairs it.

## The fix: release-based, blue/green deploys (`deploy/deploy-portable-office.sh`)

Every deploy builds the commit in a **new directory**, and the old process never shares a file
with it. Traffic moves only after the new release has passed the full route gate, and nginx
moves it atomically.

| Requirement | How it is met |
| --- | --- |
| Build without touching the live site | `git archive` of the commit into `releases/<utc-stamp>-<sha7>/`, `npm ci --include=dev`, `next build` there. The live directory and process are never written to. |
| Caches cannot be corrupted by the old version | `.next/cache` of the new release is a **copy** seeded from the live release (webpack cache; `next/image` files older than 2 min), not a shared directory. Each release writes only its own `.next/server/app` ISR cache. |
| Every existing and new route present before the switch | `scripts/deploy/verify-release.mjs` runs against the new release on its idle port: every city slug in the release's `src/data/cityPages.ts` must be in `.next/prerender-manifest.json`, answer 200 and carry **this** BUILD_ID; `/`, `/cities-we-serve`, `/products`, `/sitemap.xml`, `/robots.txt` must answer 200; every URL of the new sitemap must answer 200. Pages that disappear from the sitemap are listed as warnings. Any failure leaves production untouched. |
| Atomic switch, automatic rollback | The nginx upstream include is rewritten, `nginx -t`, graceful `systemctl reload nginx` (in-flight requests finish). The site is then re-verified **through nginx over TLS** (BUILD_ID on `/` and every city page). If that fails, the script writes the old port back and reloads again while the old process is still running. Bad releases found later: `rollback`. |
| Re-running a failed deploy really rebuilds | Every `deploy` builds a fresh release, also when the commit is already live (logged as "already live — building a FRESH release"). |
| Automatic deploy after every merge | Unchanged trigger: push to `main` → same SSH user → same `sudo` command, no arguments, no sudoers change. |
| Open browser tabs keep working | The live build's own `/_next/static` files are copied into the new release (no-clobber), so pages opened before a switch can still load their JS chunks afterwards. |
| Built on Trust unaffected | The script only touches PM2 names `portable-office` / `portable-office-b`, ports 3000 / 3010, `/srv/apps/portableofficecabin.com`, `/etc/nginx/conf.d/portable-office-upstream.conf` and the `proxy_pass` line of `/etc/nginx/sites-available/portableofficecabin.com`. `nginx -t` gates every reload; reloads are graceful for every server block. The CI test asserts the other tenant's PID, nginx block and responses are unchanged after every scenario. |

### What PR #77 already had, and what this change adds or fixes

PR #77 (merged, **never installed**) introduced the release directories, the two PM2 slots, health
checks, the nginx switch with its TLS re-check and revert, `rollback`, `flock` and logs. Installed
as merged, it would have failed every deploy:

- **Bug 1: `.env` is tracked in git.** `git archive` already writes `.env`, so its
  `ln -s shared/.env release/.env` fails ("File exists") and aborts the run. Now the committed
  `.env` stays as git has it, and server-only secrets go in one optional `shared/.env.local`
  (Next loads it with priority), linked into every release.
- **Bug 2: global `NODE_ENV=production`.** With it set, `npm ci` skips devDependencies
  (`tailwindcss`, `postcss`, `autoprefixer`, `typescript`), so `next build` fails. Now
  `npm ci --include=dev` is used, and production mode is set only for `next start`.
- **Gap: weak pre-switch gate.** It checked only 5 paths. Now the full route gate runs (see the
  table), both before the switch and through nginx after it.
- **Gap: shared runtime cache.** A shared `.next/cache` directory was written by the old process
  while the new build used it. It is now a per-release copy.
- **Gap: no skew protection.** The old build's static assets are now carried over.
- **Gap: no build ID check from GitHub.** The script now prints `DEPLOYED_BUILD_ID=` /
  `DEPLOYED_REVISION=`, and the workflow requires the public site to serve that exact build and
  commit (see "Build identity" above; the commit check also works with the legacy script).
- **Workflow:** `ssh-keyscan` retries (a runner flake made a manual run fail on 2026-10-12), the
  routes a push introduces are checked first and named, and verification uses the same
  `verify-release.mjs`.

## Tests (`.github/workflows/deploy-script-tests.yml`, runs on every PR touching the pipeline)

- `node --test scripts/deploy/verify-release.test.mjs`: 25 tests for the route gate. They cover:
  - slug and sitemap parsing against the real `cityPages.ts`;
  - the App Router build-ID marker;
  - `/api/build-info` checks: wrong commit, missing endpoint, a 500 error, an HTML page or broken
    JSON at status 200, a process older than its build, and a build-ID mismatch;
  - a local fake release, serving HTML shaped like real Next 15, that answers a cached 404, a stale
    page from an older build, a page missing from the prerender manifest, `/` served by another
    build, a broken sitemap URL, new routes, vanished pages (warning only) and an unreachable
    server.
- `shellcheck` + `bash -n` for both shell scripts.
- `deploy/test/integration.sh` runs on a GitHub runner, never the VPS. It uses real nginx with TLS,
  real PM2, git, npm, flock and symlinks. It recreates today's production layout: the legacy app
  on `*:3000` behind `proxy_pass http://127.0.0.1:3000;`, plus a "Built on Trust" site on :3002
  with its own server block. It applies the migration below, then runs the installed script
  through these scenarios:

  | Scenario | Expected result |
  | --- | --- |
  | First release after migration (adds a page) | Live, the new page returns 200; env, public files, cache and static assets carried over; both route gates confirm the release's exact commit (printed in the CI log) |
  | Re-run of the same commit | A fresh release is built and goes live |
  | Failing build | Production untouched |
  | New page that 404s in the new build | The gate blocks the switch; production untouched |
  | New release reports another commit (`/api/build-info`) | The gate blocks the switch; production, the live slot and the upstream are untouched |
  | Good deploy, then `rollback` | The previous release is live again |
  | Two concurrent deploys | The second is refused by the lock |
  | Prune | Old releases removed, current/previous kept |

  A poller requests the site every 0.2 s during each deploy, and a single non-200 fails the test.
  After every scenario the other tenant's PID, nginx block and response are compared.

## Layout after installation

```
/srv/apps/portableofficecabin.com/
├── releases/<utc-stamp>-<sha7>/   one directory per deploy (source export + node_modules + .next)
├── current  -> releases/…         live release (bookkeeping; rollback source of truth)
├── previous -> releases/…         the release before it (default rollback target)
├── shared/.env.local              OPTIONAL server-only secrets (root, mode 600), linked into each release
├── shared/public/bimi/logo.svg    server-only public files, copied into each release's public/
└── repo/                          cached clone used for `git fetch` + `git archive`
```

Two PM2 slots, one live at a time, selected by `/etc/nginx/conf.d/portable-office-upstream.conf`:

| Slot | PM2 name | Port |
| --- | --- | --- |
| A | `portable-office` (the existing name, kept) | 127.0.0.1:3000 |
| B | `portable-office-b` | 127.0.0.1:3010 |

Deploy sequence, failure handling and logs are in the header of `deploy-portable-office.sh`. Every
run is logged to `/var/log/deploy-portable-office/`, and a `flock` prevents overlapping runs.

## One-time installation (root on the VPS — needs the owner's approval)

The site stays up throughout. Steps 0–3 are reversible, and step 4 switches traffic only after the
gate passes. Each step prints what to expect; stop on any mismatch.

```bash
# 0. Backups + a record of the other tenant before anything changes
cp -a /etc/nginx/sites-available/portableofficecabin.com /root/portableofficecabin.com.nginx.bak
cp -a /usr/local/bin/deploy-portable-office /root/deploy-portable-office.legacy
pm2 jlist | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>JSON.parse(s).forEach(p=>console.log(p.name,p.pid)))' \
  | tee /root/pm2-before-migration.txt          # expect portable-office + the built-on-trust process(es)
md5sum /etc/nginx/sites-available/builtontrustconstruction.com | tee /root/bot-nginx-before.md5

# 1. Layout + shared files (copies; the live checkout is not modified)
install -d -m 755 /srv/apps/portableofficecabin.com /srv/apps/portableofficecabin.com/releases \
  /srv/apps/portableofficecabin.com/shared /srv/apps/portableofficecabin.com/shared/public/bimi
cp -a /srv/apps/portable-office/public/bimi/logo.svg /srv/apps/portableofficecabin.com/shared/public/bimi/
git clone https://github.com/portableofficecabin-lang/Portable-Office.git /srv/apps/portableofficecabin.com/repo
# Optional, only when server-only secrets exist (e.g. RAZORPAY_KEY_SECRET, SUPABASE_SERVICE_ROLE_KEY):
#   install -o root -g root -m 600 /dev/null /srv/apps/portableofficecabin.com/shared/.env.local
#   then add KEY=value lines to it with an editor. Never commit them.

# 2. nginx: an upstream block that points at the CURRENT app → no behaviour change
grep -c 'proxy_pass http://127.0.0.1:3000;' /etc/nginx/sites-available/portableofficecabin.com   # expect 1
install -m 644 /srv/apps/portableofficecabin.com/repo/deploy/nginx/portable-office-upstream.conf \
  /etc/nginx/conf.d/portable-office-upstream.conf
sed -i 's#proxy_pass http://127.0.0.1:3000;#proxy_pass http://portable_office;#' \
  /etc/nginx/sites-available/portableofficecabin.com
grep -n proxy_pass /etc/nginx/sites-available/portableofficecabin.com   # expect: proxy_pass http://portable_office;
nginx -t && systemctl reload nginx
curl -sI --resolve portableofficecabin.com:443:127.0.0.1 https://portableofficecabin.com/ | head -1          # expect HTTP/1.1 200
curl -sI --resolve builtontrustconstruction.com:443:127.0.0.1 https://builtontrustconstruction.com/ | head -1  # unchanged

# 3. Install the new script at the SAME path (sudoers and the GitHub trigger stay unchanged)
install -o root -g root -m 750 /srv/apps/portableofficecabin.com/repo/deploy/deploy-portable-office.sh \
  /usr/local/bin/deploy-portable-office
/usr/local/bin/deploy-portable-office preflight          # expect "preflight OK: live=portable-office:3000 idle=portable-office-b:3010 ..."

# 4. First release — run by hand and watch it (or: Actions → Deploy Portable Office → Run workflow)
/usr/local/bin/deploy-portable-office deploy             # expect "verify: PASSED", "Deployment successful", DEPLOYED_BUILD_ID=...
/usr/local/bin/deploy-portable-office status
pm2 jlist | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>JSON.parse(s).forEach(p=>console.log(p.name,p.pid)))'
#   expect portable-office-b (new) + the built-on-trust process(es) with the SAME pids as in step 0
md5sum -c /root/bot-nginx-before.md5                     # expect OK
```

After step 4 the site runs from `releases/<id>` as `portable-office-b` on 3010. The legacy
`portable-office` PM2 process has been deleted, and `/srv/apps/portable-office` stays on disk as a
last-resort rollback. Later deploys alternate between the two slots automatically. Optional, later,
and only with approval: remove `/srv/apps/portable-office` (about 2.5 GB) after a few clean releases.

**Permissions needed: root, once,** for these steps. The workflow's `deploy` user and sudoers line
(`deploy ALL=(root) NOPASSWD: /usr/local/bin/deploy-portable-office`) stay exactly as they are.
No DNS, certificate or Certbot change is involved: only the `proxy_pass` line of the site file
changes.

## Rollback

| Situation | Action |
| --- | --- |
| Deploy failed before the switch (build, gate) | Nothing to do: production was never touched. The failed slot is deleted, and the release is kept as `<id>.failed` for inspection. |
| Post-switch verification failed | The script has already switched nginx back to the old port. The new slot is left running for inspection (`deploy-portable-office status`). |
| Bad release noticed later | Actions → Deploy Portable Office → Run workflow → action `rollback` (or `sudo /usr/local/bin/deploy-portable-office rollback`). The previous release is health-checked and gated, then nginx switches (about 20 s). `rollback <release-id>` targets any release shown by `list`. |
| Undo the installation (steps 2–3) | `install -m 750 /root/deploy-portable-office.legacy /usr/local/bin/deploy-portable-office`; `cp /root/portableofficecabin.com.nginx.bak /etc/nginx/sites-available/portableofficecabin.com && rm /etc/nginx/conf.d/portable-office-upstream.conf && nginx -t && systemctl reload nginx` |
| Back to the legacy app after the first release | `pm2 start npm --name portable-office --cwd /srv/apps/portable-office -- start` → wait until `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/` prints 200 → `sed -i 's/:3010;/:3000;/' /etc/nginx/conf.d/portable-office-upstream.conf && nginx -t && systemctl reload nginx` → `pm2 delete portable-office-b && pm2 save`. |

## Production facts (read-only audits 2026-10-10 and 2026-10-12, as the `deploy` user)

| Item | Finding |
| --- | --- |
| Host | `srv2025838`, 187.126.117.26, Ubuntu 24.04.5, 2 vCPU, 7.9 GB RAM (about 6.2 GB available), no swap, 96 GB disk (87 GB free) |
| Node / PM2 / nginx | Node v22.23.3, npm 10.9.9, PM2 7.0.4, nginx 1.24.0. The PM2 daemon runs as root (`PM2_HOME=/root/.pm2`). `pm2-root.service` is enabled (it resurrects the saved list at boot). |
| Live app | PM2 `portable-office`, `npm start` → `next start` → `next-server` 15.5.19 on `*:3000`, from `/srv/apps/portable-office` (root-owned git checkout; `.next/cache` 1.3 GB, `node_modules` 938 MB) |
| Server-only files | `.env` equals the committed file. Only `public/bimi/` is untracked. No `.env.local` exists. |
| nginx | `sites-enabled/portableofficecabin.com` has one `proxy_pass http://127.0.0.1:3000;`, Certbot TLS, `error_page` → `/error.html`, no proxy cache. `conf.d/` is empty (included at `http` level). |
| Other tenant | Built on Trust: next 16.3.4 on 0.0.0.0:3001 and 0.0.0.0:3002 from `/srv/apps/built-on-trust*`, own server block `builtontrustconstruction.com`. Port **3010 is free**. PostgreSQL on 127.0.0.1:5432. |
| sudo | `deploy` may run only `/usr/local/bin/deploy-portable-office` (no argument list ⇒ arguments allowed, env reset, no SETENV). |

## nginx micro-cache (`deploy/nginx.conf`)

The live server does not run this config (responses carry no `X-Cache-Status`). If it is enabled
later, note that nginx honours the upstream `Cache-Control: s-maxage=3600` that `next.config.ts`
sends on every public HTML response, including 404s. Add `proxy_ignore_headers Cache-Control
Expires;` to the `location /` block before switching it on.

## Operational notes

- A release is about 2.5 GB plus a copied build cache (about 1.3 GB). Three are kept (about 11 GB
  of 87 GB free). The preflight requires 8 GB free and 1.5 GB of available RAM.
- `npm ci` runs for every release (about one minute). The deploy takes longer than today's in-place
  build (about 4–6 minutes), but the site keeps serving the old release until the new one is
  proven.
- During a deploy the old and new `next-server` run side by side for a few seconds, plus the build
  itself. Suggested follow-up, not part of this change: a 2 GB swapfile as an OOM safety net (the
  host has no swap).
