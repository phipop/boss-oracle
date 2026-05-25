# syntax=docker/dockerfile:1

# ---- build stage: compile native deps (better-sqlite3) ----
# Debian slim (glibc), NOT alpine/musl — better-sqlite3 builds reliably here.
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# Production deps only; compiles better-sqlite3 against this Node/glibc.
RUN npm ci --omit=dev

# ---- runtime stage: slim, no toolchain, no devDeps ----
# Same base as build so the native better-sqlite3 binary stays ABI/libc-compatible.
FROM node:22-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    SQLITE_FILE=/app/data/users.sqlite
WORKDIR /app
# tini = PID 1 that reaps zombies and forwards signals (app also handles SIGTERM/SIGINT).
RUN apt-get update \
 && apt-get install -y --no-install-recommends tini \
 && rm -rf /var/lib/apt/lists/*
COPY --chown=node:node package.json package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node src ./src
COPY --chown=node:node public ./public
# Persistent data dir (volume mount target), owned by the non-root runtime user.
RUN mkdir -p /app/data && chown node:node /app/data
VOLUME ["/app/data"]
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "src/server.js"]
