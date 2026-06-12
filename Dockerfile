# Stage 1 — build Vite frontend
FROM node:20-alpine AS client-builder
WORKDIR /build
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# Stage 2 — production server
FROM node:20-alpine AS runner

# Build tools needed for better-sqlite3 native compilation on musl/Alpine
RUN apk add --no-cache python3 make g++

RUN addgroup -g 1001 shrums && adduser -u 1001 -G shrums -s /bin/sh -D shrums

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server/ ./server/
COPY --from=client-builder /build/server/public ./server/public/

# Pre-create volume mount points with correct ownership
RUN mkdir -p /data /library /downloads && chown -R shrums:shrums /app /data /library

USER shrums

EXPOSE 3737

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget -qO- http://localhost:3737/api/health || exit 1

CMD ["node", "server/index.js"]
