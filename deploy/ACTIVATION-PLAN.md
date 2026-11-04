# Activating the zero-downtime deploy on the VPS: step-by-step plan

**Status:** plan only. Nothing in this document has been run on the server.

**Who runs it:** someone with **root** on `srv2025838` (187.126.117.26). The GitHub `deploy` user cannot run these steps.

**Rule:** the production script `/usr/local/bin/deploy-portable-office` is replaced **only after** the new script has passed its own first deploy by hand (Phase 4). Until then GitHub keeps calling the old script, and the deploy workflow is switched off for the duration so it cannot run mid-migration.

`deploy/README.md` explains *why* this script exists (the in-place build window and cached 404s) and how it works. This plan turns its one-time installation into gated phases. Each phase has a backup, a health check, a go/no-go decision and a rollback.

---

## Facts this plan relies on

Read-only checks as the `deploy` user on 13 Oct 2026 at 12:30 UTC:

| Item | Value |
|---|---|
| Disk free on `/srv` | 87 GB of 96 GB (the script needs at least 8 GB) |
| RAM | 7.9 GB total, **6.4 GB available**, **no swap** (the script needs at least 1.5 GB available) |
| Listening ports | `*:3000` Portable Office · `3001` + `3002` Built on Trust · **3010 free** |
| Live app | `/srv/apps/portable-office`, in-place checkout. Deployed `c1dcc26`, BUILD_ID `GFwXTy_VKZztr04EchhiH` (the public HTML serves the same ID) |
| Installed deploy script | `/usr/local/bin/deploy-portable-office`, 827 bytes, dated 2026-10-02: the **legacy** in-place script |
| nginx | `sites-enabled/portableofficecabin.com` is a **symlink** to `sites-available/portableofficecabin.com`, with a single `proxy_pass http://127.0.0.1:3000;`. `conf.d/` is empty. |
| Not yet present | `/srv/apps/portableofficecabin.com/`, `/var/log/deploy-portable-office/` |
| Tools | node v22.23.3, `flock`, `ss`, `curl`, nginx 1.24, PM2 7.0.4 (root daemon) |

**These facts are three weeks old and could not be re-checked from here (no SSH access).** Phase 0 step 6 re-records them, read-only, before anything changes.

**Reviewed files.** Compare their checksums on the server before installing anything. These are git's LF content as changed by the release-based deployment PR (`infra/release-based-deployment`; the earlier table was for `c1dcc26`):

| File | SHA-256 |
|---|---|
| `deploy/deploy-portable-office.sh` | `b98d926ad4d393ec457477f31445e0b4d5a3339d9725b3c71aeda2ec6e1fd7ce` |
| `deploy/nginx/portable-office-upstream.conf` | `100efb227fa1062f0f242fe97e7d981669de259f701ad4591bb7ebf3c59bc53f` (unchanged) |
| `scripts/deploy/verify-release.mjs` | `59d5bb33b38cee2fa3fc47d8d3c83f2fce36af63d905ae4abc2f045f7feb629b` |
| `scripts/deploy/critical-routes.json` | `d8241c7297213822fcaa6200f39420d77fa3e7f69d8d16218e019b6f5ab7bb29` |

If `main` has changed these files since, re-review them and update the hashes before Phase 3. `critical-routes.json` is expected to change as pages change: re-review it rather than treating a new hash as a stop.

**Already verified without touching the VPS:** `.github/workflows/deploy-script-tests.yml` runs the script as root on Ubuntu 24.04 with real nginx, TLS, PM2, a second tenant and a 0.2 s poller. It covers these scenarios:
- first release;
- re-run of the same commit;
- failing build;
- a release that crashes at start-up;
- the gate blocking a 404, a wrong commit and a soft 404;
- chunks of the two previous builds still served after a deploy, and the redirect;
- rollback;
- concurrent lock;
- prune (failed releases counted separately);
- `main` rewound to an older commit (refused);
- an SSH drop mid-deploy (the deploy completes);
- `kill -9` before the switch (production untouched, the next run recovers).

Its run on the merge of #99 (`6280524`) was green for the scenarios that existed then. The release-based deployment PR's own CI run covers the rest.

### What changed since this plan was first written (release-based deployment PR)

The architecture is unchanged: releases, two PM2 slots, the nginx upstream switch, `flock`, `rollback`, the same sudoers line and the same workflow trigger. Added:

| Change | Effect on this plan |
|---|---|
| The gate fails a 200 that renders the not-found page. It checks `scripts/deploy/critical-routes.json`: the shipping and cargo pages, the Mysore and Mettur-Salem city pages, products, categories and the enquiry page, plus one redirect. It also checks every JS/CSS file and image those pages load, and that the new release serves the live build's chunks. | Phase 4 expects `critical 9, redirects 1, assets …, continuity …` on the gate's summary line. The post-deploy check in GitHub runs the same checks on the public site. |
| Static files of the live build **and** the other retained releases (up to 3 builds) are carried into each new release. | Tabs opened one or two deploys back keep loading their chunks. About 70 MB more per release at most. |
| A deploy is refused when `main` does not contain the live commit. | A rewound `main` cannot replace newer code. Going back is `rollback`. After a deliberate rewrite of `main`, run `deploy --allow-non-descendant` once as root. |
| The script ignores SIGHUP, and its log keeps being written when the SSH channel closes. | A dropped connection no longer cuts a deploy in half. The GitHub run may turn red, but the server log shows the outcome. |
| Retention: 3 good releases plus the newest failed one (failed ones no longer push good ones out). | About 15 GB steady and 19 GB at the deploy peak (Phase 6). |
| The workflow job runs only from `main` and names the `production` environment. | See "GitHub environment" below. Optional, but it closes the last branch-to-production path. |

---

## Phase 0: preparation (nothing changes on the server)

1. **Choose a window:** low traffic, for example 23:00–01:00 IST. Allow about **60–90 minutes**. The first release builds for 4–6 minutes, and every check below takes time too.
2. **Freeze merges to `main`** for the whole window. Tell everyone who can merge.
3. **Turn off the deploy workflow:** GitHub → Actions → *Deploy Portable Office* → `···` → **Disable workflow**.
   - **Why:** after Phase 4 the legacy PM2 process no longer exists. The legacy script must never run again, so the workflow stays off until Phase 5 puts the new script at the production path.
   - **Check:** the workflow page shows "This workflow was disabled".
4. **Full VPS snapshot:** Hostinger panel → VPS → *Snapshots & Backups* → **Create snapshot**. Wait until it completes. This is the last-resort rollback for the whole server (both tenants).
5. **Record a baseline from outside:**
   - Every sitemap URL answers 200.
   - Note the public BUILD_ID: `curl -s https://portableofficecabin.com/ | head -c 80`.
   - Note the Built on Trust home status: `curl -sI https://builtontrustconstruction.com/ | head -1`.
6. **Re-record the facts table** (read-only; the table above dates from 13 Oct):
   ```bash
   df -h /srv | tail -1; free -m | sed -n 2,3p; swapon --show
   ss -ltnp | grep -E ':(3000|3001|3002|3010) '      # 3010 must be free
   node -v; pm2 -v; nginx -v 2>&1; tee --version | head -1   # coreutils >= 8.24 for `tee -p`
   cat /srv/apps/portable-office/.next/BUILD_ID; git -C /srv/apps/portable-office log -1 --format='%h %s'
   ls -la /usr/local/bin/deploy-portable-office; sha256sum /usr/local/bin/deploy-portable-office
   ```
   **Stop** if free disk is under 25 GB, available RAM is under 2 GB, port 3010 is taken, or the installed script is no longer the 827-byte legacy one.

**Go/no-go:** the snapshot exists, the workflow is disabled, the merge freeze is announced, the baseline is recorded and the facts still hold.

---

## Phase 1: backups and safety net (root; no behaviour change)

```bash
# 1a. Backups of everything the later phases touch
cp -a /etc/nginx/sites-available/portableofficecabin.com /root/portableofficecabin.com.nginx.bak
cp -a /usr/local/bin/deploy-portable-office               /root/deploy-portable-office.legacy
pm2 save                                                   # current process list -> /root/.pm2/dump.pm2
cp -a /root/.pm2/dump.pm2 /root/pm2-dump-before-migration.pm2
pm2 jlist | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>JSON.parse(s).forEach(p=>console.log(p.name,p.pid)))' \
  | tee /root/pm2-before-migration.txt                    # expect: portable-office + the built-on-trust process(es)
md5sum /etc/nginx/sites-available/builtontrustconstruction.com | tee /root/bot-nginx-before.md5
cat /srv/apps/portable-office/.next/BUILD_ID | tee /root/build-id-before-migration.txt

# 1b. Recommended: 2 GB swap as an out-of-memory safety net. During a deploy the build and two
#     next-servers run side by side, and the host has no swap.
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
swapon --show                                              # expect /swapfile 2G
```

**Health check:**
- `curl -sI https://portableofficecabin.com/ | head -1` → `HTTP/1.1 200`.
- The BUILD_ID is unchanged.

**Rollback:** nothing to undo. Swap can be removed with `swapoff /swapfile && rm /swapfile` plus deleting the fstab line.

---

## Phase 2: directories, clone and nginx upstream (root; traffic still goes to the same app)

```bash
# 2a. Layout + shared files (copies only; the live checkout is not modified)
install -d -m 755 /srv/apps/portableofficecabin.com /srv/apps/portableofficecabin.com/releases \
  /srv/apps/portableofficecabin.com/shared /srv/apps/portableofficecabin.com/shared/public/bimi
cp -a /srv/apps/portable-office/public/bimi/logo.svg /srv/apps/portableofficecabin.com/shared/public/bimi/
git clone https://github.com/portableofficecabin-lang/Portable-Office.git /srv/apps/portableofficecabin.com/repo
cd /srv/apps/portableofficecabin.com/repo && git log -1 --format='%h %s'
sha256sum deploy/deploy-portable-office.sh deploy/nginx/portable-office-upstream.conf scripts/deploy/verify-release.mjs
#   ↑ must equal the table above — STOP on any mismatch

# 2b. nginx upstream that points at the CURRENT app (port 3000) → identical behaviour
grep -c 'proxy_pass http://127.0.0.1:3000;' /etc/nginx/sites-available/portableofficecabin.com   # expect 1
install -m 644 /srv/apps/portableofficecabin.com/repo/deploy/nginx/portable-office-upstream.conf \
  /etc/nginx/conf.d/portable-office-upstream.conf
sed -i 's#proxy_pass http://127.0.0.1:3000;#proxy_pass http://portable_office;#' \
  /etc/nginx/sites-available/portableofficecabin.com
nginx -t && systemctl reload nginx
```

**Health check:**
- `curl -sI --resolve portableofficecabin.com:443:127.0.0.1 https://portableofficecabin.com/ | head -1` → 200.
- The public BUILD_ID is unchanged.
- `curl -sI https://builtontrustconstruction.com/ | head -1` gives the same status as the baseline.
- `md5sum -c /root/bot-nginx-before.md5` → OK.

**Rollback (about 10 s):**
```bash
cp /root/portableofficecabin.com.nginx.bak /etc/nginx/sites-available/portableofficecabin.com
rm /etc/nginx/conf.d/portable-office-upstream.conf && nginx -t && systemctl reload nginx
```

**Go/no-go:** the site and the other tenant are unchanged, and `nginx -t` is clean.

---

## Phase 3: stage the new script at a candidate path (the production path stays untouched)

```bash
install -o root -g root -m 750 /srv/apps/portableofficecabin.com/repo/deploy/deploy-portable-office.sh \
  /usr/local/sbin/deploy-portable-office.candidate
sha256sum /usr/local/sbin/deploy-portable-office.candidate        # = b98d926ad4d393ec…
/usr/local/sbin/deploy-portable-office.candidate preflight
#   expect: "preflight OK: live=portable-office:3000 idle=portable-office-b:3010 disk=…G free mem=…MB avail node=v22.23.3"
```

`preflight` is read-only: it checks tools, layout, nginx, ports, disk and RAM.

**Rollback:** `rm /usr/local/sbin/deploy-portable-office.candidate`.

**Go/no-go:** `preflight OK`.

---

## Phase 4: the first release, run by hand with the candidate (traffic moves only after the gate passes)

```bash
/usr/local/sbin/deploy-portable-office.candidate deploy 2>&1 | tee /root/first-release.log
#   expect in order: "git: cloning"/fetch → build → "static: … carried" → "verify: PASSED" (on :3010,
#   before any switch; its summary shows "critical 9, redirects 1, assets <n>, continuity <n>" with
#   0 failures) → nginx switch → verification through nginx → "Deployment successful" → DEPLOYED_BUILD_ID=<id>
grep -E "verify: .*(critical|continuity)|static: " /root/first-release.log   # the new checks, for the record
/usr/local/sbin/deploy-portable-office.candidate status
pm2 jlist | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>JSON.parse(s).forEach(p=>console.log(p.name,p.pid)))'
#   expect: portable-office-b (new) + the built-on-trust process(es) with the SAME pids as /root/pm2-before-migration.txt
md5sum -c /root/bot-nginx-before.md5                       # expect OK
cat /etc/nginx/conf.d/portable-office-upstream.conf | grep server   # expect 127.0.0.1:3010
```

**What the script guarantees:**
- A failure at any point before the nginx switch (build, start, route gate) leaves production exactly as it was. The failed release is kept as `<id>.failed`.
- If verification through nginx fails after the switch, the script switches nginx straight back to :3000 while the old process is still running.

**Health checks from outside** (the person running this, or Claude on request):
- The public HTML serves the new `DEPLOYED_BUILD_ID`.
- Every sitemap URL answers 200 and none is the not-found page. Every city page (63 on 4 Nov) passes the SSR audit.
- The SEO live audit shows 0 errors.
- The anonymous cart → checkout flow at 320 and 1440 px: product page, Add to Cart, cart persists on reload, checkout without login, PIN code → transport, Pay button enabled.
- No horizontal overflow at 320 / 375 / 390 / 768 / 1440 px.
- Built on Trust answers as at the baseline.

**Rollback:**

| Situation | Action |
|---|---|
| Script failed before the switch | Nothing to do: production is untouched. Investigate `/var/log/deploy-portable-office/` and the `.failed` release. |
| Script reverted after the switch | Nothing to do: nginx is back on :3000 and the legacy process is still serving. |
| Problems found after a successful switch | Return to the legacy app (about 1 min, below). The legacy checkout `/srv/apps/portable-office` is still on disk and intact. |

```bash
# Back to the legacy app after the first release
pm2 start npm --name portable-office --cwd /srv/apps/portable-office -- start
until [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/)" = 200 ]; do sleep 2; done
sed -i 's/:3010;/:3000;/' /etc/nginx/conf.d/portable-office-upstream.conf && nginx -t && systemctl reload nginx
pm2 delete portable-office-b && pm2 save
# then Phase 2's rollback returns nginx to the original proxy_pass line
```

**Go/no-go for Phase 5:** every health check above passes.

---

## Phase 5: make it the production script and prove the GitHub path and rollback

```bash
install -o root -g root -m 750 /usr/local/sbin/deploy-portable-office.candidate /usr/local/bin/deploy-portable-office
sha256sum /usr/local/bin/deploy-portable-office          # = b98d926ad4d393ec…  (legacy copy stays in /root)
```

1. **Re-enable the deploy workflow:** GitHub → Actions → *Deploy Portable Office* → **Enable workflow**.
2. **Run it by hand:** *Run workflow* → action `deploy`.
   - It builds a fresh release, also for an unchanged commit.
   - **Expected:** green, and the "Verify the deployed pages" step logs *"The server reported BUILD_ID … every page must come from it"*. The "legacy in-place script" notice must no longer appear.
3. **Rollback drill:** *Run workflow* → action `rollback`.
   - **Expected:** green in about 20 s, and the public BUILD_ID is the Phase 4 release.
4. **Run `deploy` once more**, so the newest release is live again.
5. **Lift the merge freeze.**
6. **Watch the next real merge's Deploy run** to confirm it shows `DEPLOYED_BUILD_ID` and a green verification.

**Rollback (undo the script replacement):**
```bash
install -o root -g root -m 750 /root/deploy-portable-office.legacy /usr/local/bin/deploy-portable-office
```
Use this only together with "Back to the legacy app" above: the legacy script expects the in-place process on :3000.

---

## GitHub environment (owner, in GitHub settings; any time, independent of the VPS phases)

The deploy job names the environment `production` and refuses to run from any branch but `main`. The SSH key is still a **repository** secret, though, and any workflow file pushed on any branch by someone with write access can read repository secrets. To close that path:

1. GitHub → Settings → Environments → **production**. It appears after the first deploy run that names it, or create it there.
2. **Deployment branches and tags** → *Selected branches and tags* → add `main` only.
3. Add the secret **`HOSTINGER_SSH_KEY`** to this environment, with the same value as the repository secret.
4. Run *Deploy Portable Office* → *Run workflow* (from `main`) once, and confirm it is green.
5. Then, **with separate approval**, delete the repository-level `HOSTINGER_SSH_KEY`. Afterwards only a job running for `main` in `production` can read the key.

**Rollback:** re-add the repository secret. The environment can stay.

---

## Phase 6: after activation

- For the first three merges, check each Deploy run, `sudo deploy-portable-office status` and `/var/log/deploy-portable-office/`.
- Disk: three good releases plus the newest failed one are kept, about 3.8 GB each: about 15 GB steady and 19 GB while a deploy builds. Old ones are pruned automatically. The preflight refuses a deploy below 8 GB free.
- **Only with separate approval, after about a week of clean releases:**
  - remove `/srv/apps/portable-office` (about 2.5 GB);
  - delete the Hostinger snapshot.

## Never during this work

- Never run `full_schema.sql`, and make no database changes: this plan touches no data.
- Do not edit sudoers. The existing line already allows the script's arguments.
- Do not touch Built on Trust's directories, ports (3001/3002), PM2 processes or nginx block.
- Do not run `pm2` as the `deploy` user: it spawns a stray user-level daemon.
- Do not delete `/srv/apps/portable-office` during the window. It is the fallback.
