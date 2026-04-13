# Local Development

## Seeded Local Mode

1. `pnpm install`
2. `docker compose -f infra/compose/local.yml up -d postgres rabbitmq`
3. `cp .env.example .env.local`
4. `pnpm db:migrate`
5. `pnpm db:seed`
6. `pnpm exec tsx scripts/release/seed-smoke.ts`
7. `pnpm dev`

Then sign in with one of:

- `operator@example.internal`
- `developer@example.internal`
- `admin@example.internal`

## Smoke Deployment Mode

1. `docker build -f infra/docker/api.Dockerfile -t kqd-api-smoke:local .`
2. `docker build -f infra/docker/ingest.Dockerfile -t kqd-ingest-smoke:local .`
3. `docker build -f infra/docker/web.Dockerfile -t kqd-web-smoke:local .`
4. `docker compose -f infra/compose/smoke.yml up -d`
5. `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55433/kalshi_quant_dashboard pnpm db:migrate`
6. `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55433/kalshi_quant_dashboard pnpm db:seed`
7. `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55433/kalshi_quant_dashboard pnpm exec tsx scripts/release/seed-smoke.ts`
8. `pnpm release:verify-staging --base-url http://127.0.0.1:39080`

The smoke ingest container enables a smoke-only heartbeat refresher so seeded
strategy health does not age into a false degraded state while the demo stack
is left running.

If the default smoke ports are occupied, override `SMOKE_POSTGRES_PORT`,
`SMOKE_RABBITMQ_PORT`, `SMOKE_RABBITMQ_MANAGEMENT_PORT`, `SMOKE_API_PORT`,
`SMOKE_INGEST_PORT`, and `SMOKE_WEB_PORT` before starting the stack.

If you want trade-detail links to open the local publisher dashboard, set
`PUBLISHER_BASE_URL` before step 4. The default smoke value targets
`http://127.0.0.1:5126`.

## Source Tree Notes

- SSE implementation lives at `apps/api/src/plugins/sse.ts`
- Schema docs live under `docs/schema/*`
- Deployment assets live under `infra/docker`, `infra/compose`, and
  `infra/kubernetes`

## Onboarding a New Strategy

1. Add the strategy record to the seeded registry.
2. Add source bindings or compatibility mappings instead of UI route code.
3. Seed fixtures or emit live payloads.
4. Re-run `pnpm test:integration` and `pnpm test:e2e`.
