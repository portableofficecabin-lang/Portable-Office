# Release-based deploy: read-only preflight, recovery readiness and pinned activation

**Pinned commit (`APPROVED_SHA`):** `2294a4368155c023216a5440339c34780603371b`

This is the merge of PR #314 (Shipping & Storage Containers in Singasandra) into `main` on 2026-11-23 at 03:28:08Z. Its parents are `0f20e7e` (the #312 merge) and `d88b8b2` (the #314 head). It is what production serves now: `/api/build-info` gives this commit, build `2294a4368155_mwsphyk6` (built 03:28:46Z, process started 03:29:54Z). Its Deploy run 45106155999 was green, including Verify.

**Why re-pinned.** The owner chose on 2026-11-23 to activate the release-based deploy before the SEO pull requests merge ("Activate release-based first"), and approved #310 to merge only through it. The previous runbook was pinned to `d15370e` (2026-11-16). Since then 234 commits have landed on `main`: city pages, link changes and additive city-template fields. **None touched a deploy file.** `git diff d15370e..2294a43` is empty for `deploy/`, `scripts/deploy/`, `.github/workflows/`, `next.config.ts`, `middleware.ts`, `app/api/build-info`, `package.json` and `package-lock.json`. `deploy/ACTIVATION-PLAN.md` is byte-identical (SHA-256 prefix `568ce47a…`), and the four reviewed files below are unchanged, checked against git and raw.githubusercontent.com at this commit. This runbook replaces the d15370e one.

**Why the upgrade still matters (evidence since d15370e):** the legacy in-place script is still what runs. The deploy log of run 44999782963 (7e9dbfe) shows "Fetching latest main… Updating application… HEAD is now at…", then `npm ci` and `next build` inside the live directory; there is no release directory and no `DEPLOYED_REVISION`. Two of the last twelve legacy deploys failed their own *Verify the deployed pages* step (175c6d2 and 6085714, both 2026-11-22), and at least three recent deploys left a page served from the previous build: #313 (three pages, until a later deploy), #312 (`/products/family-prefab-home-2bhk`) and #314 (`/shipping`, below). The release-based deploy builds in a separate directory and switches only after the full route gate.

**Known state of production before activation (checked 2026-11-23, 03:35–03:37Z, from the laptop session, only while no Deploy run was active):**
- **The release check passes.** `verify-release.mjs --expect-commit 2294a4368155c023216a5440339c34780603371b`, run from this commit, PASSED: identity 1/1, health 5/5, city 166, critical 9, redirects 1, assets 133/133, sitemap OK; 0 failures, 0 warnings.
- **Every URL answers.** All 373 URLs (371 in the sitemap, plus Cart and Checkout) answer 200, and none is the not-found page.
- **One stale page, from the legacy deploy.** 372 of the 373 come from build `2294a4368155_mwsphyk6`. `/shipping` was still served from the previous build (`0f20e7e3218f_mwsp2unt`, cache HIT) and referenced a webpack runtime chunk that the new build no longer has (`webpack-ebadbc6a682ba5c6.js` → 404), so its scripts could not start. This is the in-place defect activation removes. The most likely cause is that the old process keeps serving and regenerating pages in the live directory while the new build is written there. The same thing happened after #312 to `/products/family-prefab-home-2bhk`, which is now healed (all its script files answer 200). A stale page heals at its 30-minute revalidation or at the next deploy, so the Phase 4 precondition below re-checks it.
- **Feed and robots are unchanged.** The Merchant feed (SHA-256 `e116b1eb9ac37d7368b7179fadfab40178c62f3213d5632bc14558f5868367d0`, 367,197 bytes, 28 items) is byte-identical to 2026-11-05, and robots.txt (SHA-256 `d283fc8fd459f65568bcba4bc54e11614651239f8e1f8421186ed0a70cea6aa5`, 924 bytes) to 2026-11-16. Re-fetched at 03:36Z on this commit: unchanged.
- **Merges still queued among the laptop sessions:** #316 is next. #319, #320 and #321 are owner-approved; #318 and #322 are drafts. PR #310 waits until after activation. Each merge before Part B moves `main`. This runbook is then re-pinned, and only Part A check 1 needs re-running.

**Precondition for Phase 4, the first release:** the laptop session re-confirms it just before Phase 4, with a fresh outside sweep (every page on the build of `APPROVED_SHA`, none stale, none the not-found page) and `verify-release --expect-commit 2294a43…` passing. The reason is the gate's *continuity* check. It requires the new release to serve every script file the live home page references, and the deploy script can only carry files still on disk in the legacy checkout. Under the merge freeze no legacy deploy runs, so the state should not change.

**Status:**
- Nothing in this document has been run on the server.
- Parts A and A2 change nothing on it.
- Part B (activation) runs only after the owner's explicit approval of this commit and of the Part A / A2 results.

**Who runs it:** root on `srv2025838` (187.126.117.26). The laptop sessions have no SSH key.

**Merge freeze:** from the moment the owner is ready to start Part B until the laptop session sends "freeze lifted", no session merges and no session makes site requests (the laptop session sends the notice to every running session). `main` must stay at `APPROVED_SHA` for the whole window. **If `main` moves before Part B starts, re-pin** (this document is regenerated for the new commit and re-checked; Parts A and A2 need only A1 re-run if no deploy file changed) and get a new approval for the new commit.

**The four reviewed files at this commit** (SHA-256 of git's LF content, verified from git and from raw.githubusercontent.com, and unchanged since the #191 review):

| File | SHA-256 |
|---|---|
| `deploy/deploy-portable-office.sh` | `b98d926ad4d393ec457477f31445e0b4d5a3339d9725b3c71aeda2ec6e1fd7ce` |
| `deploy/nginx/portable-office-upstream.conf` | `100efb227fa1062f0f242fe97e7d981669de259f701ad4591bb7ebf3c59bc53f` |
| `scripts/deploy/verify-release.mjs` | `59d5bb33b38cee2fa3fc47d8d3c83f2fce36af63d905ae4abc2f045f7feb629b` |
| `scripts/deploy/critical-routes.json` | `d8241c7297213822fcaa6200f39420d77fa3e7f69d8d16218e019b6f5ab7bb29` |

**Never** run `/usr/local/bin/deploy-portable-office` (the legacy script) with any argument before activation. Its argument handling is unverified, and `status` may run a deploy.

---

## Part A: read-only preflight (paste the whole output back)

The block only reads: it installs, stops, starts, reloads and clones nothing. It prints no environment variables, keys or `.env` contents. Skim the output before pasting anyway. The laptop session redacts anything that looks like a credential before sharing it further.

```bash
APPROVED_SHA=2294a4368155c023216a5440339c34780603371b
REPO_URL=https://github.com/portableofficecabin-lang/Portable-Office.git
RAW=https://raw.githubusercontent.com/portableofficecabin-lang/Portable-Office/$APPROVED_SHA
echo "== 1. pin: main must equal the approved commit"
MAIN_NOW=$(git ls-remote "$REPO_URL" refs/heads/main | cut -f1)
[ "$MAIN_NOW" = "$APPROVED_SHA" ] && echo "main OK: $MAIN_NOW" || echo "STOP: main is $MAIN_NOW"
echo "== 2. the four reviewed files at the approved commit (read into memory, not saved)"
while read -r want path; do
  got=$(curl -fsS "$RAW/$path" | sha256sum | cut -d' ' -f1)
  [ "$got" = "$want" ] && echo "OK      $path" || echo "STOP    $path  got $got"
done <<'EOF'
b98d926ad4d393ec457477f31445e0b4d5a3339d9725b3c71aeda2ec6e1fd7ce deploy/deploy-portable-office.sh
100efb227fa1062f0f242fe97e7d981669de259f701ad4591bb7ebf3c59bc53f deploy/nginx/portable-office-upstream.conf
59d5bb33b38cee2fa3fc47d8d3c83f2fce36af63d905ae4abc2f045f7feb629b scripts/deploy/verify-release.mjs
d8241c7297213822fcaa6200f39420d77fa3e7f69d8d16218e019b6f5ab7bb29 scripts/deploy/critical-routes.json
EOF
echo "== 3. resources (stop: /srv free < 25 GB, available RAM < 2 GB)"
df -h /srv | tail -1; free -m | sed -n 2,3p; swapon --show
echo "== 4. ports (3010 must be free; 3000 = Portable Office; 3001/3002 = Built on Trust)"
ss -ltnp | grep -E ':(3000|3001|3002|3010) ' || true
echo "== 5. tools (coreutils >= 8.24 for tee -p)"
node -v; npm -v; pm2 -v; nginx -v 2>&1; tee --version | head -1; git --version
for c in flock ss curl tar find; do command -v "$c" >/dev/null && echo "have $c" || echo "STOP missing $c"; done
echo "== 6. live app (legacy in-place checkout)"
cat /srv/apps/portable-office/.next/BUILD_ID; echo
git -C /srv/apps/portable-office log -1 --format='%H %s'
curl -s https://portableofficecabin.com/api/build-info; echo
echo "== 7. installed deploy script (must still be the 827-byte legacy one)"
ls -la /usr/local/bin/deploy-portable-office; sha256sum /usr/local/bin/deploy-portable-office
echo "== 8. nginx (expect exactly 1 proxy_pass to :3000; conf.d empty)"
ls -la /etc/nginx/sites-enabled/portableofficecabin.com
grep -c 'proxy_pass http://127.0.0.1:3000;' /etc/nginx/sites-available/portableofficecabin.com
ls -la /etc/nginx/conf.d/
nginx -t 2>&1 | tail -2
echo "== 9. PM2 processes (names, pids, status, cwd only; no environment)"
pm2 jlist | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>JSON.parse(s).forEach(p=>console.log(p.name,p.pid,p.pm2_env.status,p.pm2_env.pm_cwd)))'
echo "== 10. not yet present (expect 'No such file')"
ls -d /srv/apps/portableofficecabin.com /var/log/deploy-portable-office /usr/local/sbin/deploy-portable-office.candidate 2>&1
echo "== 11. other tenant baseline"
curl -sI https://builtontrustconstruction.com/ | head -1
```

## Part A2: recovery readiness (read-only; paste the output back)

These confirm that every rollback path in the plan has what it needs. They only list and measure.

```bash
echo "== R1. legacy checkout intact (the fallback in every rollback): clean tree, built, startable"
git -C /srv/apps/portable-office status --porcelain | wc -l          # expect 0 (or only known local files)
ls -la /srv/apps/portable-office/.next/BUILD_ID /srv/apps/portable-office/package.json
du -sh /srv/apps/portable-office 2>/dev/null | tail -1
echo "== R2. PM2 state can be saved and restored"
ls -la /root/.pm2/dump.pm2 2>&1; pm2 ping 2>&1 | tail -1
echo "== R3. files Phase 1 backs up exist and are readable"
ls -la /etc/nginx/sites-available/portableofficecabin.com /etc/nginx/sites-available/builtontrustconstruction.com /usr/local/bin/deploy-portable-office
echo "== R4. room for the backups in /root and for the first release (about 4 GB + 2 GB swap)"
df -h /root | tail -1
echo "== R5. no leftovers from an earlier attempt"
ls -la /root/*.bak /root/*legacy* /root/pm2-*migration* /root/activation-sha256.txt 2>&1 | head
echo "== R6. swap file absent or known (Phase 1b creates /swapfile)"
ls -la /swapfile 2>&1; grep -c swapfile /etc/fstab
```

**Recovery items outside the server (owner, before Part B):**
- **Hostinger snapshot:** in the panel, VPS → *Snapshots & Backups*, confirm a snapshot can be created and how long one takes. Phase 0 step 4 creates it, and Part B must not start without it.
- **GitHub:** confirm you can disable and re-enable the *Deploy Portable Office* workflow (Phase 0 step 3 and Phase 5).

**Go/no-go for asking the activation approval** (Part A and A2):

| Check | Must show |
|---|---|
| A1 | `main OK`. If a queued merge has landed since this pin, it prints `STOP: main is <newer>`: the laptop session re-pins, and you re-run only check 1 before Part B. |
| A2 | `OK` four times |
| A3 | `/srv` free ≥ 25 GB; available RAM ≥ 2 GB |
| A4 | Port 3010 free |
| A5 | Every tool present |
| A7 | The installed script is still the 827-byte legacy one |
| A8 | Exactly 1 `proxy_pass` to :3000; `conf.d/` empty; `nginx -t` OK |
| R1 | The legacy tree is clean and built |
| R2 | PM2 answers `pong` |
| R4 | At least 10 GB free for `/root` |
| R5 | No leftovers |

Anything else: stop and paste the output.

---

## Part B: activation (only after the owner's explicit approval of `2294a4368155c023216a5440339c34780603371b`)

Follow `deploy/ACTIVATION-PLAN.md` exactly as it stands at this commit (identical to the reviewed version):
<https://github.com/portableofficecabin-lang/Portable-Office/blob/2294a4368155c023216a5440339c34780603371b/deploy/ACTIVATION-PLAN.md>

Use one root shell throughout. In Phase 0 step 7 (and in any new shell), set:

```bash
APPROVED_SHA=2294a4368155c023216a5440339c34780603371b
```

| Phase | What it does | Must print / be true before going on |
|---|---|---|
| 0 | Window (60–90 min, low traffic). Confirm the merge freeze. **Disable** the *Deploy Portable Office* workflow. **Hostinger snapshot.** Baseline. Facts (step 6). Pin (step 7). | Snapshot complete; workflow "disabled"; facts within limits; `format OK`, `main OK`. |
| 1 | Backups (nginx site, legacy script, PM2 dump, Built on Trust nginx md5, live BUILD_ID); optional 2 GB swap. | Site 200; BUILD_ID unchanged. |
| 2 | Layout + clone to `/srv/apps/portableofficecabin.com/repo`, `checkout --detach $APPROVED_SHA`, all four checksums via `/root/activation-sha256.txt`; then the nginx upstream (still :3000). | `checkout OK`, `0`, four `OK`, `ALL FOUR CHECKSUMS OK`; site and Built on Trust unchanged; `nginx -t` OK. **Never run 2b after a STOP.** |
| 3 | Stage the candidate script; `preflight`. | Candidate checksum `OK`; `preflight OK`. |
| 4 | **Only after the laptop session confirms production is healed** (see the precondition above). Re-check the pin, then the first release by hand with the candidate. | Before: the "healed" confirmation, then `main OK`, `checkout OK`, `ALL FOUR CHECKSUMS OK`. After: `verify: PASSED`, `Deployment successful`, `revision OK`, `release files OK`, `/api/build-info` = `APPROVED_SHA`; Built on Trust PIDs and nginx unchanged. |
| 5 | Install as the production script (checksum OK); re-enable the workflow; `deploy` (after `main OK`), `rollback` drill, `deploy`; lift the freeze only after the outside checks below. | Each run green; `/api/build-info` = `APPROVED_SHA` after each deploy; the "legacy in-place script" notice is gone. |

**Outside checks after Phase 4 and after Phase 5.** The laptop session runs them on request:
- `verify-release.mjs --expect-commit 2294a4368155c023216a5440339c34780603371b`, run from that commit: 0 failures.
- Every sitemap URL answers 200 from the new build, with no stale page and no not-found page.
- City-page SSR audit and the SEO live audit: 0 errors.
- Anonymous cart → checkout at 320 and 1440 px: product page, Add to Cart, the cart persists on reload, checkout without login, PIN → transport, Pay enabled (never clicked). Also no horizontal overflow at 320, 375, 390, 768 and 1440 px.
- Merchant feed and robots.txt byte-identical to the values recorded above.

**First merge through the new system:** PR #310 (SEO-6), approved by the owner on 2026-11-23, refreshed onto `main`, CI green, announced to all sessions; then the peer queue resumes, one merge at a time.

**Rollback:** exactly as in the plan's Phase 2, Phase 4 ("Back to the legacy app") and Phase 5 sections. The legacy checkout `/srv/apps/portable-office` and the snapshot stay until a week of clean releases, and are removed only with separate approval.

**Never during this work:**
- no database changes and no `full_schema.sql`;
- no sudoers edits;
- nothing touching Built on Trust's directories, ports, PM2 processes or nginx block;
- no `pm2` as the `deploy` user.
