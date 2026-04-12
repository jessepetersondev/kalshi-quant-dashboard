# Quickstart: Kalshi Quant Dashboard

## Prerequisites

- Node.js 22 LTS
- `pnpm` 10+
- Docker and Docker Compose
- Access to the sibling repos:
  - `../kalshi-btc-quant`
  - `../kalshi-eth-quant`
  - `../kalshi-sol-quant`
  - `../kalshi-xrp-quant`
  - `../kalshi-integration-event-publisher`
  - `../kalshi-integration-executor`

## Planned Monorepo Layout

```text
apps/
  web/
  api/
  ingest/
packages/
  auth/
  config/
  contracts/
  db/
  observability/
  source-adapters/
  testing/
  ui/
infra/
  compose/
  kubernetes/
docs/
  runbooks/
  schema/
  troubleshooting/
tests/
```

## Local Seeded Mode

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start local infrastructure:

   ```bash
   docker compose -f infra/compose/local.yml up -d postgres rabbitmq
   ```

3. Create the database schema:

   ```bash
   pnpm db:migrate
   ```

4. Load foundational users, policies, flags, rules, and strategy bindings:

   ```bash
   pnpm db:seed
   ```

5. Load representative read-model facts for overview, lifecycle, queue, and
   alert validation:

   ```bash
   pnpm exec tsx scripts/release/seed-smoke.ts
   ```

6. Start the dashboard apps:

   ```bash
   pnpm dev
   ```

7. Open the web app and sign in with a seeded local user:

   - `operator@example.internal`
   - `developer@example.internal`
   - `admin@example.internal`

8. Confirm the seed also created:

   - baseline access or export policy records
   - feature flags
   - alert rule defaults

## Local Integration Mode

1. Start PostgreSQL and RabbitMQ with management enabled:

   ```bash
   docker compose -f infra/compose/local.yml up -d postgres rabbitmq
   ```

2. Start the publisher and executor sibling repos with the same RabbitMQ broker.

3. Start the strategy repos:
   - BTC validates hybrid strategy coverage through both direct strategy reads
     and publisher-backed order flow.
   - ETH, SOL, and XRP must expose their local API endpoints because the first
     release ingests direct strategy read models from them.

4. Configure the dashboard env file:

   ```bash
   cp .env.example .env.local
   ```

5. Set the strategy adapter and integration endpoints:

   ```text
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/kalshi_quant_dashboard
   RABBITMQ_URL=amqp://guest:guest@localhost:5672
   RABBITMQ_MANAGEMENT_URL=http://guest:guest@localhost:15672/api
   PUBLISHER_BASE_URL=http://localhost:5001
   EXECUTOR_BASE_URL=http://localhost:5002
   STRATEGY_BTC_BASE_URL=http://localhost:8101
   STRATEGY_ETH_BASE_URL=http://localhost:8102
   STRATEGY_SOL_BASE_URL=http://localhost:8103
   STRATEGY_XRP_BASE_URL=http://localhost:8104
   AUTH_MODE=dev
   ```

6. Start the dashboard:

   ```bash
   pnpm dev
   ```

## Validation Scenarios

### Scenario 1: Overview landing state

1. Sign in as `operator`.
2. Confirm the first route is `/overview`.
3. Verify the page shows:
   - global health
   - aggregate PnL
   - live decision feed
   - live trade feed
   - queue health
   - recent alerts

### Scenario 2: Mixed-source strategy compatibility

1. Confirm BTC lifecycles appear with centralized publisher or executor path
   evidence and may also show direct strategy parity inputs.
2. Confirm ETH, SOL, and XRP decisions, skips, positions, and PnL are visible
   even when centralized publisher facts are incomplete.
3. Confirm source-path indicators distinguish `publisher_only`, `direct_only`,
   and `hybrid` lifecycles rather than implying all strategies already share one
   path.

### Scenario 3: End-to-end lifecycle trace

1. Trigger or seed a lifecycle containing a decision, order, execution result,
   and terminal outcome.
2. Search by `correlation_id`, `client_order_id`, `publisher_order_id`, or
   `external_order_id`.
3. Open the detail drawer.
4. Confirm the timeline includes source path, routing information, queue and
   exchange metadata, retry counts, and terminal state.
5. Open the dedicated `/decisions/:correlationId` or `/trades/:correlationId`
   page and confirm it matches the drawer content.

### Scenario 4: Skip-only and no-trade diagnostics

1. Seed or trigger a strategy cycle that emits only skip decisions.
2. Confirm the Skips page shows explicit skip rows with raw reason text and
   canonical category or code.
3. Confirm no downstream order is required for the skip to appear.
4. Export the current skipped-trade view and confirm the CSV matches the active
   range, search, and strategy filters.

### Scenario 5: Ordered convergence after duplicate delivery

1. Seed or trigger a lifecycle through RabbitMQ.
2. Replay the same publisher or executor message with the same source event id.
3. Confirm:
   - only one canonical decision or trade fact is visible
   - observation metadata shows redelivery or replay history
   - live and historical views still expose matching ids and timestamps

### Scenario 6: Ordered convergence after replay or backfill

1. Seed a lifecycle with an intentionally missing terminal event.
2. Open the trade detail and confirm it is marked degraded.
3. Backfill or replay the missing terminal source event.
4. Confirm:
   - the existing lifecycle record converges to the terminal state
   - no duplicate row is created
   - the historical query and live detail now agree on identifiers, timestamps,
     and outcome

### Scenario 7: Alert deep links and drawers

1. Trigger an alert from queue backlog, missing heartbeat, or ingest failure.
2. Open the alert from overview, alerts list, strategy detail, and operations.
3. Confirm each entry point supports:
   - in-context drawer inspection
   - dedicated navigation to `/alerts/:alertId`
   - preserved surrounding query context
4. Export the current alert list and confirm the CSV matches the active filter
   state.

### Scenario 8: Config-driven alert rule change

1. Sign in as `admin`.
2. Open `/admin/alert-rules`.
3. Lower the backlog-age threshold for one queue.
4. Create a backlog that crosses the new threshold.
5. Confirm the alert opens using the updated rule and an audit event records the
   change.

### Scenario 9: RBAC denial paths

1. Sign in as `operator`.
2. Open a decision or trade detail and confirm `rawPayloadAvailable` is false.
3. Attempt a debug SSE subscription and confirm HTTP 403.
4. Attempt `/api/admin/access-policies`, `/api/admin/alert-rules`, and
   `/api/admin/feature-flags` and confirm HTTP 403.
5. Sign in as `developer` and confirm raw payload detail is available but admin
   alert-rule, access-policy, and feature-flag mutation remain denied unless
   explicitly granted by policy.
6. Sign in as `admin` and confirm alert-rule, access-policy, and feature-flag
   administration are allowed.

### Scenario 10: Access-policy administration

1. Sign in as `admin`.
2. Open `/admin/access-policies`.
3. Create or update a policy that narrows one user's export scope to a subset of
   resources.
4. Confirm the page shows:
   - current policy version
   - rules and export grants
   - audit references
5. Re-authenticate as the affected user and confirm visible export controls and
   backend export responses now match the updated effective capability result.

### Scenario 11: Feature-flag mutation round trip

1. Sign in as `admin`.
2. Open `/admin/feature-flags`.
3. Update one feature flag with a valid payload and confirm:
   - the flag state changes
   - the new version is shown
   - an audit record exists
4. Submit an invalid or stale update and confirm:
   - the UI shows validation or conflict feedback
   - no partial change is applied

### Scenario 12: PnL edge cases

1. Seed or trigger:
   - partial fills
   - partial closes
   - settlement transitions
   - stale marks
   - direct snapshot versus reconstructed PnL disagreement
2. Confirm the PnL page shows:
   - realized and unrealized net PnL
   - fees separately
   - stale or partial status where appropriate
   - degraded disagreement indicators when direct snapshots and reconstruction do
     not match within tolerance
3. Export the current PnL view and confirm the CSV reflects the selected bucket,
   custom range, timezone, and compare-mode strategy set.

### Scenario 13: Pause and resume live feeds

1. Open the overview live feeds.
2. Pause the feed while new events continue arriving.
3. Confirm the visible rows freeze and a paused freshness badge is shown.
4. Resume and verify buffered projection changes apply in ascending stream cursor
   order without duplicate rows.

### Scenario 14: New strategy onboarding by configuration

1. Add a seeded strategy record that follows `kalshi-${cryptoSymbol}-quant`.
2. Bind it to an existing source contract profile and endpoint config.
3. Start emitting valid events or fixtures.
4. Confirm the strategy appears in shared list, compare mode, decisions, trades,
   skips, analytics, and alerts without creating new frontend route code or
   asset-specific collector code.

### Scenario 15: Deployment-readiness smoke

1. Build OCI images for `web`, `api`, and `ingest`.
2. Run the reference deployment stack.
3. Seed the smoke read model with representative overview, lifecycle, queue, and
   alert facts.
4. Verify:
   - `/health/live`
   - `/health/ready`
   - `/overview`
   - `/alerts/:alertId` for a seeded alert
   - `/admin/access-policies`
   - `/admin/feature-flags`
   - `/api/auth/session`
   - SSE connect and resume with `Last-Event-ID`
   - alert-rule defaults loaded successfully

## Planned Test Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:contract
pnpm test:e2e
pnpm test:smoke
pnpm build
```

## Operational Notes

- The browser never connects directly to RabbitMQ or Kalshi.
- Local development uses dev auth only; production assumes internal OIDC or an
  equivalent identity proxy.
- Queue metrics require RabbitMQ Management APIs to be enabled.
- Replay, backfill, and resync tests should inspect both canonical facts and
  observation metadata.
