# Kalshi Quant Dashboard

Kalshi Quant Dashboard is a production-oriented internal control plane for
strategy observability, lifecycle tracing, PnL analysis, RabbitMQ or pipeline
operations, and policy-backed operator or developer access.

## Workspace Layout

```text
apps/
  api/      authenticated REST + SSE boundary
  ingest/   mixed-source normalization, projection, and reconciliation runtime
  web/      React dashboard shell and operator surfaces
packages/
  auth/         RBAC, scope, and capability primitives
  config/       env parsing, runtime config, and secret boundaries
  contracts/    shared TypeScript + Zod schemas
  db/           schema, migrations, seeds, repos, and fixtures
  observability/logging, metrics, tracing
  source-adapters/ source compatibility and strategy registry
  testing/      fixture and database harness helpers
  ui/           shared accessible primitives
infra/
  compose/      local and smoke stacks
  docker/       OCI build assets
  kubernetes/   base manifests and staging or production overlays
docs/
  runbooks/
  schema/
  troubleshooting.md
```

## Core Commands

- `pnpm install`
- `docker compose -f infra/compose/local.yml up -d postgres rabbitmq`
- `pnpm db:migrate`
- `pnpm db:seed`
- `pnpm dev`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:coverage`
- `pnpm test:integration`
- `pnpm test:contract`
- `pnpm test:e2e`
- `pnpm test:smoke`
- `pnpm build`

## Deployment Readiness

- Web, API, and ingest OCI assets live in [infra/docker](./infra/docker).
- Kubernetes base manifests and overlays live in [infra/kubernetes](./infra/kubernetes).
- The smoke deployment stack lives in [infra/compose/smoke.yml](./infra/compose/smoke.yml).
- Smoke scenario data is loaded with [scripts/release/seed-smoke.ts](./scripts/release/seed-smoke.ts).
- Staging validation is performed by [scripts/release/verify-staging.ts](./scripts/release/verify-staging.ts).
- Overlay promotion checks are handled by [scripts/release/promote.ts](./scripts/release/promote.ts).

## Strategy Onboarding

New strategy onboarding is configuration-driven:

1. Add the strategy record and source binding in the seeded registry or runtime source.
2. Reuse an existing source profile or compatibility mapping in
   [docs/schema/source-compatibility.md](./docs/schema/source-compatibility.md).
3. Seed or emit valid events.
4. Verify the strategy appears in overview, lifecycle, skips, analytics, alerts,
   and compare mode without adding asset-specific UI routes.

## Documentation Map

- Environment and runtime configuration: [docs/environment.md](./docs/environment.md)
- Local development: [docs/local-development.md](./docs/local-development.md)
- Architecture: [docs/architecture.md](./docs/architecture.md)
- Runbooks: [docs/runbooks](./docs/runbooks)
- Schema docs: [docs/schema/index.md](./docs/schema/index.md)
- Troubleshooting: [docs/troubleshooting.md](./docs/troubleshooting.md)
- Release readiness: [docs/release-readiness.md](./docs/release-readiness.md)
