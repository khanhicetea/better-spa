# Use Node.js 24 Slim image
FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile --config.allow-builds=esbuild,core-js
# For buildkit cache
# RUN --mount=type=cache,id=pnpm-prod,target=/pnpm/store pnpm install --frozen-lockfile

# Build the application
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NODE_ENV=production

# Build both server and worker
RUN BUILD_TARGET=node-server pnpm run build
RUN pnpm run worker:build

# Production image
FROM node:24-slim as runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NITRO_PRESET=node-server
ENV HOST=0.0.0.0

# Copy built application (both server and worker)
COPY --from=builder --chown=node:node /app/.output ./.output

# Expose port (for server process)
EXPOSE 3000

# Default command (server)
CMD ["node", ".output/server/index.mjs"]
