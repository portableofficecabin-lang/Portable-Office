# syntax=docker/dockerfile:1

FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
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
