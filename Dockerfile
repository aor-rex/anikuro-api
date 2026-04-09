# ============================================
# Stage 1: Build Astro Docs
# ============================================
FROM node:22-alpine AS docs-builder

WORKDIR /app/docs
COPY docs/package.json docs/package-lock.json* ./
RUN npm install --frozen-lockfile

COPY docs/ ./
RUN npm run build

# ============================================
# Stage 2: Build Manga API
# ============================================
FROM node:22-alpine AS manga-builder

WORKDIR /app/manga
COPY manga/package.json manga/package-lock.json* ./
RUN npm install --production --frozen-lockfile

# ============================================
# Stage 3: Build Anime API
# ============================================
FROM node:22-slim AS anime-builder

WORKDIR /app/anime
COPY anime/package.json anime/package-lock.json* ./
RUN npm install --production --frozen-lockfile

# ============================================
# Stage 4: Build Unified Server deps
# ============================================
FROM node:22-alpine AS unified-builder

WORKDIR /app/unified
COPY unified/package.json unified/package-lock.json* ./
RUN npm install --production --frozen-lockfile

# ============================================
# Stage 5: Runtime
# ============================================
FROM node:22-slim

WORKDIR /app

# Install Playwright system dependencies (required for Chromium)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

# Copy built docs
COPY --from=docs-builder /app/docs/dist ./docs/dist

# Copy Manga API
COPY --from=manga-builder /app/manga/node_modules ./manga/node_modules
COPY manga/ ./manga/

# Copy Anime API
COPY --from=anime-builder /app/anime/node_modules ./anime/node_modules
COPY anime/ ./anime/

# Copy Unified Server (with its own deps)
COPY --from=unified-builder /app/unified/node_modules ./unified/node_modules
COPY unified/package.json unified/package-lock.json* ./unified/
COPY unified/app.js ./unified/app.js

WORKDIR /app/unified

# Hugging Face requires port 7860
ENV PORT=7860
ENV NODE_ENV=production

EXPOSE 7860

CMD ["node", "app.js"]
