# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --production=false
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Backend runtime ──────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Install production dependencies only
COPY backend/package*.json ./
RUN npm ci --production && npm cache clean --force

# Copy backend source
COPY backend/ ./

# Copy built frontend into backend's static serving directory
COPY --from=frontend-build /app/frontend/dist ./public

# Create logs and uploads directories
RUN mkdir -p logs uploads

# Non-root user for security
RUN addgroup -g 1001 appuser && adduser -u 1001 -G appuser -s /bin/sh -D appuser
RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "server.js"]
