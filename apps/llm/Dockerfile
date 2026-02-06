FROM node:22-alpine AS base

# ============================================================
# 1단계: 의존성 설치
# ============================================================
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# pnpm 설치
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# 모노레포 루트 설정 파일 복사
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# 워크스페이스 패키지 package.json 복사
COPY apps/llm/package.json ./apps/llm/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/config/package.json ./packages/config/package.json

# 의존성 설치
RUN pnpm install --frozen-lockfile

# ============================================================
# 2단계: 빌드
# ============================================================
FROM base AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# 의존성 복사
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/llm/node_modules ./apps/llm/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules

# 소스 코드 복사
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared ./packages/shared
COPY packages/ui ./packages/ui
COPY packages/config ./packages/config
COPY apps/llm ./apps/llm

# Next.js 빌드
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @apps/llm run build

# ============================================================
# 3단계: 실행
# ============================================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# standalone 출력 복사
COPY --from=builder /app/apps/llm/public ./apps/llm/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/llm/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/llm/.next/static ./apps/llm/.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/llm/server.js"]
