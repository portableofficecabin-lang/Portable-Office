# Release-based deploy: read-only preflight, recovery readiness and pinned activation

**Pinned commit (`APPROVED_SHA`):** `d15370e4060ec008dc15f4dc143e9d06452f0225`

This is the merge of PR #254 (Portable Shops & Pop-Up Stores in Indiranagar) into `main`, and it's what production serves now: `/api/build-info` gives this commit, build `d15370e4060e_mwivi2n1`. Its parents are `ec080ec` (the #253 merge) and `8b27922` (the #254 head).

It is the last pull request of the owner-approved pre-upgrade run. Since the c58a62b pin (2026-11-06), 292 commits landed on `main`: city pages, link changes, additive city-template fields and the product-29 refocus (#252, with commerce identity, prices and feed eligibility unchanged). None of them touched a deploy file: the four hashes below and `deploy/ACTIVATION-PLAN.md` are identical (checked against git and raw.githubusercontent.com at this commit). The merge-queue guide (portable-office-ef) declares `main` stable at this commit. Post-upgrade queue: #194, #159, #197, #198. This runbook replaces the c58a62b one.

**Known state of production before activation (checked 2026-11-16 06:22Z):**
- **Production is healthy.** All 317 URLs (315 in the sitemap, plus Cart and Checkout) answer 200 from build `d15370e4060e_mwivi2n1`. None is stale and none is the not-found page; every script on "/", Cart, Checkout and the fed products answers 200.
- **The last deploy was green.** The last *Deploy Portable Office* run (43815858675, for #254) was fully green, including Verify.
- **Feed and robots are unchanged.** The Merchant feed (SHA-256 `e116b1eb…`, 367,197 bytes, 28 items) and robots.txt (SHA-256 `d283fc8f…`, 924 bytes) are byte-identical to before; all 29 feed links answer 200.
- **Why the upgrade matters (evidence from the run):** the legacy in-place deploy hung twice (2026-11-09 #239, 8.5 h of 102 cached 404s; 2026-11-15 #224, 34 min with 102 404s and the commerce pages' scripts answering 400), and several deploys left fed product pages on stale copies with dead scripts. The release-based deploy builds in a separate directory and switches only after the full route gate.

**Precondition for Phase 4, the first release:** it is met now. The guide re-confirms it just before Phase 4, with a fresh outside sweep (every page on build `d15370e4060e_mwivi2n1`) and `verify-release --expect-commit d15370e…` passing. The reason is the gate's *continuity* check. It requires the new release to serve every script file the live home page references, and the deploy script can only carry files still on disk in the legacy checkout. Under the merge freeze no legacy deploy runs, so the state should not change.

**Status:**
- Nothing in this document has been run on the server.
- Parts A and A2 change nothing on it.
- Part B (activation) runs only after the owner's explicit approval of this commit and of the Part A / A2 results.

**Who runs it:** root on `srv2025838` (187.126.117.26). The laptop sessions have no SSH key.

**Merge freeze:** keep `main` at this commit until activation is complete. Every session has been asked not to merge. If `main` moves, re-pin and get a new approval.

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
APPROVED_SHA=d15370e4060ec008dc15f4dc143e9d06452f0225
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
| A1 | `main OK` |
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

## Part B: activation (only after the owner's explicit approval of `d15370e4060ec008dc15f4dc143e9d06452f0225`)

Follow `deploy/ACTIVATION-PLAN.md` exactly as it stands at this commit (identical to the reviewed version):
<https://github.com/portableofficecabin-lang/Portable-Office/blob/d15370e4060ec008dc15f4dc143e9d06452f0225/deploy/ACTIVATION-PLAN.md>

Use one root shell throughout. In Phase 0 step 7 (and in any new shell), set:

```bash
APPROVED_SHA=d15370e4060ec008dc15f4dc143e9d06452f0225
```

| Phase | What it does | Must print / be true before going on |
|---|---|---|
| 0 | Window (60–90 min, low traffic). Confirm the merge freeze. **Disable** the *Deploy Portable Office* workflow. **Hostinger snapshot.** Baseline. Facts (step 6). Pin (step 7). | Snapshot complete; workflow "disabled"; facts within limits; `format OK`, `main OK`. |
| 1 | Backups (nginx site, legacy script, PM2 dump, Built on Trust nginx md5, live BUILD_ID); optional 2 GB swap. | Site 200; BUILD_ID unchanged. |
| 2 | Layout + clone to `/srv/apps/portableofficecabin.com/repo`, `checkout --detach $APPROVED_SHA`, all four checksums via `/root/activation-sha256.txt`; then the nginx upstream (still :3000). | `checkout OK`, `0`, four `OK`, `ALL FOUR CHECKSUMS OK`; site and Built on Trust unchanged; `nginx -t` OK. **Never run 2b after a STOP.** |
| 3 | Stage the candidate script; `preflight`. | Candidate checksum `OK`; `preflight OK`. |
| 4 | **Only after the guide confirms production has healed** (see the precondition above). Re-check the pin, then the first release by hand with the candidate. | Before: the guide's "healed" confirmation, then `main OK`, `checkout OK`, `ALL FOUR CHECKSUMS OK`. After: `verify: PASSED`, `Deployment successful`, `revision OK`, `release files OK`, `/api/build-info` = `APPROVED_SHA`; Built on Trust PIDs and nginx unchanged. |
| 5 | Install as the production script (checksum OK); re-enable the workflow; `deploy` (after `main OK`), `rollback` drill, `deploy`; lift the freeze only after the outside checks below. | Each run green; `/api/build-info` = `APPROVED_SHA` after each deploy; the "legacy in-place script" notice is gone. |

**Outside checks after Phase 4 and after Phase 5.** The laptop session runs them on request:
- `verify-release.mjs --expect-commit d15370e4060ec008dc15f4dc143e9d06452f0225`, run from that commit: 0 failures.
- Every sitemap URL answers 200 from the new build, with no stale page and no not-found page.
- City-page SSR audit and the SEO live audit: 0 errors.
- Anonymous cart → checkout at 320 and 1440 px: product page, Add to Cart, the cart persists on reload, checkout without login, PIN → transport, Pay enabled. Also no horizontal overflow at 320, 375, 390, 768 and 1440 px.
- Merchant feed byte-identical to before (SHA-256 `e116b1eb9ac37d7368b7179fadfab40178c62f3213d5632bc14558f5868367d0` on 2026-11-05); robots.txt byte-identical.

**Rollback:** exactly as in the plan's Phase 2, Phase 4 ("Back to the legacy app") and Phase 5 sections. The legacy checkout `/srv/apps/portable-office` and the snapshot stay until a week of clean releases, and are removed only with separate approval.

**Never during this work:**
- no database changes and no `full_schema.sql`;
- no sudoers edits;
- nothing touching Built on Trust's directories, ports, PM2 processes or nginx block;
- no `pm2` as the `deploy` user.
