# Release Readiness

Validated on `2026-04-12` for feature `001-quant-ops-dashboard`.

## Release Gate

The release gate is green when all of the following pass against the current
workspace:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:contract`
- `pnpm test:integration`
- `pnpm test:e2e`
- `pnpm test:smoke`
- `pnpm build`
- `docker run --rm -v "$PWD":/work -w /work bitnami/kubectl:latest kustomize infra/kubernetes/overlays/staging`

## Deployment Smoke Evidence

The smoke deployment validates the production-facing boundary rather than a mock
path:

1. Build `web`, `api`, and `ingest` OCI images from `infra/docker/*`.
2. Start the reference stack from `infra/compose/smoke.yml`.
3. Run `pnpm db:migrate`.
4. Run `pnpm db:seed`.
5. Run `pnpm exec tsx scripts/release/seed-smoke.ts` to load representative
   overview, lifecycle, queue, and alert read-model facts.
6. Run `pnpm exec tsx scripts/release/verify-staging.ts --base-url ...`.
7. Run `pnpm exec tsx scripts/release/promote.ts --source ... --target ...` as a
   dry-run overlay promotion check.

Verified in the latest run:

- `/health/live`
- `/health/ready`
- `/overview`
- `/alerts/:alertId` for a seeded alert
- `/api/exports/decisions.csv`
- `/api/exports/trades.csv`
- `/api/exports/skips.csv`
- `/api/exports/alerts.csv`
- `/api/exports/pnl.csv`
- `/admin/access-policies`
- `/admin/feature-flags`
- `/api/auth/session`
- SSE connect and resume with `Last-Event-ID`
- alert-rule defaults loaded successfully

## Runtime Boundaries

- Browser access is limited to `web -> api`; the browser never connects
  directly to RabbitMQ, Kalshi, or secret-bearing strategy services.
- Runtime secrets are provided through environment variables or Kubernetes
  secrets manifests; no secret is baked into the frontend bundle.
- Liveness and readiness probes are implemented for both API and ingest
  services.

## Promotion Notes

- `scripts/release/promote.ts` is currently exercised as a dry-run check. It is
  expected to report overlay differences until promotion is run with `--write`
  as part of a controlled deployment step.
- The smoke harness uses overridable `SMOKE_*_PORT` environment variables so it
  can run on shared development machines without fixed-port collisions.

## Documentation Coverage

The following docs were updated and validated against the implemented runtime:

- [README.md](../README.md)
- [docs/environment.md](./environment.md)
- [docs/local-development.md](./local-development.md)
- [docs/architecture.md](./architecture.md)
- [docs/schema/index.md](./schema/index.md)
- [docs/schema/normalized-events.md](./schema/normalized-events.md)
- [docs/schema/source-compatibility.md](./schema/source-compatibility.md)
- [docs/schema/access-control.md](./schema/access-control.md)
- [docs/schema/admin-mutations.md](./admin-mutations.md)
- [docs/runbooks/replay-and-resync.md](./runbooks/replay-and-resync.md)
- [docs/runbooks/queue-backlog-and-dlq.md](./runbooks/queue-backlog-and-dlq.md)
- [docs/runbooks/stale-pnl.md](./runbooks/stale-pnl.md)
- [docs/troubleshooting.md](./troubleshooting.md)
- [specs/001-quant-ops-dashboard/quickstart.md](../specs/001-quant-ops-dashboard/quickstart.md)
