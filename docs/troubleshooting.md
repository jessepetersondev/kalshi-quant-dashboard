# Troubleshooting

## Common Issues

- If `pnpm install` fails, confirm Node.js 22+ and `pnpm` 10+.
- If `pnpm db:migrate` fails, confirm PostgreSQL is reachable and the correct
  `DATABASE_URL` is set.
- If `pnpm test:e2e` fails during startup, confirm the temporary Postgres
  container on `127.0.0.1:55432` is free.
- If `pnpm test:smoke` fails, inspect `docker compose -f infra/compose/smoke.yml logs`.
- If smoke setup fails with a `docker-buildx` error, confirm the local images can
  be built with plain `docker build`; the smoke test now prebuilds tagged local
  images before starting Compose.
- If smoke deploy fails because a host port is already in use, set
  `SMOKE_POSTGRES_PORT`, `SMOKE_RABBITMQ_PORT`, `SMOKE_RABBITMQ_MANAGEMENT_PORT`,
  `SMOKE_API_PORT`, `SMOKE_INGEST_PORT`, or `SMOKE_WEB_PORT` to free ports and
  rerun the stack or test.
- If `verify-staging` reports that overview is missing a seeded alert, rerun
  `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55433/kalshi_quant_dashboard pnpm exec tsx scripts/release/seed-smoke.ts`
  against the smoke database before validating again.

## Deployment Validation

- If `kubectl` is not installed locally, use a containerized binary for render
  checks:

  `docker run --rm -v "$PWD":/work -w /work bitnami/kubectl:latest kustomize infra/kubernetes/overlays/staging`

- If `/health/ready` fails for ingest, confirm collector toggles and broker or
  database URLs are set consistently.

## Route and Schema Drift

Run:

- `git grep -n -E "apps/api/src/streams|packages/projections" -- README.md docs ':!docs/troubleshooting.md'`
- `pnpm test:contract`

to catch route-layout or contract drift before release.
