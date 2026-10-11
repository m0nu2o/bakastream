# SkyStream — container image for self-hosted deploys.
#
# Metadata credentials are RUNTIME variables now (the server holds them; the
# browser never sees them), so the image can be built without any secret:
#
#   docker build -t skystream .
#   docker run -p 3000:3000 -e TMDB_ACCESS_TOKEN=<token> skystream

ARG NODE_VERSION=22-alpine
ARG PNPM_VERSION=10.26.0

# --- Stage 1: install dependencies ------------------------------------------
FROM node:${NODE_VERSION} AS deps
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app
COPY .npmrc package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# --- Stage 2: build ---------------------------------------------------------
FROM node:${NODE_VERSION} AS builder
ARG PNPM_VERSION
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

RUN pnpm build

# --- Stage 3: runtime -------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

# The standalone bundle already contains the traced runtime deps; .next/static
# and public are not traced and copy separately.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/ ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static/ ./.next/static/
COPY --from=builder --chown=nextjs:nodejs /app/public/ ./public/

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
