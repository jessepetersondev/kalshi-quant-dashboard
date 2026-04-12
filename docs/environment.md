# Environment

`kalshi-quant-dashboard` uses [.env.example](../.env.example) as the local
authoritative template.

## Public Runtime Values

- `WEB_PORT`
- `PORT_API`
- `PORT_INGEST`
- `AUTH_MODE`
- `RABBITMQ_MANAGEMENT_URL`
- `PUBLISHER_BASE_URL`
- `EXECUTOR_BASE_URL`
- `STRATEGY_BTC_BASE_URL`
- `STRATEGY_ETH_BASE_URL`
- `STRATEGY_SOL_BASE_URL`
- `STRATEGY_XRP_BASE_URL`
- `INGEST_POLL_INTERVAL_MS`

## Server-Only Secrets

- `DATABASE_URL`
- `RABBITMQ_URL`
- `SESSION_COOKIE_SECRET`

These values must be mounted only into `api` and `ingest`. The browser never
receives them.

## Deployment Flags

The ingest runtime supports explicit deployment toggles for smoke or emergency
containment flows:

- `INGEST_ENABLE_STRATEGY_COLLECTORS`
- `INGEST_ENABLE_PUBLISHER_COLLECTOR`
- `INGEST_ENABLE_EXECUTOR_COLLECTOR`
- `INGEST_ENABLE_RABBITMQ_MANAGEMENT_COLLECTOR`
- `INGEST_ENABLE_RABBITMQ_CONSUMERS`
