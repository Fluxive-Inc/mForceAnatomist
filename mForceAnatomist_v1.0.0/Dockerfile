# Build stage
# 2026.09.15: was node:20-alpine + `apk add build-base` + `npm install`, and that
# combination is why this build TIMED OUT at 2400s. package.json declares NO native
# dependency — measured, zero — so build-base was not added for one of ours. It was
# added because Alpine is musl: the Angular toolchain's binaries (esbuild, rollup,
# lightningcss) publish glibc prebuilts and no musl ones, so npm falls back to
# COMPILING THEM FROM SOURCE, and that is what burns forty minutes.
#
# mForcePortal is the fleet's one Angular app currently answering 200, and its web
# build stage is node:20-slim (glibc) with `npm ci --no-audit --no-fund`, no toolchain
# install at all. This copies that shape rather than inventing one. mForceMealPlanner
# carries the identical alpine+build-base Dockerfile and is also down — same fix, not
# applied here because it is a separate app and a separate bake.
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY . .
RUN npm run build

# Production stage
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund
COPY --from=builder /app/dist/m-force-anatomist/browser ./dist
# db.js MUST be here: server.js does require('./db') on line 3, so without it
# the container throws MODULE_NOT_FOUND at boot and the revision never becomes
# healthy. The old pipeline had no smoke test, so this shipped silently.
COPY server.js perimeter-guard.js perimeter.html db.js ./
# Added by _scripts/fix-image-requires.sh — these are required at boot and were
# not in the image. git shipping a file is not the same as the image holding it.
COPY errlog-console.js fleet-scope.js mforce-security.js ./

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "server.js"]
