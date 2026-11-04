#!/usr/bin/env bash
# =====================================================================================
# End-to-end test of deploy/deploy-portable-office.sh with REAL nginx (TLS), REAL PM2,
# real git/npm/flock/ss and symlinks — on a throwaway CI runner, never on the VPS.
#
#   sudo bash deploy/test/integration.sh          (Ubuntu, root, nginx + pm2 + node installed)
#
# It recreates the production starting point (legacy in-place app as PM2 `portable-office` on
# *:3000 behind `proxy_pass http://127.0.0.1:3000;`, plus a separate "Built on Trust" site on
# :3002 with its own nginx server block), applies the one-time migration from deploy/README.md,
# then drives the INSTALLED /usr/local/bin/deploy-portable-office through:
#   S1 first release after the migration (adds a new city page)      → live, zero non-200s
#   S2 re-run of the SAME commit                                     → fresh rebuild, live
#   S3 a build that fails                                            → production untouched
#   S3b a release that crashes at start-up                           → production untouched
#   S4 a new city page that answers 404 in the new build             → gate blocks the switch
#   S4b the new release reports another commit                       → gate blocks the switch
#   S4c a page answering 200 with the not-found page (soft 404)      → gate blocks the switch
#   S5 a good commit (chunks of the 2 previous builds still served, redirect 301), then
#      `rollback`                                                    → previous release live
#   S6 two deploys at once                                           → the second is refused
#   S7 prune                                                         → old releases removed
#   S8 main force-pushed to an older commit                          → refused (stale build);
#      only `deploy --allow-non-descendant` overrides
#   S9a caller disconnects mid-deploy (SIGHUP, closed output)        → deploy still completes
#   S9b deploy killed with SIGKILL before the switch                 → production untouched,
#      the next run recovers
# and checks after every step that the other tenant (PM2 process, port, nginx block,
# responses) is exactly as it was. A poller requests https://portableofficecabin.com/ every
# 0.2 s during each deploy; a single non-200 fails the test.
# =====================================================================================
set -Eeuo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$HERE/../.." && pwd)
WORK=${WORK:-/tmp/dpo-it}
SITE=portableofficecabin.com
BOT_SITE=builtontrustconstruction.com
APP_ROOT=/srv/apps/portableofficecabin.com
LEGACY=/srv/apps/portable-office
SCRIPT=/usr/local/bin/deploy-portable-office
export HOME=/root PM2_HOME=/root/.pm2
export NODE_EXTRA_CA_CERTS=$WORK/tls/ca.crt
# Faster timings for CI; production keeps the script's defaults.
export DRAIN_SECONDS=2 START_TIMEOUT=40 MIN_FREE_DISK_GB=2 MIN_AVAIL_MEM_MB=300 KEEP_RELEASES=3
export REMOTE_URL=$WORK/remote.git

PASS=0
pass() { PASS=$((PASS + 1)); echo "  ✔ $*"; }
fail() { echo "  ✘ FAIL: $*"; echo "---- last deploy log ----"; tail -n 60 "$WORK/last.log" 2>/dev/null || true; exit 1; }
step() { echo; echo "━━ $* ━━"; }
[ "$(id -u)" = 0 ] || { echo "run as root"; exit 2; }

live_code()  { curl -s -o /dev/null -w '%{http_code}' -m 10 --resolve "$SITE:443:127.0.0.1" "https://$SITE$1" || echo 000; }
live_body()  { curl -s -m 10 --resolve "$SITE:443:127.0.0.1" "https://$SITE$1" || true; }
# The build id as Next 15 prints it: \"b\":\"<id>\" in the RSC payload of the page.
live_build() { live_body / | sed -nE 's/.*\\"b\\":\\"([0-9a-f]+)\\".*/\1/p' | head -1; }
bot_body()   { curl -s -m 10 --resolve "$BOT_SITE:443:127.0.0.1" "https://$BOT_SITE/" || true; }
pm2_pid()    { pm2 jlist | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const p=JSON.parse(s).find(x=>x.name===process.argv[1]);process.stdout.write(p?String(p.pid):"")})' "$1"; }
pm2_names()  { pm2 jlist | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(JSON.parse(s).map(x=>x.name).sort().join(",")))'; }
upstream_port() { sed -nE 's/^[[:space:]]*server 127\.0\.0\.1:([0-9]+);.*/\1/p' /etc/nginx/conf.d/portable-office-upstream.conf; }

POLL_PID=""
poll_start() {
  : > "$WORK/poll.log"
  ( while :; do echo "$(live_code /)" >> "$WORK/poll.log"; sleep 0.2; done ) &
  POLL_PID=$!
}
poll_stop() { # label
  # A failed deploy can end in under a second: keep sampling until there are enough requests to
  # prove the live site stayed up through and after it.
  for _ in $(seq 1 50); do [ "$(wc -l < "$WORK/poll.log")" -ge 10 ] && break; sleep 0.2; done
  kill "$POLL_PID" 2>/dev/null || true; wait "$POLL_PID" 2>/dev/null || true
  local total bad
  total=$(wc -l < "$WORK/poll.log" | tr -d ' ')
  bad=$(grep -vc '^200$' "$WORK/poll.log" || true)
  [ "$total" -ge 10 ] || fail "$1: the poller recorded only $total requests"
  [ "$bad" = 0 ] || fail "$1: $bad of $total live requests were not 200: $(grep -v '^200$' "$WORK/poll.log" | sort | uniq -c | tr '\n' ' ')"
  pass "$1: $total live requests during the deploy, all 200 (zero downtime)"
}

deploy() { # expect(ok|fail) [args...]
  local expect=$1; shift
  set +e
  "$SCRIPT" "${@:-deploy}" > "$WORK/last.log" 2>&1
  local rc=$?
  set -e
  if [ "$expect" = ok ] && [ "$rc" != 0 ]; then fail "deploy ${*:-deploy} exited $rc"; fi
  if [ "$expect" = fail ] && [ "$rc" = 0 ]; then fail "deploy ${*:-deploy} succeeded but should have failed"; fi
  return 0
}

BOT_PID=""; BOT_CONF_SUM=""
bot_untouched() { # label
  [ "$(pm2_pid built-on-trust)" = "$BOT_PID" ] || fail "$1: Built on Trust PM2 process changed (pid $(pm2_pid built-on-trust), was $BOT_PID)"
  [ "$(md5sum < /etc/nginx/sites-enabled/$BOT_SITE)" = "$BOT_CONF_SUM" ] || fail "$1: Built on Trust nginx block changed"
  bot_body | grep -q "BUILT-ON-TRUST-OK" || fail "$1: Built on Trust site does not answer through nginx"
  pass "$1: Built on Trust untouched (pid $BOT_PID, nginx block, response)"
}

commit() { # message  (commits the working tree of the fake app and pushes it to the fake remote)
  ( cd "$WORK/src" && git add -A && git -c user.name=ci -c user.email=ci@example.com commit -qm "$1" && git push -q origin HEAD:main )
  git -C "$WORK/src" rev-parse HEAD
}
set_cities() { printf 'export const CITY_PAGES = [\n%s];\n' "$(for s in "$@"; do printf '  {\n    slug: "%s",\n  },\n' "$s"; done)" > "$WORK/src/src/data/cityPages.ts"; }

# ── 0. clean slate ─────────────────────────────────────────────────────────────────────
step "setup"
pm2 delete all >/dev/null 2>&1 || true
rm -rf "$WORK" "$APP_ROOT" "$LEGACY" /var/log/deploy-portable-office
mkdir -p "$WORK/tls"

# TLS: a throwaway CA trusted by curl (system store) and node (NODE_EXTRA_CA_CERTS)
openssl req -x509 -newkey rsa:2048 -nodes -days 2 -subj "/CN=dpo-test-ca" -keyout "$WORK/tls/ca.key" -out "$WORK/tls/ca.crt" 2>/dev/null
for h in $SITE $BOT_SITE; do
  openssl req -newkey rsa:2048 -nodes -subj "/CN=$h" -keyout "$WORK/tls/$h.key" -out "$WORK/tls/$h.csr" 2>/dev/null
  printf 'subjectAltName=DNS:%s,DNS:www.%s\n' "$h" "$h" > "$WORK/tls/$h.ext"
  openssl x509 -req -in "$WORK/tls/$h.csr" -CA "$WORK/tls/ca.crt" -CAkey "$WORK/tls/ca.key" -CAcreateserial -days 2 -extfile "$WORK/tls/$h.ext" -out "$WORK/tls/$h.crt" 2>/dev/null
done
cp "$WORK/tls/ca.crt" /usr/local/share/ca-certificates/dpo-test-ca.crt
update-ca-certificates >/dev/null

# Fake app repository (bare "GitHub") + working copy
git init -q --bare "$WORK/remote.git"
git -C "$WORK/remote.git" symbolic-ref HEAD refs/heads/main
mkdir -p "$WORK/src"
cp -a "$HERE/fake-app/." "$WORK/src/"
chmod +x "$WORK/src/fake-next/dist/bin/next"
mkdir -p "$WORK/src/src/data" "$WORK/src/scripts/deploy" "$WORK/src/public"
cp "$REPO_ROOT/scripts/deploy/verify-release.mjs" "$WORK/src/scripts/deploy/"
# The fake app's own critical pages and redirect (the real list names pages the fake app lacks).
cat > "$WORK/src/scripts/deploy/critical-routes.json" <<'EOF'
{
  "routes": ["/cities-we-serve/city-a", { "path": "/products", "contains": ["<h1>/products</h1>"] }],
  "redirects": [{ "from": "/products/shipping-container", "to": "/products", "status": 301 }]
}
EOF
printf 'NEXT_PUBLIC_FROM_GIT=1\n' > "$WORK/src/.env"
set_cities city-a city-b
( cd "$WORK/src" && git init -q -b main && npm install --package-lock-only --no-audit --no-fund --loglevel=error >/dev/null && git remote add origin "$WORK/remote.git" )
V1=$(commit "v1: two city pages")
pass "fake app pushed (v1 $V1)"

# Legacy production: in-place checkout, `npm start` under PM2 on *:3000, server-only bimi file
git clone -q "$WORK/remote.git" "$LEGACY"
( cd "$LEGACY" && npm ci --no-audit --no-fund --loglevel=error >/dev/null && npm run build >/dev/null )
mkdir -p "$LEGACY/public/bimi" && echo '<svg/>' > "$LEGACY/public/bimi/logo.svg"
pm2 start npm --name portable-office --cwd "$LEGACY" -- start >/dev/null

# Built on Trust: separate dir, port 3002, own server block, own PM2 process
mkdir -p "$WORK/bot"
cat > "$WORK/bot/server.js" <<'EOF'
require("node:http")
  .createServer((req, res) => {
    res.writeHead(200, { "content-type": "text/html" });
    res.end("<html><body>BUILT-ON-TRUST-OK</body></html>");
  })
  .listen(3002, "0.0.0.0");
EOF
pm2 start "$WORK/bot/server.js" --name built-on-trust >/dev/null

# nginx exactly like production before the migration
rm -f /etc/nginx/sites-enabled/default
cat > /etc/nginx/sites-enabled/$SITE <<EOF
server {
    listen 443 ssl;
    server_name $SITE www.$SITE;
    ssl_certificate $WORK/tls/$SITE.crt;
    ssl_certificate_key $WORK/tls/$SITE.key;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
    }
}
EOF
cat > /etc/nginx/sites-enabled/$BOT_SITE <<EOF
server {
    listen 443 ssl;
    server_name $BOT_SITE www.$BOT_SITE;
    ssl_certificate $WORK/tls/$BOT_SITE.crt;
    ssl_certificate_key $WORK/tls/$BOT_SITE.key;
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_set_header Host \$host;
    }
}
EOF
nginx -t >/dev/null 2>&1
systemctl restart nginx
for _ in $(seq 1 40); do [ "$(live_code /)" = 200 ] && break; sleep 0.5; done
[ "$(live_code /)" = 200 ] || fail "legacy site does not answer through nginx"
LEGACY_BUILD=$(live_build)
for _ in $(seq 1 20); do bot_body | grep -q BUILT-ON-TRUST-OK && break; sleep 0.5; done
bot_body | grep -q BUILT-ON-TRUST-OK || fail "Built on Trust does not answer through nginx"
BOT_PID=$(pm2_pid built-on-trust)
BOT_CONF_SUM=$(md5sum < /etc/nginx/sites-enabled/$BOT_SITE)
pass "legacy site live through nginx (build $LEGACY_BUILD), Built on Trust live on :3002 (pid $BOT_PID)"

# ── 1. one-time migration, as written in deploy/README.md ──────────────────────────────
step "one-time migration (deploy/README.md)"
install -d -m 755 "$APP_ROOT" "$APP_ROOT/releases" "$APP_ROOT/shared" "$APP_ROOT/shared/public/bimi"
printf 'SERVER_ONLY_SECRET=from-shared\n' > "$WORK/env.local"
install -o root -g root -m 600 "$WORK/env.local" "$APP_ROOT/shared/.env.local"
cp -a "$LEGACY/public/bimi/logo.svg" "$APP_ROOT/shared/public/bimi/"
git clone -q "$REMOTE_URL" "$APP_ROOT/repo"
install -m 644 "$REPO_ROOT/deploy/nginx/portable-office-upstream.conf" /etc/nginx/conf.d/portable-office-upstream.conf
sed -i 's#proxy_pass http://127.0.0.1:3000;#proxy_pass http://portable_office;#' /etc/nginx/sites-enabled/$SITE
grep -q 'proxy_pass http://portable_office;' /etc/nginx/sites-enabled/$SITE || fail "proxy_pass not rewritten"
nginx -t >/dev/null 2>&1 && systemctl reload nginx
[ "$(live_code /)" = 200 ] || fail "site down after the nginx part of the migration"
install -o root -g root -m 750 "$REPO_ROOT/deploy/deploy-portable-office.sh" "$SCRIPT"
"$SCRIPT" preflight > "$WORK/last.log" 2>&1 || fail "preflight failed"
pass "migration applied; preflight OK; still serving the legacy build"
bot_untouched "migration"

# ── S1: first release (adds a city page) ───────────────────────────────────────────────
step "S1 first release after the migration — adds city-new"
set_cities city-a city-b city-new
V2=$(commit "v2: add city-new")
poll_start; deploy ok; poll_stop "S1"
[ "$(upstream_port)" = 3010 ] || fail "S1: upstream should point at slot B (3010), got $(upstream_port)"
[ "$(pm2_names)" = "built-on-trust,portable-office-b" ] || fail "S1: unexpected PM2 processes: $(pm2_names)"
! ss -ltnH 'sport = :3000' | grep -q . || fail "S1: legacy port 3000 still listening"
S1_REL=$(readlink -f "$APP_ROOT/current")
[ "$(cat "$S1_REL/REVISION")" = "$V2" ] || fail "S1: current release is not v2"
S1_BUILD=$(cat "$S1_REL/.next/BUILD_ID")
[ "$(live_build)" = "$S1_BUILD" ] || fail "S1: live build $(live_build) != release build $S1_BUILD"
[ "$(live_code /cities-we-serve/city-new)" = 200 ] || fail "S1: the new city page is not 200 through nginx"
grep -q "^DEPLOYED_BUILD_ID=$S1_BUILD$" "$WORK/last.log" || fail "S1: DEPLOYED_BUILD_ID line missing"
grep -q "^DEPLOYED_REVISION=$V2$" "$WORK/last.log" || fail "S1: DEPLOYED_REVISION line missing"
grep -q "verify: PASSED" "$WORK/last.log" || fail "S1: the pre-switch route gate did not run"
# Build identity: the pre-switch gate AND the nginx re-check both asked the running release
# (GET /api/build-info) which commit it is, and both got v2 from build S1. Printed so a green run
# shows the evidence, not just the absence of a failure.
[ "$(grep -cF "identity 1/1" "$WORK/last.log")" -ge 2 ] || fail "S1: the pre-switch gate and the nginx re-check did not both verify the release's commit"
grep -qF "verify: identity: commit ${V2:0:12} · build $S1_BUILD" "$WORK/last.log" || fail "S1: the gate did not report commit ${V2:0:12} / build $S1_BUILD"
grep -F -e "verify: identity:" -e "identity 1/1" "$WORK/last.log" | sed 's/^/    /'
[ -L "$S1_REL/.env.local" ] && [ "$(readlink "$S1_REL/.env.local")" = "$APP_ROOT/shared/.env.local" ] || fail "S1: .env.local is not linked to shared"
grep -q NEXT_PUBLIC_FROM_GIT "$S1_REL/.env" || fail "S1: the committed .env was replaced"
[ -f "$S1_REL/public/bimi/logo.svg" ] || fail "S1: server-only public file not carried over"
[ -e "$S1_REL/.next/cache/webpack/build-$LEGACY_BUILD" ] || fail "S1: build cache was not seeded from the live app"
[ ! -e "$APP_ROOT/previous" ] && [ ! -L "$APP_ROOT/previous" ] || fail "S1: a previous link exists although nothing was released before"
[ "$(live_code "/_next/static/chunks/page-$LEGACY_BUILD.js")" = 200 ] || fail "S1: the legacy build's JS chunk is gone (open tabs would break)"
# The gate's new checks ran before the switch: critical pages + redirect, their assets, and the
# live (legacy) build's chunks served by the new release; then again through nginx (no continuity).
grep -qF "critical 2, redirects 1, assets 1, continuity 1," "$WORK/last.log" || fail "S1: the pre-switch gate did not check critical pages, the redirect, assets and continuity"
[ "$(grep -cF "critical 2, redirects 1, assets 1," "$WORK/last.log")" -ge 2 ] || fail "S1: the nginx re-check did not check critical pages, the redirect and assets"
grep -F -e "critical 2, redirects 1" -e "static: " "$WORK/last.log" | sed 's/^/    /'
pass "S1: v2 live on slot B, new page 200, gate ran, env/public/cache/static carried over"
bot_untouched "S1"

# ── S2: re-run of the same commit = real rebuild ───────────────────────────────────────
step "S2 re-run of the same commit (the 'Already up to date' bug)"
poll_start; deploy ok; poll_stop "S2"
S2_REL=$(readlink -f "$APP_ROOT/current")
[ "$S2_REL" != "$S1_REL" ] || fail "S2: no new release was built"
[ "$(cat "$S2_REL/REVISION")" = "$V2" ] || fail "S2: wrong revision"
grep -q "already live — building a FRESH release" "$WORK/last.log" || fail "S2: re-run notice missing"
[ "$(upstream_port)" = 3000 ] || fail "S2: should have alternated to slot A (3000)"
[ "$(live_build)" = "$(cat "$S2_REL/.next/BUILD_ID")" ] || fail "S2: live build is not the rebuilt one"
[ "$(readlink -f "$APP_ROOT/previous")" = "$S1_REL" ] || fail "S2: previous should be the S1 release"
pass "S2: same commit rebuilt into a fresh release and switched (slot A)"
bot_untouched "S2"

# ── S3: failing build ──────────────────────────────────────────────────────────────────
step "S3 a build that fails"
BEFORE=$(live_build); PORT_BEFORE=$(upstream_port); NAMES_BEFORE=$(pm2_names)
echo build-fail > "$WORK/src/fault.txt"; commit "v3: broken build" >/dev/null
poll_start; deploy fail; poll_stop "S3"
[ "$(live_build)" = "$BEFORE" ] && [ "$(upstream_port)" = "$PORT_BEFORE" ] && [ "$(pm2_names)" = "$NAMES_BEFORE" ] || fail "S3: production changed after a failed build"
grep -q "production was NOT switched" "$WORK/last.log" || fail "S3: no 'not switched' message"
ls -d "$APP_ROOT"/releases/*.failed >/dev/null 2>&1 || fail "S3: failed release not kept for inspection"
pass "S3: failed build left production untouched"
bot_untouched "S3"

# ── S3b: the new release builds but never starts ───────────────────────────────────────
step "S3b the new release crashes at start-up → never switched"
echo start-fail > "$WORK/src/fault.txt"; commit "v3b: start-up crash" >/dev/null
poll_start; deploy fail; poll_stop "S3b"
[ "$(live_build)" = "$BEFORE" ] && [ "$(upstream_port)" = "$PORT_BEFORE" ] && [ "$(pm2_names)" = "$NAMES_BEFORE" ] || fail "S3b: production changed after a start-up failure"
grep -q "did not return 200 on / within" "$WORK/last.log" || fail "S3b: the health check did not report the start-up failure"
grep -q "production was NOT switched" "$WORK/last.log" || fail "S3b: no 'not switched' message"
pass "S3b: a release that never answers was not switched to; its PM2 slot was removed"
bot_untouched "S3b"

# ── S4: a new city page that 404s in the new build (the incident class) ────────────────
step "S4 new city page answering 404 in the new release → gate blocks the switch"
rm -f "$WORK/src/fault.txt"
set_cities city-a city-b city-new city-broken
echo "serve-404:city-broken" > "$WORK/src/fault.txt"
commit "v4: city-broken 404s" >/dev/null
poll_start; deploy fail; poll_stop "S4"
[ "$(live_build)" = "$BEFORE" ] && [ "$(upstream_port)" = "$PORT_BEFORE" ] && [ "$(pm2_names)" = "$NAMES_BEFORE" ] || fail "S4: production changed although the gate failed"
grep -q "/cities-we-serve/city-broken answered 404" "$WORK/last.log" || fail "S4: the gate did not name the 404 page"
grep -q "NOT switching traffic" "$WORK/last.log" || fail "S4: no 'NOT switching' message"
pass "S4: the route gate caught the 404 before any traffic moved; idle slot removed"
bot_untouched "S4"

# ── S4b: the new release reports another commit than the one it was built from ───────────
# A failed identity check must only stop the switch: no traffic move, no restart of the live slot,
# no rollback, nothing touched on the other tenant.
step "S4b new release reports a different commit → gate blocks the switch"
rm -f "$WORK/src/fault.txt"; set_cities city-a city-b city-new
echo "wrong-commit" > "$WORK/src/fault.txt"
commit "v4b: identity mismatch" >/dev/null
poll_start; deploy fail; poll_stop "S4b"
[ "$(live_build)" = "$BEFORE" ] && [ "$(upstream_port)" = "$PORT_BEFORE" ] && [ "$(pm2_names)" = "$NAMES_BEFORE" ] || fail "S4b: production changed although the identity check failed"
grep -qF "identity: production serves commit 000000000000" "$WORK/last.log" || fail "S4b: the gate did not report the commit mismatch"
grep -q "NOT switching traffic" "$WORK/last.log" || fail "S4b: no 'NOT switching' message"
grep -F "identity: production serves commit" "$WORK/last.log" | sed 's/^/    /'
pass "S4b: a commit mismatch blocked the switch; production, live slot and upstream untouched"
bot_untouched "S4b"

# ── S4c: a page that answers 200 but IS the not-found page (soft 404) ──────────────────
step "S4c a city page renders the not-found page with status 200 → gate blocks the switch"
rm -f "$WORK/src/fault.txt"; set_cities city-a city-b city-new
echo "soft-404:city-new" > "$WORK/src/fault.txt"
commit "v4c: soft 404" >/dev/null
poll_start; deploy fail; poll_stop "S4c"
[ "$(live_build)" = "$BEFORE" ] && [ "$(upstream_port)" = "$PORT_BEFORE" ] && [ "$(pm2_names)" = "$NAMES_BEFORE" ] || fail "S4c: production changed although the gate failed"
grep -qF "/cities-we-serve/city-new answered 200 but rendered the not-found page (soft 404)" "$WORK/last.log" || fail "S4c: the gate did not report the soft 404"
grep -q "NOT switching traffic" "$WORK/last.log" || fail "S4c: no 'NOT switching' message"
pass "S4c: a branded 404 served with status 200 counted as a failure; production untouched"
bot_untouched "S4c"

# ── S5: good commit, then rollback ─────────────────────────────────────────────────────
step "S5 good commit, then rollback to the previous release"
rm -f "$WORK/src/fault.txt"; set_cities city-a city-b city-new city-fixed
V5=$(commit "v5: good")
poll_start; deploy ok; poll_stop "S5 deploy"
S5_REL=$(readlink -f "$APP_ROOT/current"); [ "$(cat "$S5_REL/REVISION")" = "$V5" ] || fail "S5: v5 not live"
[ "$(live_code /cities-we-serve/city-fixed)" = 200 ] || fail "S5: city-fixed not 200"
# Static continuity beyond one deploy: the S2 build (just replaced) AND the S1 build (two deploys
# back) still serve their JS chunks, so tabs opened on either keep working.
for b in "$(cat "$S2_REL/.next/BUILD_ID")" "$S1_BUILD"; do
  [ "$(live_code "/_next/static/chunks/page-$b.js")" = 200 ] || fail "S5: the JS chunk of earlier build $b is gone after the deploy"
done
[ "$(live_code /products/shipping-container)" = 301 ] || fail "S5: the redirect does not answer 301 through nginx"
pass "S5: chunks of the previous two builds still served; redirect 301 through nginx"
poll_start; deploy ok rollback; poll_stop "S5 rollback"
[ "$(readlink -f "$APP_ROOT/current")" = "$S2_REL" ] || fail "S5: rollback did not re-activate the previous release"
[ "$(live_build)" = "$(cat "$S2_REL/.next/BUILD_ID")" ] || fail "S5: live build after rollback is wrong"
grep -q "Rollback successful" "$WORK/last.log" || fail "S5: rollback message missing"
pass "S5: v5 deployed, then rolled back to the previous release with zero downtime"
bot_untouched "S5"

# ── S6: concurrent deploys ─────────────────────────────────────────────────────────────
step "S6 two deploys at the same time"
( "$SCRIPT" deploy > "$WORK/s6-first.log" 2>&1; echo $? > "$WORK/s6-first.rc" ) &
FIRST=$!
for _ in $(seq 1 100); do grep -q "preflight OK" "$WORK/s6-first.log" 2>/dev/null && break; sleep 0.1; done
set +e; "$SCRIPT" deploy > "$WORK/s6-second.log" 2>&1; SECOND_RC=$?; set -e
wait "$FIRST"
[ "$SECOND_RC" != 0 ] && grep -q "another deploy/rollback is running" "$WORK/s6-second.log" || fail "S6: the second deploy was not refused"
[ "$(cat "$WORK/s6-first.rc")" = 0 ] || { cp "$WORK/s6-first.log" "$WORK/last.log"; fail "S6: the first deploy failed"; }
pass "S6: concurrent deploy refused by the lock; the first one completed"
bot_untouched "S6"

# ── S7: prune ──────────────────────────────────────────────────────────────────────────
step "S7 old releases are pruned"
deploy ok
n=$(ls -1d "$APP_ROOT"/releases/*/ | wc -l)
nf=$(ls -1d "$APP_ROOT"/releases/*.failed/ 2>/dev/null | wc -l)
[ $((n - nf)) -le $((KEEP_RELEASES + 2)) ] || fail "S7: $((n - nf)) good release dirs kept (limit $KEEP_RELEASES + current/previous)"
[ "$nf" -le 1 ] || fail "S7: $nf failed release dirs kept (limit KEEP_FAILED=1; S3–S4c left five)"
[ -d "$(readlink -f "$APP_ROOT/current")" ] && [ -d "$(readlink -f "$APP_ROOT/previous")" ] || fail "S7: current/previous pruned"
pass "S7: $n release directories kept"
bot_untouched "S7"

# ── S8: main moved back to an older commit (force-push) ────────────────────────────────
step "S8 main rewound to an older commit → refused; only --allow-non-descendant overrides"
BEFORE=$(live_build); PORT_BEFORE=$(upstream_port); NAMES_BEFORE=$(pm2_names); CUR_BEFORE=$(readlink -f "$APP_ROOT/current")
LATEST=$(git -C "$WORK/src" rev-parse HEAD)
[ "$(cat "$CUR_BEFORE/REVISION")" = "$LATEST" ] || fail "S8: setup — the live release is not the newest commit"
git -C "$WORK/src" push -q -f origin "$V2:main"
poll_start; deploy fail; poll_stop "S8"
[ "$(live_build)" = "$BEFORE" ] && [ "$(upstream_port)" = "$PORT_BEFORE" ] && [ "$(pm2_names)" = "$NAMES_BEFORE" ] && [ "$(readlink -f "$APP_ROOT/current")" = "$CUR_BEFORE" ] || fail "S8: production changed although the deploy was refused"
grep -q "does not contain the live commit" "$WORK/last.log" || fail "S8: the stale-commit guard did not name the problem"
pass "S8: an older commit on main was refused; production untouched"
poll_start; deploy ok deploy --allow-non-descendant; poll_stop "S8 override"
[ "$(cat "$(readlink -f "$APP_ROOT/current")/REVISION")" = "$V2" ] || fail "S8: --allow-non-descendant did not deploy the rewound commit"
git -C "$WORK/src" push -q -f origin "$LATEST:main"
poll_start; deploy ok; poll_stop "S8 forward again"
[ "$(cat "$(readlink -f "$APP_ROOT/current")/REVISION")" = "$LATEST" ] || fail "S8: main restored but not deployed"
pass "S8: the explicit override deployed the rewound commit; restoring main moved forward again"
bot_untouched "S8"

# ── S9: interruptions ──────────────────────────────────────────────────────────────────
# a) the SSH connection drops mid-deploy: the caller stops reading the output and the script gets
#    SIGHUP. The deploy must carry on to the end, with its full log on disk.
step "S9a caller disconnects mid-deploy (SSH drop) → the deploy still completes"
set_cities city-a city-b city-new city-fixed city-s9
V9=$(commit "v9: deployed through a dropped connection")
poll_start
"$SCRIPT" deploy > >(head -n 3 > /dev/null) 2>&1 &
S9_PID=$!
for _ in $(seq 1 100); do ls -d "$APP_ROOT"/releases/*-"${V9:0:7}" >/dev/null 2>&1 && break; sleep 0.1; done
kill -HUP "$S9_PID" 2>/dev/null || true
set +e; wait "$S9_PID"; S9_RC=$?; set -e
sleep 1   # the script's tee may still be writing the last lines of the log
poll_stop "S9a"
S9_LOG=$(ls -1t /var/log/deploy-portable-office/*-deploy.log | head -1)
cp "$S9_LOG" "$WORK/last.log"
[ "$S9_RC" = 0 ] || fail "S9a: the deploy exited $S9_RC after the caller disconnected"
grep -q "Deployment successful: $V9" "$S9_LOG" || fail "S9a: the log on disk does not end with the successful deploy"
[ "$(cat "$(readlink -f "$APP_ROOT/current")/REVISION")" = "$V9" ] && [ "$(live_code /cities-we-serve/city-s9)" = 200 ] || fail "S9a: v9 is not live"
pass "S9a: SIGHUP + closed output did not stop the deploy; v9 live, full log on disk"
bot_untouched "S9a"

# b) the deploy is killed outright (kill -9, reboot) after it started the idle slot, before the
#    switch: production must be untouched and the next run must recover on its own.
step "S9b deploy killed with SIGKILL before the switch → production untouched, next run recovers"
BEFORE=$(live_build); PORT_BEFORE=$(upstream_port); CUR_BEFORE=$(readlink -f "$APP_ROOT/current")
set_cities city-a city-b city-new city-fixed city-s9 city-s9b
V9B=$(commit "v9b: killed mid-deploy")
poll_start
"$SCRIPT" deploy > "$WORK/s9b.log" 2>&1 &
S9_PID=$!
for _ in $(seq 1 300); do grep -q "health: waiting for" "$WORK/s9b.log" 2>/dev/null && break; sleep 0.1; done
grep -q "health: waiting for" "$WORK/s9b.log" || { cp "$WORK/s9b.log" "$WORK/last.log"; fail "S9b: the deploy never reached the idle-slot start"; }
kill -9 "$S9_PID"; wait "$S9_PID" 2>/dev/null || true
# Orphaned children of the killed script (a `sleep 2` of the health loop) hold the lock briefly.
for _ in $(seq 1 30); do flock -n /run/lock/deploy-portable-office.lock true && break; sleep 1; done
flock -n /run/lock/deploy-portable-office.lock true || fail "S9b: the lock was not released after the killed deploy"
[ "$(live_build)" = "$BEFORE" ] && [ "$(upstream_port)" = "$PORT_BEFORE" ] && [ "$(readlink -f "$APP_ROOT/current")" = "$CUR_BEFORE" ] || fail "S9b: production changed after the killed deploy"
deploy ok
poll_stop "S9b"
grep -q "pm2: removing stale idle process" "$WORK/last.log" || fail "S9b: the next run did not clear the half-started idle slot"
[ "$(cat "$(readlink -f "$APP_ROOT/current")/REVISION")" = "$V9B" ] && [ "$(live_code /cities-we-serve/city-s9b)" = 200 ] || fail "S9b: the recovery deploy did not make v9b live"
pass "S9b: a killed deploy left production untouched; the next run cleared its idle slot and went live"
bot_untouched "S9b"

echo; echo "ALL $PASS CHECKS PASSED"
