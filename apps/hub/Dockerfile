FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/hub/package.json ./apps/hub/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/config/package.json ./packages/config/package.json

RUN pnpm install --frozen-lockfile

COPY apps/hub ./apps/hub
COPY packages/shared ./packages/shared
COPY packages/config ./packages/config

RUN pnpm --filter @apps/hub run build

FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/apps/hub/dist /usr/share/nginx/html
COPY --from=builder /app/apps/hub/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3003

CMD ["nginx", "-g", "daemon off;"]
