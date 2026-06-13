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
# py3-setuptools provides distutils, removed from Python 3.12 stdlib but required by node-gyp
RUN apk add --no-cache python3 make g++ py3-setuptools

RUN addgroup -g 568 shrums && adduser -u 568 -G shrums -s /bin/sh -D shrums

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server/ ./server/
COPY --from=client-builder /build/server/public ./server/public/

# Pre-create volume mount points with correct ownership
RUN mkdir -p /data /library /downloads && chown -R shrums:shrums /app /data /library

USER shrums

EXPOSE 3737

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3737/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server/index.js"]
