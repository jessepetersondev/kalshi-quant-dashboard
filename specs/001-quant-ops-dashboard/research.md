# Phase 0 Research: Kalshi Quant Dashboard

## Decision: Use a TypeScript monorepo with separate `web`, `api`, and `ingest` apps

- Decision: Build the repository as a `pnpm` workspace with Turborepo orchestration and three deployable apps: `apps/web`, `apps/api`, and `apps/ingest`, backed by shared packages for contracts, DB access, auth, source adapters, projections, config, observability, and UI.
- Rationale: The UI, authenticated read/API layer, and ingestion/reconciliation workers have different scaling and failure modes. A monorepo keeps shared TypeScript contracts and runtime validators in one place while allowing independent deployment and testing.
- Alternatives considered:
  - Single Node service for UI, API, and ingest. Rejected because RabbitMQ consumption, polling, replay, and reconciliation workloads should not share runtime lifecycle with the operator-facing API.
  - Polyrepo split by service. Rejected because the constitution requires shared contracts and validators across every network and event boundary.

## Decision: Use Fastify for the authenticated server boundary and SSE for live operator updates

- Decision: Implement `apps/api` with Fastify, REST endpoints for historical and aggregate queries, and Server-Sent Events at `/api/live/stream` for authenticated live updates.
- Rationale: The product needs server-to-browser push, resume cursors, and reconnect visibility, but not browser-originated bidirectional messaging. SSE keeps the browser behind the authenticated server boundary and works cleanly with session cookies.
- Alternatives considered:
  - WebSockets. Rejected because bidirectional transport is unnecessary for the current operator workflows and adds avoidable connection-state complexity.
  - Poll-only UI. Rejected because the spec requires live feeds, pause/resume behavior, reconnect states, and near-real-time incident visibility.

## Decision: Persist canonical facts and read models in PostgreSQL with durable SQL migrations

- Decision: Use PostgreSQL as the single durable store for canonical event facts, event observations, identifier aliases, alert rules, alert state, audit logs, market-position attribution, and query-optimized read models. Use Drizzle ORM plus checked-in SQL migrations.
- Rationale: The dashboard needs durable historical parity, relational joins across identifiers, admin-editable alert rules, and bounded analytics without introducing a second specialized datastore in the first release.
- Alternatives considered:
  - Event store plus OLAP split. Rejected for the first release because it adds operational overhead before the dashboard proves its query shapes.
  - TimescaleDB-only features. Rejected for the baseline to keep local and CI environments portable; native PostgreSQL partitioning and materialized rollups are sufficient initially.

## Decision: Standardize every boundary with shared TypeScript contracts and Zod validators

- Decision: Store REST schemas, SSE schemas, normalized-event schemas, source-adapter schemas, env config schemas, and DB DTO schemas in `packages/contracts` using TypeScript and Zod, with generated OpenAPI for REST and checked-in markdown compatibility docs for source-boundary mappings.
- Rationale: This satisfies the contract-first constitution requirement and keeps runtime validation ownership inside the monorepo.
- Alternatives considered:
  - TypeScript types only. Rejected because the constitution forbids unvalidated payloads crossing boundaries.
  - JSON Schema as the primary authoring format. Rejected because Zod better matches the implementation stack while still supporting OpenAPI generation.

## Decision: Normalize upstream inputs into a canonical fact plus observation model

- Decision: Model ingestion in two layers:
  - `event_observation`: every seen delivery, poll sample, replay, backfill row, or redelivery observation with ordering and broker metadata
  - `canonical_event`: the deduplicated business fact keyed by the spec-approved dedup identity and stitched by canonical `correlation_id`
- Rationale: Deduplicated facts are required for live/historical parity, but redelivery, replay, backfill, and broker metadata must still be retained for auditability, reconciliation, and constitution compliance.
- Alternatives considered:
  - Store only canonical deduplicated events. Rejected because later redelivery and replay observations would overwrite or hide delivery metadata such as delivery tag, redelivery flag, or replay counts.
  - Store only raw observations and normalize at query time. Rejected because stable historical queries, alerts, and UI performance require pre-normalized facts and read models.

## Decision: Capture ordering, redelivery, and replay metadata explicitly and define ordered convergence semantics

- Decision: Every observation and canonical fact will capture, when available:
  - source sequence or delivery ordinal
  - redelivery flag
  - replay or backfill flag
  - published timestamp
  - received timestamp
  - first-seen timestamp
  - source envelope id
  - exchange
  - queue
  - routing key
  - delivery tag or equivalent broker metadata
  - source variant and adapter version
- Decision: Ordered convergence semantics are:
  - A new fact is created only on the first accepted dedup key.
  - Later redelivery, replay, resync, or backfill observations append to `event_observation` and update observation summary flags on the matching canonical fact; they do not mint a second fact.
  - Lifecycle timelines sort by canonical business time first, then by source ordering metadata when available, then by first-seen timestamp as a stable tie-breaker.
  - Live-feed resume ordering uses a separate monotonic projection cursor, not raw broker delivery order, so replays and backfills can converge into the same visible rows without duplicating them.
- Rationale: The product needs both business-fact parity and auditable delivery history.
- Alternatives considered:
  - Treat redeliveries as independent facts. Rejected because it would violate event integrity and distort UI counts.
  - Ignore delivery order metadata. Rejected because the constitution explicitly requires ordering metadata when available.

## Decision: Make live-to-history convergence persist-first instead of stream-first

- Decision: The ingest service persists validated canonical facts and read-model projection changes before the API service streams them to browsers. SSE events are emitted from a durable `projection_change` cursor backed by the same database projections used by REST queries.
- Rationale: This guarantees that every event the operator sees live can later be found through the historical APIs with the same identifier set and stable timestamps.
- Alternatives considered:
  - Push live data directly from in-memory ingest before persistence. Rejected because reconnects and process restarts could create live-only truths.
  - Recompute historical views solely from raw canonical events on demand. Rejected because the UI requires bounded queries and stable exports at scale.

## Decision: Support mixed ingestion today and centralized convergence later

- Decision: The first release supports:
  - current-state compatibility through RabbitMQ-driven publisher and executor ingestion plus direct strategy collectors where needed
  - future-state convergence in which strategies may later move fully onto the centralized publisher and RabbitMQ path
- Rationale: Upstream inspection shows `kalshi-btc-quant` currently bridges to the publisher path, while `kalshi-eth-quant`, `kalshi-sol-quant`, and `kalshi-xrp-quant` still expose critical facts only through direct strategy APIs and local persistence-backed read models.
- Alternatives considered:
  - Depend only on RabbitMQ events. Rejected because it would omit major portions of ETH/SOL/XRP strategy behavior in the current codebase.
  - Depend only on strategy polling. Rejected because it would miss publisher, executor, and RabbitMQ operational visibility.

## Decision: Use a generic adapter framework plus strategy registry instead of asset-specific collectors

- Decision: Implement reusable source adapters driven by a strategy registry and source-contract binding model. BTC, ETH, SOL, and XRP are seeded configuration records, not bespoke code branches.
- Rationale: The spec requires onboarding by configuration and contract mapping rather than hard-coded per-asset rewrites. Current upstream inconsistency is a source-shape problem, not an asset problem.
- Alternatives considered:
  - One adapter class per asset. Rejected because it violates the extensibility requirement and would bake current repo quirks into the long-term design.
  - Force all sources into one adapter profile immediately. Rejected because current sibling repos are not yet uniform.

## Decision: Publish a source-boundary compatibility matrix as a first-class design artifact

- Decision: Add a checked-in compatibility artifact that documents the exact source profiles used by:
  - `kalshi-integration-event-publisher` envelopes and trading read models
  - `kalshi-integration-executor` lifecycle and dead-letter records
  - `kalshi-${cryptoSymbol}-quant` strategy decision, order, trade, position, runtime, and PnL payloads
  - skip-only and no-trade diagnostics
  - RabbitMQ Management HTTP payloads used for queue and health metrics
- Rationale: The biggest remaining implementation risk is hidden schema drift across sibling repos. The compatibility matrix makes those assumptions explicit before coding begins.
- Alternatives considered:
  - Keep compatibility notes only in prose inside `plan.md`. Rejected because tasks and contract tests need a dedicated, diffable source of truth.

## Decision: Treat skip-only and no-trade diagnostics as canonical inputs, not absences

- Decision: Normalize explicit skip decisions and no-order diagnostics from strategy sources into first-class `skip` facts with canonical category, optional code, raw reason text, and source-path metadata.
- Rationale: Strategy repos already emit explicit skip reasons such as cooldowns, existing open orders, and regime-gate failures. Inferring skips from missing order events would be lossy and incorrect.
- Alternatives considered:
  - Infer skips from absence of downstream events. Rejected because silence is ambiguous and violates the spec.

## Decision: Model PnL around market-position lifecycles and retain reconciliation against direct strategy snapshots

- Decision: Keep the canonical PnL attribution unit at the market-position lifecycle level and persist both:
  - reconstructed lifecycle PnL from fills, closes, settlements, and fees
  - source-reported strategy snapshot PnL when available
- Decision: Record reconciliation status when direct strategy snapshot PnL disagrees with reconstructed lifecycle PnL beyond tolerance.
- Rationale: Current strategy repos expose direct realized and unrealized snapshots, while execution paths and fills allow independent reconstruction. Both are valuable, and disagreement itself is an operational signal.
- Alternatives considered:
  - Trust strategy snapshot PnL only. Rejected because it hides lifecycle reconstruction errors and prevents cross-source auditability.
  - Trust reconstructed PnL only. Rejected because the dashboard must expose degraded or conflicting upstream state explicitly rather than hiding it.

## Decision: Make configurable alert rules a persisted admin-managed model seeded from defaults

- Decision: Store alert rules in PostgreSQL as `alert_rule_config`, seed defaults from checked-in config files, and allow Admin users to inspect and update thresholds through explicit admin endpoints.
- Rationale: The spec requires configurable alert conditions and deterministic threshold-driven behavior. A persisted model allows runtime changes, audit logging, and environment-specific defaults.
- Alternatives considered:
  - Hard-code thresholds in application config only. Rejected because it would make threshold changes opaque and harder to audit.
  - Admin-only in-memory overrides. Rejected because they would not survive restarts or support promotion workflows.

## Decision: Layer authorization as role bindings plus access policies plus export scope grants

- Decision: Keep `role_binding` as the base role and coarse strategy-scope anchor, then resolve one effective capability result from enabled `access_policy`, `access_policy_rule`, and `export_scope_grant` records. Return that evaluated capability result through the authenticated session contract and reuse it for REST, SSE, export, and admin-surface enforcement.
- Rationale: The spec now requires admin-managed access policy and export-scope policy as first-class features. A boolean export flag on role bindings is not expressive enough for raw payload visibility, debug subscriptions, privileged audit access, or resource-specific export grants.
- Alternatives considered:
  - Role bindings only. Rejected because it cannot express approved export resources or policy-controlled capability differences cleanly.
  - Frontend-only policy gating. Rejected because the constitution requires server-side authorization and contract-backed enforcement.

## Decision: Use versioned write contracts for admin policy and feature-flag mutation

- Decision: Access-policy updates, feature-flag updates, and alert-rule updates will use explicit versioned write contracts with validation errors, conflict responses, and returned audit metadata.
- Rationale: Admin changes are operationally sensitive. Versioned mutations prevent silent overwrites, while validation and audit metadata keep the admin surface deterministic and reviewable.
- Alternatives considered:
  - Blind last-write-wins updates. Rejected because concurrent admin edits could silently clobber state.
  - Read-only feature-flag contracts plus undocumented write behavior. Rejected because the spec now requires round-trip feature-flag administration at the product level.

## Decision: Use role-scoped session auth with explicit capability surfaces and denial-path testing

- Decision: Production assumes internal OIDC or a trusted identity proxy, with the API issuing secure HTTP-only sessions and enforcing `operator`, `developer`, and `admin` roles plus strategy scoping. The REST and SSE contracts will distinguish standard versus debug detail levels so raw payload access remains role-gated.
- Rationale: The browser must remain behind server-side auth, and RBAC differences must be explicit for normal navigation, deep links, exports, and live subscriptions.
- Alternatives considered:
  - Stateless browser-stored JWTs. Rejected because server-managed sessions are a safer default for an internal dashboard.
  - Implicit role handling in the frontend only. Rejected because auth and RBAC must be enforced server-side.

## Decision: Poll RabbitMQ management data and publisher diagnostics for operational truth

- Decision: `apps/ingest` will poll RabbitMQ Management HTTP APIs for queue backlog, consumer, redelivery, and age metrics, and will also ingest publisher and executor diagnostics or health read models when available.
- Rationale: Queue health and reconnect state are not fully represented as business events, and the dashboard must surface both broker truth and application-level reliability signals.
- Alternatives considered:
  - Infer queue health purely from lifecycle events. Rejected because it cannot reliably detect stale consumers or backlog age.
  - Depend only on application diagnostics. Rejected because RabbitMQ Management provides the authoritative queue state needed for independent verification.

## Decision: Build the frontend around React Router, Redux Toolkit, RTK Query, TanStack Table, React Virtual, Radix UI, React Hook Form, and ECharts

- Decision: Use the requested Vite/React/TypeScript stack plus:
  - Redux Toolkit and RTK Query for API cache and invalidation
  - React Router for route-driven page and drawer state
  - TanStack Table and `@tanstack/react-virtual` for large tables
  - Radix UI primitives and a shared `packages/ui` component system
  - React Hook Form with Zod resolvers for admin config and filters
  - ECharts for dense time-series, attribution, and pipeline charts
- Rationale: The dashboard needs accessible primitives, deep-linkable query state, and bounded rendering for large datasets.
- Alternatives considered:
  - MUI or Ant Design. Rejected because the product benefits from a slimmer shared internal component system with stricter control over observability-state UX.
  - Recharts. Rejected because operations and attribution views need denser charting and annotations.

## Decision: Keep route state as the source of truth for filters, compare mode, and deep links

- Decision: Filters, search text, sort, pagination, selected detail states, compare mode, and timezone mode live in URL state. RTK Query consumes parsed route params as cache keys.
- Rationale: The spec requires deep-linkable operator states, drawer restoration, and exports that exactly match the visible query.
- Alternatives considered:
  - Redux-only filter state. Rejected because refresh resilience and deep links would become brittle.

## Decision: Use Testcontainers for automated integration and Docker Compose for local stacks

- Decision: Keep Docker Compose for local dev and operator smoke testing, and use Testcontainers in automated integration suites for PostgreSQL and RabbitMQ.
- Rationale: Local workflows need stable named services, while CI integration tests need isolated, repeatable container lifecycles.
- Alternatives considered:
  - Compose-only tests. Rejected because test isolation and parallel CI runs become harder.
  - Mock-only integration tests. Rejected because replay safety and source-boundary compatibility require real dependencies.

## Decision: Treat deployment readiness as OCI images plus reference Kubernetes manifests and promotion validation

- Decision: Keep `production-ready` in scope and plan for:
  - OCI images for `web`, `api`, and `ingest`
  - local Compose stack
  - reference Kubernetes manifests or overlays for staging and production
  - env-driven runtime configuration with secret mounts
  - liveness and readiness probes
  - promotion and deploy-validation runbooks
- Rationale: Dockerfiles and CI alone do not satisfy deployment readiness for an internal production system.
- Alternatives considered:
  - Narrow the claim to “container build only.” Rejected because the spec explicitly requires production readiness and operations documentation.

## Decision: Keep the source-tree sketch aligned to intended implementation paths

- Decision: The design will treat `apps/api/src/plugins/sse.ts` as the canonical SSE implementation path and `docs/schema/` as the home for generated or maintained schema documentation.
- Rationale: The previous mismatch between the plan tree and intended implementation paths was a design drift issue, not a feature decision. Fixing it here keeps task generation deterministic.
- Alternatives considered:
  - Keep multiple competing tree sketches. Rejected because it would create avoidable implementation ambiguity.

## Explicit Upstream Findings and Assumptions

- Assumption: Only repositories matching `kalshi-${cryptoSymbol}-quant` are treated as strategies in shared strategy views.
- Assumption: `../kalshi-integration-event-publisher` and `../kalshi-integration-executor` are operational dependencies, not strategies.
- Finding: `kalshi-btc-quant` currently bridges order flow through the publisher path and sets `correlation_id` when calling the publisher bridge.
- Finding: `kalshi-eth-quant`, `kalshi-sol-quant`, and `kalshi-xrp-quant` still expose critical facts only through direct strategy APIs and local read models in the current state.
- Finding: Strategy repo `TradeDecision` payloads currently do not expose a stable `decision_id`, so the dashboard must synthesize deterministic adapter identifiers and label them as adapter-derived.
- Finding: The publisher repo and standalone executor repo are compatible enough to normalize together, but they must be treated as versioned source variants instead of assumed identical.
- Finding: Executor dead-letter records and reliability tests already track attempt counts and replay counts, which the dashboard should preserve as first-class canonical metadata.
