# syntax=docker/dockerfile:1

FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
# .npmrc is REQUIRED here: it carries legacy-peer-deps=true, without which npm ci fails on the
# @react-three/fiber@9 (react>=19 peers) vs react@18 / react-day-picker@8 peer wall. See .npmrc
# for the full rationale — remove it from this COPY only when that file itself is retired.
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# ── ffmpeg + ffprobe ────────────────────────────────────────────────────────────────────
# REQUIRED by the Construction Animation Studio, and by nothing else in this image.
#   ffmpeg  — joins the per-scene clips a video provider returns into ONE file, trimming each
#             to its storyboard duration so the export is exactly 30 seconds
#             (src/lib/animation/assemble.ts).
#   ffprobe — measures the finished file so that "exactly 30 seconds" is a MEASUREMENT and not
#             an assumption (src/lib/animation/probe.ts). Without it the code falls back to its
#             own MP4 `mvhd` reader, which is correct but cannot see stream-level detail.
#
# The alpine package ships both binaries and adds roughly 80 MB to the image. That is the whole
# cost of the feature; without it /api/animation-studio/config reports assemblyAvailable:false
# and the export button stays disabled with that reason shown, which is a working but crippled
# product. Installed in the RUNNER stage only — the builder does not encode anything.
#
# `--no-cache` leaves no apk index behind. The version is deliberately NOT pinned: alpine:20
# carries one ffmpeg per branch and pinning it would break the build on the next patch release.
RUN apk add --no-cache ffmpeg \
 && ffmpeg -version > /dev/null \
 && ffprobe -version > /dev/null

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Persist the ISR incremental cache + next/image (sharp) cache. Next writes
# revalidated HTML and on-demand AVIF/WebP image variants under .next/cache at
# request time. Previously this directory did not survive a container restart, so
# after every deploy the FIRST request to each ISR page re-rendered cold and the
# FIRST request for each image variant re-ran sharp (request-time CPU) — both spike
# TTFB and image LCP. We create it writable here and mark it a volume so the
# platform can mount a NAMED volume to keep it warm across restarts/deploys.
#   docker run -v poc_next_cache:/app/.next/cache ...
# (or the equivalent persistent-volume mount on your host/orchestrator.)
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next/cache
VOLUME ["/app/.next/cache"]

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
