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
#   S4 a new city page that answers 404 in the new build             → gate blocks the switch
#   S5 a good commit, then `rollback`                                → previous release live
#   S6 two deploys at once                                           → the second is refused
#   S7 prune                                                         → old releases removed
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
live_build() { live_body / | sed -nE 's/.*<!--([0-9a-f]+)-->.*/\1/p' | head -1; }
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
  kill "$POLL_PID" 2>/dev/null || true; wait "$POLL_PID" 2>/dev/null || true
  local total bad
  total=$(wc -l < "$WORK/poll.log" | tr -d ' ')
  bad=$(grep -vc '^200$' "$WORK/poll.log" || true)
  [ "$total" -gt 5 ] || fail "$1: the poller recorded only $total requests"
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
for i in $(seq 1 40); do [ "$(live_code /)" = 200 ] && break; sleep 0.5; done
[ "$(live_code /)" = 200 ] || fail "legacy site does not answer through nginx"
LEGACY_BUILD=$(live_build)
for i in $(seq 1 20); do bot_body | grep -q BUILT-ON-TRUST-OK && break; sleep 0.5; done
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
[ -L "$S1_REL/.env.local" ] && [ "$(readlink "$S1_REL/.env.local")" = "$APP_ROOT/shared/.env.local" ] || fail "S1: .env.local is not linked to shared"
grep -q NEXT_PUBLIC_FROM_GIT "$S1_REL/.env" || fail "S1: the committed .env was replaced"
[ -f "$S1_REL/public/bimi/logo.svg" ] || fail "S1: server-only public file not carried over"
ls "$S1_REL/.next/cache/webpack/" | grep -q "build-$LEGACY_BUILD" || fail "S1: build cache was not seeded from the live app"
[ "$(live_code "/_next/static/chunks/page-$LEGACY_BUILD.js")" = 200 ] || fail "S1: the legacy build's JS chunk is gone (open tabs would break)"
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

# ── S5: good commit, then rollback ─────────────────────────────────────────────────────
step "S5 good commit, then rollback to the previous release"
rm -f "$WORK/src/fault.txt"; set_cities city-a city-b city-new city-fixed
V5=$(commit "v5: good")
poll_start; deploy ok; poll_stop "S5 deploy"
S5_REL=$(readlink -f "$APP_ROOT/current"); [ "$(cat "$S5_REL/REVISION")" = "$V5" ] || fail "S5: v5 not live"
[ "$(live_code /cities-we-serve/city-fixed)" = 200 ] || fail "S5: city-fixed not 200"
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
for i in $(seq 1 100); do grep -q "preflight OK" "$WORK/s6-first.log" 2>/dev/null && break; sleep 0.1; done
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
[ "$n" -le $((KEEP_RELEASES + 2)) ] || fail "S7: $n release dirs kept (limit $KEEP_RELEASES + current/previous)"
[ -d "$(readlink -f "$APP_ROOT/current")" ] && [ -d "$(readlink -f "$APP_ROOT/previous")" ] || fail "S7: current/previous pruned"
pass "S7: $n release directories kept"
bot_untouched "S7"

echo; echo "ALL $PASS CHECKS PASSED"
