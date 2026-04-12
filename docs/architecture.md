# Architecture

## Runtime Shape

- `web` is a React + RTK Query client that only talks to authenticated REST and
  SSE endpoints.
- `api` is the single browser-facing boundary. It resolves session capability,
  enforces export or raw-payload access, exposes historical query APIs, and
  emits SSE snapshots or deltas.
- `ingest` consumes mixed-source inputs from direct strategy collectors,
  RabbitMQ publisher or executor flows, heartbeat or queue metrics, and
  reconciliation jobs.

## Data Flow

1. A source adapter validates an upstream payload with a shared contract.
2. The ingest runtime normalizes the observation into a canonical event plus an
   event-observation fact with replay or ordering metadata.
3. Deduplication preserves one canonical fact while retaining every observation.
4. Projectors update decision, trade, skip, PnL, alert, and operations read
   models.
5. REST and SSE surfaces read persisted projections only.

## Security Boundaries

- Browser access stops at `web -> api`.
- Secrets remain server-side in `api` and `ingest` only.
- `web` uses same-origin `/api` and `/api/live/stream`.
- Effective capability resolution is contract-backed and drives both UI gating
  and backend denial behavior.

## Deployment

- `web` is served by NGINX with SPA routing plus `/api` proxying and SSE-safe
  buffering rules.
- `api` and `ingest` run as Node 22 workloads.
- Health probes are exposed at `/health/live` and `/health/ready` for all three
  runtime surfaces.
