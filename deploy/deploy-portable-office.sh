#!/usr/bin/env bash
# =====================================================================================
# deploy-portable-office — release-based, near-zero-downtime deployment for
# portableofficecabin.com on the Hostinger VPS (srv2025838).
#
# Install (root):   install -o root -g root -m 750 deploy-portable-office.sh \
#                       /usr/local/bin/deploy-portable-office
# Invoked by:       GitHub Actions "Deploy Portable Office" over SSH as
#                   `sudo -n /usr/local/bin/deploy-portable-office`      (= deploy)
#                   The existing sudoers line (command without arguments) also permits
#                   `... rollback` / `... status`, so nothing in sudoers changes.
#
# Usage:            deploy-portable-office [deploy | rollback [release-id] | status |
#                                           preflight | list | prune]
#
# HOW A DEPLOY WORKS (blue/green on two local ports; nginx decides which one is live)
#   1. git fetch main into a cached clone and export the commit into a NEW release dir
#      /srv/apps/portableofficecabin.com/releases/<utc-stamp>-<sha7>/
#   2. link the shared .env and the shared .next/cache into it, copy the server-only
#      public files, `npm ci`, `next build`     -> the live app is untouched throughout
#   3. start the build under PM2 in the IDLE slot (its own port), wait until it answers,
#      run HTTP health checks against it and confirm it serves the new BUILD_ID
#   4. point the nginx upstream at the idle slot's port, `nginx -t`, graceful reload,
#      then verify THROUGH nginx (TLS, real server_name) that the new BUILD_ID is live
#   5. drain, delete the old slot's PM2 process, `pm2 save`, move the current/previous
#      symlinks, prune old releases
#   Any failure before step 4 leaves production exactly as it was. A failed step-4
#   verification switches nginx straight back to the old port, which is still running.
#
#   Slot A keeps the historical PM2 name `portable-office` on port 3000; slot B is
#   `portable-office-b` on port 3010. Exactly one slot serves traffic at any time.
#   Each release runs from its own directory — no in-place builds, no symlink-flip
#   restarts, so PM2's stored working directory never has to be re-resolved.
# =====================================================================================
set -Eeuo pipefail
umask 022

APP_ROOT=/srv/apps/portableofficecabin.com
RELEASES=$APP_ROOT/releases
SHARED=$APP_ROOT/shared
REPO=$APP_ROOT/repo
CURRENT=$APP_ROOT/current
PREVIOUS=$APP_ROOT/previous
REMOTE_URL=https://github.com/portableofficecabin-lang/Portable-Office.git
BRANCH=${DEPLOY_BRANCH:-main}
KEEP_RELEASES=${KEEP_RELEASES:-3}
HOST_NAME=portableofficecabin.com
SITE_CONF=/etc/nginx/sites-enabled/$HOST_NAME
UPSTREAM_CONF=/etc/nginx/conf.d/portable-office-upstream.conf
UPSTREAM_NAME=portable_office
LOG_DIR=/var/log/deploy-portable-office
LOCK_FILE=/run/lock/deploy-portable-office.lock

SLOT_A_NAME=portable-office;   SLOT_A_PORT=3000
SLOT_B_NAME=portable-office-b; SLOT_B_PORT=3010

HEALTH_PATHS=(/ /cities-we-serve /products /sitemap.xml /robots.txt)
START_TIMEOUT=${START_TIMEOUT:-120}   # seconds to wait for the new process to answer
DRAIN_SECONDS=${DRAIN_SECONDS:-15}    # grace for in-flight requests after the switch
MIN_FREE_DISK_GB=5
MIN_AVAIL_MEM_MB=1500

# sudo resets the environment; PM2 must talk to the root daemon the site runs under.
export HOME=/root PM2_HOME=/root/.pm2 NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

REL=""            # release dir being deployed (used by the exit handler)
NEW_SLOT_NAME=""  # slot started by this run (used by the exit handler)
SWITCHED=0        # 1 once nginx points at the new slot
IS_ROLLBACK=0

# ── helpers ───────────────────────────────────────────────────────────────────────────
ts()  { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { printf '%s  %s\n' "$(ts)" "$*"; }
die() { log "ERROR: $*"; exit 1; }

require_root() { [ "$(id -u)" = 0 ] || die "must run as root (the workflow uses sudo)"; }

slot_name_for_port() {
  case "$1" in
    "$SLOT_A_PORT") echo "$SLOT_A_NAME" ;;
    "$SLOT_B_PORT") echo "$SLOT_B_NAME" ;;
    *) return 1 ;;
  esac
}
other_port() { if [ "$1" = "$SLOT_A_PORT" ]; then echo "$SLOT_B_PORT"; else echo "$SLOT_A_PORT"; fi; }

active_port() {
  [ -f "$UPSTREAM_CONF" ] || die "$UPSTREAM_CONF is missing — run the one-time migration first"
  local p
  p=$(sed -nE 's/^[[:space:]]*server[[:space:]]+127\.0\.0\.1:([0-9]+);.*/\1/p' "$UPSTREAM_CONF" | head -1)
  [ -n "$p" ] || die "could not read the live port from $UPSTREAM_CONF"
  echo "$p"
}

pm2_json() { pm2 jlist 2>/dev/null || echo '[]'; }
# Prints "<pm_cwd> <status>" for a PM2 process name, or nothing when it does not exist.
pm2_proc() {
  pm2_json | node -e '
    let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
      let a = []; try { a = JSON.parse(s); } catch {}
      const p = a.find(x => x.name === process.argv[1]);
      if (p) process.stdout.write((p.pm2_env.pm_cwd || "") + " " + (p.pm2_env.status || ""));
    })' "$1"
}
pm2_exists() { [ -n "$(pm2_proc "$1")" ]; }
pm2_cwds() {
  pm2_json | node -e '
    let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
      let a = []; try { a = JSON.parse(s); } catch {}
      process.stdout.write(a.map(x => x.pm2_env.pm_cwd || "").join("\n"));
    })'
}

port_in_use()      { ss -ltnH "sport = :$1" 2>/dev/null | grep -q .; }
port_listener_pid(){ ss -ltnpH "sport = :$1" 2>/dev/null | sed -nE 's/.*pid=([0-9]+).*/\1/p' | head -1; }

http_code() { # port path
  curl -sS -o /dev/null -m 15 -w '%{http_code}' -H "Host: $HOST_NAME" "http://127.0.0.1:$1$2" 2>/dev/null || echo 000
}

set_link() { # link target  (atomic: rename over the old symlink)
  local tmp="$1.tmp.$$"
  ln -sfn "$2" "$tmp"
  mv -Tf "$tmp" "$1"
}

# ── pre-flight ────────────────────────────────────────────────────────────────────────
preflight_checks() {
  require_root
  local c
  for c in git node npm pm2 nginx curl ss tar flock; do
    command -v "$c" >/dev/null || die "missing command: $c"
  done
  [ -d "$RELEASES" ] && [ -d "$SHARED" ] || die "$APP_ROOT is not set up (releases/ or shared/ missing) — run the one-time migration"
  [ -f "$SHARED/.env" ] || die "$SHARED/.env is missing"
  mkdir -p "$SHARED/next-cache"
  [ -f "$UPSTREAM_CONF" ] || die "$UPSTREAM_CONF is missing"
  grep -q "proxy_pass http://$UPSTREAM_NAME;" "$SITE_CONF" || die "$SITE_CONF does not proxy_pass to upstream $UPSTREAM_NAME"
  nginx -t >/dev/null 2>&1 || die "the CURRENT nginx configuration fails nginx -t — fix that first"
  local live idle live_name idle_name
  live=$(active_port); live_name=$(slot_name_for_port "$live") || die "live port $live is not a known slot"
  idle=$(other_port "$live"); idle_name=$(slot_name_for_port "$idle")
  if port_in_use "$idle" && ! pm2_exists "$idle_name"; then
    die "idle port $idle is used by a foreign process (pid $(port_listener_pid "$idle")) — not ours to take"
  fi
  local avail_gb avail_mb
  avail_gb=$(df -BG --output=avail "$APP_ROOT" | tail -1 | tr -dc 0-9)
  [ "$avail_gb" -ge "$MIN_FREE_DISK_GB" ] || die "only ${avail_gb}G free on $APP_ROOT (need ${MIN_FREE_DISK_GB}G)"
  avail_mb=$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo)
  [ "$avail_mb" -ge "$MIN_AVAIL_MEM_MB" ] || die "only ${avail_mb}MB RAM available (need ${MIN_AVAIL_MEM_MB}MB)"
  log "preflight OK: live=$live_name:$live idle=$idle_name:$idle disk=${avail_gb}G free mem=${avail_mb}MB avail node=$(node -v)"
}

# ── release construction (never touches the live app) ────────────────────────────────
fetch_source() {
  if [ ! -d "$REPO/.git" ]; then
    log "git: cloning $REMOTE_URL into $REPO" >&2
    git clone --quiet "$REMOTE_URL" "$REPO" >&2
  fi
  git -C "$REPO" fetch --quiet --prune origin "$BRANCH" >&2
  git -C "$REPO" rev-parse "origin/$BRANCH"
}

make_release() { # sha -> sets REL
  local sha=$1 id
  id="$(date -u +%Y%m%d%H%M%S)-${sha:0:7}"
  REL="$RELEASES/$id"
  mkdir -p "$REL"
  git -C "$REPO" archive --format=tar "$sha" | tar -x -C "$REL"
  echo "$sha" > "$REL/REVISION"
  ln -s "$SHARED/.env" "$REL/.env"                 # shared env (NEXT_PUBLIC_* are inlined at build time)
  mkdir -p "$REL/.next"
  ln -s "$SHARED/next-cache" "$REL/.next/cache"    # shared webpack + image + fetch cache
  if [ -d "$SHARED/public" ]; then
    cp -a "$SHARED/public/." "$REL/public/"        # server-only public files (e.g. /bimi/logo.svg)
  fi
  log "release: $REL ($sha)"
}

build_release() {
  log "npm ci in $REL (the live app is not affected)"
  ( cd "$REL" && npm ci --no-audit --no-fund --loglevel=error )
  log "next build in $REL"
  ( cd "$REL" && npm run build )
  [ -s "$REL/.next/BUILD_ID" ] || die "the build produced no .next/BUILD_ID"
  log "build OK: BUILD_ID $(cat "$REL/.next/BUILD_ID")"
}

# ── process + traffic management ──────────────────────────────────────────────────────
start_slot() { # name port release
  local name=$1 port=$2 rel=$3
  if pm2_exists "$name"; then
    log "pm2: removing stale idle process $name"
    pm2 delete "$name" >/dev/null
  fi
  if port_in_use "$port"; then
    die "port $port is still in use (pid $(port_listener_pid "$port")) — refusing to start $name"
  fi
  log "pm2: starting $name on 127.0.0.1:$port from $rel"
  ( cd "$rel" && pm2 start "$rel/node_modules/next/dist/bin/next" \
      --name "$name" --cwd "$rel" --time --kill-timeout 10000 \
      --max-restarts 5 --restart-delay 2000 \
      -- start -H 127.0.0.1 -p "$port" >/dev/null )
}

health_check() { # port release
  local port=$1 rel=$2 build_id path code waited=0
  build_id=$(cat "$rel/.next/BUILD_ID")
  log "health: waiting for 127.0.0.1:$port to answer (timeout ${START_TIMEOUT}s)"
  until [ "$(http_code "$port" /)" = 200 ]; do
    sleep 2; waited=$((waited + 2))
    [ "$waited" -lt "$START_TIMEOUT" ] || die "health: port $port did not return 200 on / within ${START_TIMEOUT}s"
  done
  for path in "${HEALTH_PATHS[@]}"; do
    code=$(http_code "$port" "$path")
    [ "$code" = 200 ] || die "health: $path returned $code on port $port"
  done
  curl -sS -m 20 -H "Host: $HOST_NAME" "http://127.0.0.1:$port/" | grep -q "/_next/static/$build_id/" \
    || die "health: port $port is not serving BUILD_ID $build_id"
  log "health: OK on port $port — BUILD_ID $build_id, ${#HEALTH_PATHS[@]} paths returned 200"
}

write_upstream() { # port
  local tmp
  tmp=$(mktemp "$UPSTREAM_CONF.XXXXXX")
  cat > "$tmp" <<EOF
# Managed by /usr/local/bin/deploy-portable-office — do not edit by hand.
# The port below is the LIVE slot: $SLOT_A_PORT = $SLOT_A_NAME, $SLOT_B_PORT = $SLOT_B_NAME.
upstream $UPSTREAM_NAME {
    server 127.0.0.1:$1;
}
EOF
  chmod 644 "$tmp"
  mv -f "$tmp" "$UPSTREAM_CONF"
}

verify_via_nginx() { # expected build id
  local i body
  for i in 1 2 3 4 5 6; do
    body=$(curl -sS -m 20 --resolve "$HOST_NAME:443:127.0.0.1" "https://$HOST_NAME/" 2>/dev/null || true)
    if printf '%s' "$body" | grep -q "/_next/static/$1/"; then return 0; fi
    sleep 2
  done
  return 1
}

switch_upstream() { # new_port old_port build_id
  local new=$1 old=$2 build_id=$3
  write_upstream "$new"
  if ! nginx -t >/dev/null 2>&1; then
    write_upstream "$old"
    die "nginx -t rejected the upstream with port $new — file reverted to $old, nginx NOT reloaded, production unchanged"
  fi
  systemctl reload nginx
  if verify_via_nginx "$build_id"; then
    log "nginx: live traffic now goes to 127.0.0.1:$new (BUILD_ID $build_id)"
    return 0
  fi
  log "nginx: verification FAILED — switching back to port $old"
  write_upstream "$old"
  nginx -t >/dev/null 2>&1 && systemctl reload nginx
  die "nginx reverted to port $old; the new slot is still running on $new for inspection"
}

retire_slot() { # name port
  local name=$1 port=$2 i pid
  log "drain: ${DRAIN_SECONDS}s for in-flight requests on port $port"
  sleep "$DRAIN_SECONDS"
  if pm2_exists "$name"; then
    pm2 delete "$name" >/dev/null
    log "pm2: deleted $name"
  fi
  for i in 1 2 3 4 5 6 7 8 9 10; do
    port_in_use "$port" || break
    sleep 2
  done
  if port_in_use "$port"; then
    pid=$(port_listener_pid "$port")
    log "port $port still held by pid $pid after pm2 delete (orphaned next-server) — terminating it"
    kill "$pid" 2>/dev/null || true
    sleep 3
    if port_in_use "$port"; then kill -9 "$pid" 2>/dev/null || true; fi
  fi
  pm2 save >/dev/null
  log "pm2: process list saved"
}

prune_releases() {
  local cur prev running d n=0
  cur=$(readlink -f "$CURRENT" 2>/dev/null || true)
  prev=$(readlink -f "$PREVIOUS" 2>/dev/null || true)
  running=$(pm2_cwds)
  # newest first by name (ids start with a UTC timestamp)
  for d in $(ls -1d "$RELEASES"/*/ 2>/dev/null | sort -r); do
    d=${d%/}; n=$((n + 1))
    [ "$n" -le "$KEEP_RELEASES" ] && continue
    { [ "$d" = "$cur" ] || [ "$d" = "$prev" ]; } && continue
    printf '%s\n' "$running" | grep -qx "$d" && continue
    log "prune: removing $d"
    rm -rf "$d"
  done
}

# ── commands ──────────────────────────────────────────────────────────────────────────
cmd_deploy() {
  preflight_checks
  local old_port new_port old_name new_name old_rel sha build_id
  old_port=$(active_port); new_port=$(other_port "$old_port")
  old_name=$(slot_name_for_port "$old_port"); new_name=$(slot_name_for_port "$new_port")
  old_rel=$(readlink -f "$CURRENT" 2>/dev/null || true)
  sha=$(fetch_source)
  log "deploy: $BRANCH @ $sha   live: $old_name:$old_port${old_rel:+ ($old_rel)}"
  make_release "$sha"
  build_release
  NEW_SLOT_NAME=$new_name
  start_slot "$new_name" "$new_port" "$REL"
  health_check "$new_port" "$REL"
  build_id=$(cat "$REL/.next/BUILD_ID")
  switch_upstream "$new_port" "$old_port" "$build_id"
  SWITCHED=1
  [ -n "$old_rel" ] && set_link "$PREVIOUS" "$old_rel"
  set_link "$CURRENT" "$REL"
  retire_slot "$old_name" "$old_port"
  prune_releases
  log "=== Deployment successful: $sha is live on $new_name:$new_port ($REL) ==="
}

cmd_rollback() {
  IS_ROLLBACK=1
  preflight_checks
  local target=${1:-}
  if [ -z "$target" ]; then
    target=$(readlink -f "$PREVIOUS" 2>/dev/null || true)
    [ -n "$target" ] || die "no previous release recorded at $PREVIOUS — pass a release id from 'list'"
  else
    case "$target" in /*) ;; *) target="$RELEASES/$target" ;; esac
  fi
  [ -s "$target/.next/BUILD_ID" ] || die "$target is not a built release"
  local old_port new_port old_name new_name cur build_id
  old_port=$(active_port); new_port=$(other_port "$old_port")
  old_name=$(slot_name_for_port "$old_port"); new_name=$(slot_name_for_port "$new_port")
  cur=$(readlink -f "$CURRENT" 2>/dev/null || true)
  [ "$target" != "$cur" ] || die "$target is already the current release"
  log "rollback: re-activating $target on $new_name:$new_port   live: $old_name:$old_port"
  REL=$target; NEW_SLOT_NAME=$new_name
  start_slot "$new_name" "$new_port" "$target"
  health_check "$new_port" "$target"
  build_id=$(cat "$target/.next/BUILD_ID")
  switch_upstream "$new_port" "$old_port" "$build_id"
  SWITCHED=1
  [ -n "$cur" ] && set_link "$PREVIOUS" "$cur"
  set_link "$CURRENT" "$target"
  retire_slot "$old_name" "$old_port"
  log "=== Rollback successful: $(cat "$target/REVISION" 2>/dev/null || echo '?') is live on $new_name:$new_port ==="
}

cmd_status() {
  local port name
  port=$(active_port 2>/dev/null || echo '?')
  name=$(slot_name_for_port "$port" 2>/dev/null || echo '?')
  echo "live      : $name on 127.0.0.1:$port"
  echo "current   : $(readlink "$CURRENT" 2>/dev/null || echo '-')   rev $(cat "$CURRENT/REVISION" 2>/dev/null || echo '-')"
  echo "previous  : $(readlink "$PREVIOUS" 2>/dev/null || echo '-')"
  echo "pm2       :"
  pm2_json | node -e '
    let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
      let a = []; try { a = JSON.parse(s); } catch {}
      for (const p of a) console.log("    " + p.name.padEnd(20), (p.pm2_env.status || "").padEnd(8), "pid " + String(p.pid).padEnd(7), p.pm2_env.pm_cwd || "");
    })'
  echo "releases  :"
  ls -1d "$RELEASES"/*/ 2>/dev/null | sort -r | sed 's#/$##; s/^/    /'
  echo "disk      : $(df -h --output=avail "$APP_ROOT" | tail -1 | tr -d ' ') free"
  echo "memory    : $(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo) MB available"
}

cmd_list() { ls -1d "$RELEASES"/*/ 2>/dev/null | sort -r | sed 's#/$##'; }

with_lock() {
  exec 9>"$LOCK_FILE"
  flock -n 9 || die "another deploy/rollback is running (lock $LOCK_FILE)"
  "$@"
}

on_exit() {
  local rc=$?
  [ "$rc" -eq 0 ] && exit 0
  log "FAILED (exit $rc)"
  if [ "$SWITCHED" = 0 ]; then
    log "production was NOT switched — the live app is unchanged"
    if [ -n "$NEW_SLOT_NAME" ] && [ -n "$REL" ] && [ "$(pm2_proc "$NEW_SLOT_NAME" | cut -d' ' -f1)" = "$REL" ]; then
      pm2 delete "$NEW_SLOT_NAME" >/dev/null 2>&1 || true
      log "pm2: removed the failed slot $NEW_SLOT_NAME"
    fi
    if [ "$IS_ROLLBACK" = 0 ] && [ -n "$REL" ] && [ -d "$REL" ]; then
      mv -T "$REL" "$REL.failed" 2>/dev/null && log "kept $REL.failed for inspection (pruned automatically later)"
    fi
  else
    log "production WAS switched before this failure — run 'deploy-portable-office status' and inspect"
  fi
  exit "$rc"
}

# ── main ──────────────────────────────────────────────────────────────────────────────
CMD=${1:-deploy}
shift || true
case "$CMD" in
  deploy|rollback|status|preflight|list|prune) ;;
  *) echo "usage: deploy-portable-office [deploy | rollback [release-id] | status | preflight | list | prune]" >&2; exit 2 ;;
esac
require_root
mkdir -p "$LOG_DIR"
exec > >(tee -a "$LOG_DIR/$(date -u +%Y%m%dT%H%M%SZ)-$CMD.log") 2>&1
trap on_exit EXIT
log "=== Portable Office: $CMD ==="
case "$CMD" in
  deploy)    with_lock cmd_deploy ;;
  rollback)  with_lock cmd_rollback "$@" ;;
  status)    cmd_status ;;
  preflight) preflight_checks ;;
  list)      cmd_list ;;
  prune)     with_lock prune_releases ;;
esac
