FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json .npmrc drizzle.config.ts ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @kalshi-quant-dashboard/auth build \
  && pnpm --filter @kalshi-quant-dashboard/config build \
  && pnpm --filter @kalshi-quant-dashboard/contracts build \
  && pnpm --filter @kalshi-quant-dashboard/db build \
  && pnpm --filter @kalshi-quant-dashboard/observability build

EXPOSE 3001

CMD ["pnpm", "exec", "tsx", "apps/api/src/main.ts"]
