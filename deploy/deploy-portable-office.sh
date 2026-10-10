#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────────────────────
# Portable Office — production deploy for the Hostinger VPS (proposed replacement for
# /usr/local/bin/deploy-portable-office, which .github/workflows/deploy-hostinger.yml runs over
# SSH on every push to main).
#
# WHAT THE CURRENT SCRIPT DOES (from the Actions logs of 2026-10-10):
#   git fetch → git reset to origin/main → npm ci → next build IN THE LIVE DIRECTORY → pm2 reload
#
# WHY THAT IS A PROBLEM — "merged city pages returning 404":
#   `next build` first empties .next (everything but .next/cache) and then rewrites it, while the
#   previous Node process keeps serving from that same directory for the whole build (about 90 s)
#   and until PM2 reloads it. Two consequences:
#     1. Any request the old process gets after the build's prerender step and before the reload
#        is rendered with the OLD code and written into the NEW .next: for a slug the old code does
#        not know, that is a cached 404 (Next persists notFound() results of ISR routes for the
#        revalidate window), which the new process then serves for up to an hour. For an existing
#        page it is the old HTML, served stale for the same hour.
#     2. During the build itself the old process can fail to load modules that were just deleted.
#
# WHAT THIS SCRIPT DOES INSTEAD — release directories, nothing is ever built in place:
#   releases/<sha>/   a fresh checkout + npm ci + next build of the target commit
#   current           a symlink that is flipped to the new release only once the build succeeded
#   pm2 reload        starts the new process in the new release; the old one finishes its
#                     in-flight requests in its own directory and can no longer touch the new build
#   The last few releases are kept so a rollback is `ln -sfn releases/<previous> current && pm2 reload`.
#
# ONE-TIME SETUP (as root, adjust APP_ROOT to the existing layout):
#   mkdir -p "$APP_ROOT/releases" "$APP_ROOT/shared"
#   cp /path/to/existing/checkout/.env "$APP_ROOT/shared/.env"      # the .env the build reads today
#   # PM2 must start the app from the symlink so that each reload picks up the new release:
#   pm2 delete portable-office
#   pm2 start npm --name portable-office --cwd "$APP_ROOT/current" -- start   # (after the first run)
#   pm2 save
#   The first run of this script creates the first release and the `current` symlink; start PM2
#   after it. Node resolves the working directory to the real release path, so the running
#   process is pinned to its release even after the symlink moves.
#
# Everything the Actions log shows today is still printed, so the workflow output reads the same.
# ─────────────────────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/portable-office}"   # ← set to the real location
REPO_URL="${REPO_URL:-https://github.com/portableofficecabin-lang/Portable-Office.git}"
BRANCH="${BRANCH:-main}"
PM2_APP="${PM2_APP:-portable-office}"
KEEP_RELEASES="${KEEP_RELEASES:-3}"

RELEASES="$APP_ROOT/releases"
SHARED="$APP_ROOT/shared"
CURRENT="$APP_ROOT/current"
MIRROR="$APP_ROOT/repo.git"      # bare mirror: one fetch per deploy, cheap checkouts

echo "=== Portable Office deployment started ==="
mkdir -p "$RELEASES" "$SHARED"

echo "Fetching latest $BRANCH branch..."
if [ ! -d "$MIRROR" ]; then
  git clone --bare --branch "$BRANCH" "$REPO_URL" "$MIRROR"
fi
git -C "$MIRROR" fetch --force origin "+refs/heads/$BRANCH:refs/heads/$BRANCH"
target=$(git -C "$MIRROR" rev-parse "$BRANCH")
current=$( [ -L "$CURRENT" ] && basename "$(readlink -f "$CURRENT")" || echo "none" )
echo "Current: $current"
echo "Target:  $target"

release="$RELEASES/$target"
if [ -d "$release" ] && [ -f "$release/.next/BUILD_ID" ]; then
  echo "Release $target already built — reusing it."
else
  rm -rf "$release"
  echo "Updating application..."
  git -C "$MIRROR" worktree prune >/dev/null 2>&1 || true
  git clone --quiet --shared --branch "$BRANCH" "$MIRROR" "$release"
  git -C "$release" checkout --quiet "$target"
  echo "HEAD is now at $(git -C "$release" log --oneline -1)"

  # The build reads the same .env the live app uses (shared, never committed).
  if [ -f "$SHARED/.env" ]; then ln -sfn "$SHARED/.env" "$release/.env"; fi

  echo "Installing exact dependencies..."
  ( cd "$release" && npm ci --no-audit --no-fund )

  echo "Building production website..."
  ( cd "$release" && npm run build )
fi

# Only now does anything the live process can see change: one atomic symlink flip.
ln -sfn "$release" "$CURRENT.tmp" && mv -Tf "$CURRENT.tmp" "$CURRENT"
echo "current -> $(readlink -f "$CURRENT")"

echo "Reloading PM2..."
# --update-env re-reads the cwd/env from the ecosystem, so the new process starts in the new
# release; the old process keeps its own directory until it exits.
pm2 reload "$PM2_APP" --update-env
pm2 save

# Keep the last KEEP_RELEASES releases for rollback; never delete the one in use.
echo "Pruning old releases (keeping $KEEP_RELEASES)..."
live=$(readlink -f "$CURRENT")
ls -1dt "$RELEASES"/* | tail -n +"$((KEEP_RELEASES + 1))" | while read -r old; do
  [ "$(readlink -f "$old")" = "$live" ] && continue
  rm -rf "$old"
done

echo "=== Portable Office deployment finished: $target ==="
