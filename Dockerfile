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
RUN pnpm install --frozen-lockfile --ignore-scripts
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

# Build both server and migration runner bundle
RUN BUILD_TARGET=node-server pnpm run build
RUN pnpm run build:migrate

# Production image
FROM base as runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NITRO_PRESET=node-server
ENV HOST=0.0.0.0

# Install production dependencies for migration runtime
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Copy built application and migration bundle
COPY --from=builder --chown=node:node /app/.output ./.output
COPY --from=builder --chown=node:node /app/dist/migrate ./.output/server/migrate

# Expose port (for server process)
EXPOSE 3000

# Run migrations before starting the app server
# CMD ["sh", "-c", "node ./migrate/index.mjs && node ./.output/server/index.mjs"]
CMD ["node", ".output/server/index.mjs"]
