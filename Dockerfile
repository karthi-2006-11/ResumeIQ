# ==============================================================================
# ResumeIQ Backend — Production Dockerfile
# Minimal, secure, multi-stage Node.js container
# ==============================================================================

FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency manifests
COPY server/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy server application code
COPY server/src ./src
COPY server/server.js ./server.js

# Production Runtime Container
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy application artifacts from build stage
COPY --from=build /app /app

# Run container as non-root unprivileged node user
USER node

EXPOSE 5000

# Container Healthcheck Probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spy http://localhost:5000/api/health || exit 1

CMD ["node", "server.js"]
