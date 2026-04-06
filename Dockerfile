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
FROM node:22-alpine AS api-builder

WORKDIR /app/manga
COPY manga/package.json manga/package-lock.json* ./
RUN npm install --production --frozen-lockfile

# ============================================
# Stage 3: Runtime
# ============================================
FROM node:22-alpine

WORKDIR /app

# Copy built docs
COPY --from=docs-builder /app/docs/dist ./docs/dist

# Copy API
COPY --from=api-builder /app/manga/node_modules ./manga/node_modules
COPY manga/ ./manga/

WORKDIR /app/manga

# Hugging Face requires port 7860
ENV PORT=7860
ENV NODE_ENV=production

EXPOSE 7860

CMD ["node", "app.js"]
