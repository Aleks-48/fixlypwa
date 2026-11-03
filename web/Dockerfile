# Многоступенчатая сборка (NFR-011: self-host одной командой; тонкий образ).
# Стадии:
#   deps     — установка node_modules (npm ci, воспроизводимо);
#   builder  — prisma generate + next build (standalone);
#   migrator — образ для one-shot миграций (prisma migrate deploy + db-bootstrap);
#   runner   — тонкий рантайм (Next standalone), непривилегированный пользователь.

# ---------- base ----------
FROM node:20-bookworm-slim AS base
# openssl нужен движку Prisma; ca-certificates — для исходящих HTTPS (SMS-шлюз и т.п.).
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------- deps ----------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---------- builder ----------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---------- migrator ----------
# Отдельный образ: содержит prisma CLI, схему, миграции и скрипт bootstrap.
FROM base AS migrator
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json ./
COPY prisma ./prisma
COPY scripts ./scripts
RUN npx prisma generate
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx scripts/db-bootstrap.ts && npx tsx scripts/check-schema.ts"]

# ---------- runner ----------
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# --chown обязателен: docker-compose монтирует именованный volume поверх storage/uploads
# (marketplace.md M3) — без него каталог достаётся рантайму (пользователь nextjs) root-owned,
# и запись загруженных фото падает с EACCES.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Явно кладём движок Prisma рядом со standalone — трейсер Next иногда его пропускает.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

RUN mkdir -p /app/storage/uploads && chown -R nextjs:nodejs /app/storage
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
