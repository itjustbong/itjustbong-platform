FROM node:22-alpine AS base

# ============================================================
# 1단계: 의존성 설치
# ============================================================
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

COPY apps/resume/package.json ./apps/resume/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/config/package.json ./packages/config/package.json

RUN pnpm install --frozen-lockfile

# ============================================================
# 2단계: 빌드
# ============================================================
FROM base AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/resume/node_modules ./apps/resume/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui
COPY packages/config ./packages/config
COPY apps/resume ./apps/resume

ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @apps/resume run build

# ============================================================
# 3단계: 실행
# ============================================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/resume/public ./apps/resume/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/resume/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/resume/.next/static ./apps/resume/.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/resume/server.js"]
