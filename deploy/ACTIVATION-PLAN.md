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

**Reviewed files.** Compare their checksums on the server before installing anything. These are git's LF content at `main` = `c1dcc26`:

| File | SHA-256 |
|---|---|
| `deploy/deploy-portable-office.sh` | `0a9419263e0b72b46440b9ed5e2d360ebe305885a4601d81323cb858c2ac13e7` |
| `deploy/nginx/portable-office-upstream.conf` | `100efb227fa1062f0f242fe97e7d981669de259f701ad4591bb7ebf3c59bc53f` |
| `scripts/deploy/verify-release.mjs` | `30caa3782505f606f998532f662a9f16c2ded3d25169a276ce1323902537f06c` |

If `main` has changed these files since, re-review them and update the hashes before Phase 3.

**Already verified without touching the VPS:** `.github/workflows/deploy-script-tests.yml` runs the script as root on Ubuntu 24.04 with real nginx, TLS, PM2, a second tenant and a 0.2 s poller. It passes all scenarios: first release, re-run, failing build, gate blocks a 404, rollback, concurrent lock, prune. Its run on the merge of #99 (`6280524`) was green.

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

**Go/no-go:** the snapshot exists, the workflow is disabled, the merge freeze is announced, and the baseline is recorded.

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
sha256sum /usr/local/sbin/deploy-portable-office.candidate        # = 0a9419263e0b72b4…
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
#   expect in order: "git: cloning"/fetch → build → "verify: PASSED" (on :3010, before any switch)
#   → nginx switch → verification through nginx → "Deployment successful" → DEPLOYED_BUILD_ID=<id>
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
- Every sitemap URL answers 200, and the city-page SSR audit passes 27/27.
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
sha256sum /usr/local/bin/deploy-portable-office          # = 0a9419263e0b72b4…  (legacy copy stays in /root)
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

## Phase 6: after activation

- For the first three merges, check each Deploy run, `sudo deploy-portable-office status` and `/var/log/deploy-portable-office/`.
- Disk: three releases are kept, roughly 11 GB. Old ones are pruned automatically.
- **Only with separate approval, after about a week of clean releases:**
  - remove `/srv/apps/portable-office` (about 2.5 GB);
  - delete the Hostinger snapshot.

## Never during this work

- Never run `full_schema.sql`, and make no database changes: this plan touches no data.
- Do not edit sudoers. The existing line already allows the script's arguments.
- Do not touch Built on Trust's directories, ports (3001/3002), PM2 processes or nginx block.
- Do not run `pm2` as the `deploy` user: it spawns a stray user-level daemon.
- Do not delete `/srv/apps/portable-office` during the window. It is the fallback.
