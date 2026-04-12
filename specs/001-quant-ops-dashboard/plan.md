# Implementation Plan: Kalshi Quant Dashboard

**Branch**: `001-quant-ops-dashboard` | **Date**: 2026-04-11 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-quant-ops-dashboard/spec.md`

## Summary

Build `kalshi-quant-dashboard` as a production-ready TypeScript monorepo with
three deployable applications: a React operator UI, an authenticated API and
SSE read layer, and a server-side ingest or reconciliation service. The design
preserves mixed-source ingestion for the current upstream reality, keeps live
and historical views convergent through canonical persistence plus durable
projection cursors, and makes admin-managed access policy, export policy, alert
rules, and feature flags explicit contract-backed product surfaces instead of
implicit server behavior.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22 LTS  
**Primary Dependencies**: React, Vite, Redux Toolkit, RTK Query, React Router, Fastify, Zod, Drizzle ORM, PostgreSQL client, RabbitMQ client, Radix UI, React Hook Form, ECharts, Vitest, Playwright, Testcontainers  
**Storage**: PostgreSQL 16 for canonical facts, observations, read models, policy state, audit trails, and analytics snapshots  
**Testing**: Unit, integration, contract, Playwright E2E, and deployment smoke coverage  
**Target Platform**: Linux containers, internal desktop-first browsers, local Docker Compose, and Kubernetes-based staging or production environments  
**Project Type**: Internal web dashboard plus authenticated API plus ingest worker monorepo  
**Authentication/RBAC**: Internal OIDC or trusted identity proxy in production, dev-only seeded sessions locally, explicit `operator`, `developer`, and `admin` roles with `role_binding + access_policy + export_scope` resolving into one contract-backed effective capability result  
**Boundary Contracts**: Shared TypeScript contracts in `packages/contracts` with Zod runtime validation, checked-in OpenAPI for REST, checked-in YAML for SSE, and explicit compatibility or policy artifacts for source schemas and authorization behavior  
**Observability**: Structured logs, metrics, traces, health probes, audit logs, queue and ingest alerts, and explicit degraded-state visibility  
**Performance Goals**: Operator landing state under 2 seconds in seeded environments, server-paged table queries under 500 ms p95 for default pages, resumable live feeds under 3 seconds after reconnect when retained cursor data exists, and bounded rendering for large tables and timelines  
**Constraints**: No direct browser connectivity to RabbitMQ, Kalshi, or other secret-bearing services; replay-safe ingestion; mixed-source strategy compatibility today; centralized convergence later; explicit degraded-state signaling; admin mutations must validate, audit, and avoid partial application  
**Scale/Scope**: Four seeded strategies at launch, future strategy onboarding by configuration, million-event historical retention, tens of concurrent internal operators, developers, and admins, and multiple admin-managed policy objects plus runtime flags

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- PASS: Browser traffic terminates at authenticated REST and SSE boundaries owned by `apps/api`; no direct browser access to RabbitMQ, Kalshi, PostgreSQL, or secret-bearing services.
- PASS: Auth and RBAC coverage is defined for overview, table routes, detail routes, exports, admin surfaces, and live subscriptions, including explicit admin-only access and export policy behavior.
- PASS: HTTP, SSE, queue, management-poll, and persistence boundaries are represented in shared contracts with runtime validation ownership.
- PASS: Live views and historical queries both read from durable canonical facts plus projection-backed read models with stable identifiers, timestamps, and source metadata.
- PASS: Ingestion design retains observation history, canonical deduplication, ordered convergence, replay safety, and degraded or missing-upstream signaling.
- PASS: Structured logging, metrics, tracing, health checks, and alertable failure states are defined for ingest, API, SSE, queue management, policy mutation, and admin controls.
- PASS: Strategy onboarding remains configuration- and contract-driven; BTC, ETH, SOL, and XRP are seeded strategies rather than bespoke code branches.
- PASS: Large datasets remain server-bounded, page-based, and virtualized in the UI.
- PASS: Deterministic loading, empty, error, reconnecting, unauthorized, and degraded states remain part of the operator surface.
- PASS: Unit, integration, contract, E2E, smoke, and documentation work remain required for lifecycle, admin policy, and deployment flows.

## Project Structure

### Documentation (this feature)

```text
specs/001-quant-ops-dashboard/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── live-updates.yaml
│   ├── normalized-events.md
│   ├── rbac-matrix.md
│   ├── rest-api.openapi.yaml
│   ├── session-capabilities.md
│   └── source-compatibility.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/
├── web/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── pages/
│   │   ├── routes/
│   │   └── styles/
│   └── tests/
├── api/
│   ├── src/
│   │   ├── auth/
│   │   ├── plugins/
│   │   │   └── sse.ts
│   │   ├── routes/
│   │   │   └── admin/
│   │   └── services/
│   └── tests/
└── ingest/
    ├── src/
    │   ├── adapters/
    │   ├── alerts/
    │   ├── collectors/
    │   ├── consumers/
    │   ├── jobs/
    │   ├── normalization/
    │   ├── projections/
    │   ├── reconciliation/
    │   └── services/
    └── tests/
packages/
├── auth/
├── config/
├── contracts/
├── db/
├── observability/
├── source-adapters/
├── testing/
└── ui/
docs/
├── environment.md
├── local-development.md
├── release-readiness.md
├── runbooks/
├── schema/
└── troubleshooting.md
infra/
├── compose/
├── docker/
└── kubernetes/
tests/
├── contract/
├── e2e/
├── integration/
├── smoke/
└── unit/
```

**Structure Decision**: Use a `pnpm` workspace monorepo with one browser app,
one authenticated server boundary, and one ingest or reconciliation app. SSE
lives in `apps/api/src/plugins/sse.ts`, not in a separate `streams/` tree.
Schema documentation lives in `docs/schema/`.

## Phase 0 Research Summary

- [research.md](./research.md) records decisions for mixed-source ingestion,
  canonical observation plus fact modeling, ordered convergence, admin-managed
  alert rules, layered authorization, feature-flag mutation semantics, and
  deployment readiness.
- No unresolved technical clarifications remain. The remaining work is
  artifact alignment and task regeneration.

## Phase 1 Design Outputs

- [data-model.md](./data-model.md): canonical entities, policy entities,
  lifecycle read models, admin-control state, and derived views
- [rest-api.openapi.yaml](./contracts/rest-api.openapi.yaml): REST routes for
  historical queries, admin controls, exports, and session capability results
- [live-updates.yaml](./contracts/live-updates.yaml): SSE transport contract,
  reconnect and resync semantics, and role or policy-based stream filtering
- [normalized-events.md](./contracts/normalized-events.md): canonical fact and
  observation model for mixed-source ingest
- [source-compatibility.md](./contracts/source-compatibility.md): upstream
  source-boundary compatibility matrix
- [rbac-matrix.md](./contracts/rbac-matrix.md): role and surface matrix for
  operator, developer, and admin behavior
- [session-capabilities.md](./contracts/session-capabilities.md): effective
  capability resolution inputs, outputs, and enforcement rules
- [quickstart.md](./quickstart.md): local startup plus validation scenarios

## Route Map and State Management

### Route Map

- `/overview`
- `/strategies`
- `/strategies/:strategyId`
- `/decisions`
- `/decisions/:correlationId`
- `/trades`
- `/trades/:correlationId`
- `/skips`
- `/pnl`
- `/operations`
- `/alerts`
- `/alerts/:alertId`
- `/system-health`
- `/admin/access-policies`
- `/admin/alert-rules`
- `/admin/feature-flags`
- `/admin/audit-logs`

### State Management

- URL state remains the source of truth for filters, search text, compare mode,
  page, sort, time range, timezone mode, and selected drawer or detail state.
- `/api/auth/session` returns the effective capability result used to gate
  visible routes, action controls, export buttons, raw payload panels, debug
  subscriptions, and admin pages.
- RTK Query keys are derived from route state plus the effective capability
  shape so stale admin or scope changes invalidate appropriately.
- Admin pages use form state for draft edits, but accepted mutations always
  round-trip through server validation and return audit metadata plus the next
  version.

### Drawer and Detail Behavior

- Decisions, trades, and alerts open as drawers from list surfaces.
- Dedicated detail pages use the same read models and route contracts as drawers
  for deep links and reloaded sessions.
- Admin config pages are full-page only and do not use drawers for primary edit
  workflows.

## Ingestion, Reconciliation, and Parity Design

- `apps/ingest` owns RabbitMQ consumer adapters, HTTP collectors, policy-aware
  projection writers, alert evaluation, and reconciliation jobs.
- `event_observation` captures every observed delivery, replay, backfill, or
  redelivery with broker and ordering metadata.
- `canonical_event` captures the deduplicated business fact used for historical
  queries, exports, alerts, and detail timelines.
- `projection_change` is the durable live-stream cursor; API and SSE read from
  the same projection-backed views to guarantee live-to-history convergence.
- Mixed-source strategy support remains first-class:
  - publisher and executor paths ingest RabbitMQ envelopes and management data
  - direct strategy collectors ingest decisions, skips, positions, runtime
    health, and PnL snapshots where centralized flow is incomplete
- Reconciliation jobs explicitly detect:
  - missing terminal events
  - alias conflicts
  - history versus stream mismatch after reconnect
  - PnL disagreement between strategy snapshots and reconstructed lifecycle

## Auth, Policy, and Admin Control Design

### Authorization Inputs

- `role_binding` remains the base role and coarse strategy-scope anchor.
- `access_policy` and `access_policy_rule` add or deny strategy scope,
  debug-level access, raw payload access, privileged audit visibility, and
  admin-surface rights.
- `export_scope_grant` is the source of truth for `allowedExportResources`,
  including resource name, strategy scope, and column profile.
- `effective_capability_result` is the resolved contract payload returned by
  `/api/auth/session` and used again at every route, export, and SSE check.

### Capability Resolution

1. Resolve active `role_binding` rows for the authenticated principal.
2. Select the effective base role and coarse strategy scope.
3. Load enabled matching `access_policy` objects by subject and precedence.
4. Apply deny rules before allow rules within the same precedence level, while
   never granting a surface above the maximum implied by the resolved role.
5. Intersect export grants and strategy scope into one `allowedExportResources`
   result set.
6. Emit a versioned `effective_capability_result` that includes:
   - role
   - strategy scope
   - `detailLevelMax`
   - raw payload visibility
   - privileged audit visibility
   - admin-control rights
   - `allowedExportResources`
   - resolution version metadata

### Admin Surfaces

- `/admin/access-policies`
  - list current policies
  - inspect one policy and its rules or export grants
  - create new policies
  - update existing policies with optimistic concurrency
  - view audit history for policy mutations
- `/admin/feature-flags`
  - list current flags with scope and current version
  - update flag state with validation and version checks
  - surface mutation validation errors inline
  - show audit trail references
- `/admin/alert-rules`
  - list and update persisted alert rules
- `/admin/audit-logs`
  - privileged audit visibility controlled by effective capability result, not
    by raw role alone

### Mutation and Audit Behavior

- All admin mutations are validated before persistence.
- Invalid payloads return explicit validation errors and no partial change.
- Version mismatches return conflicts with current version information.
- Accepted mutations always create immutable audit-log entries describing actor,
  target, before-state, after-state, and mutation result.
- Rejected admin mutations also create audit-log entries with failure reason.

## API and Contract Design

### Session and Capability Contracts

- `GET /api/auth/session`
  - returns user identity plus `effectiveCapability`
  - `effectiveCapability.allowedExportResources` is the shared source of truth
    for export UI and backend export enforcement
  - `effectiveCapability.detailLevelMax` governs SSE debug subscriptions and raw
    payload visibility

### Admin Policy Contracts

- `GET /api/admin/access-policies`
  - list policies with rule summaries and export grants
- `POST /api/admin/access-policies`
  - create a policy with rules and export grants
  - returns created policy plus mutation audit metadata
- `GET /api/admin/access-policies/{accessPolicyId}`
  - fetch full policy detail for the admin editor
- `PATCH /api/admin/access-policies/{accessPolicyId}`
  - update policy metadata, rules, or export grants
  - requires version for optimistic concurrency
  - returns updated policy plus mutation audit metadata
  - may return `403`, `404`, `409`, or `422`

### Feature-Flag Contracts

- `GET /api/admin/feature-flags`
  - list flags, scope, and version
- `PATCH /api/admin/feature-flags/{featureFlagKey}`
  - update runtime flag state with version check
  - returns updated flag plus mutation audit metadata
  - may return `403`, `404`, `409`, or `422`

### Enforcement Expectations

- Export endpoints validate the requested resource against
  `effectiveCapability.allowedExportResources`.
- Raw payload panels and debug metadata are omitted when effective capability
  denies those surfaces.
- SSE subscriptions validate requested detail level and strategy filters against
  the same capability result used by REST.
- Privileged audit routes require effective capability permission even for users
  who already have an admin role.

## Verification Strategy

### Contract Validation

- Session contract returns one effective capability shape for both frontend and
  backend authorization.
- Access policy create or update routes validate rules, export grants, version,
  and error payloads.
- Feature-flag update routes validate version, payload shape, denial responses,
  and returned audit metadata.
- Export resource enforcement is contract-tested against allowed and denied
  resource combinations.

### Integration Validation

- Effective capability resolution varies correctly by:
  - role binding
  - access policy rule
  - export scope grant
  - strategy scope intersection
- Unauthorized export resources return `403` without partial privileged output.
- Raw payload access differs correctly by effective capability, not just by raw
  role.
- SSE rejects or filters subscriptions when requested debug detail or strategy
  scope exceeds policy.
- Every accepted or rejected admin mutation creates an audit-log record.

### End-to-End Validation

- Operators cannot open raw payload panels, privileged audit routes, access
  policy pages, or debug SSE.
- Developers can inspect authorized raw payloads and debug detail but cannot
  mutate access policies or feature flags unless granted by policy.
- Admins can create or update access policies and feature flags, observe
  validation errors for invalid payloads, and confirm audit trail creation.
- Policy changes affect subsequent exports, live subscriptions, and deep-link
  access consistently.

## Deployment and Operations Design

- Runtime configuration remains env-driven with secrets mounted only into `api`
  and `ingest`.
- Health probes:
  - `api`: liveness, readiness, session dependency checks, SSE readiness
  - `ingest`: liveness, queue or collector connectivity readiness
  - `web`: static asset or reverse-proxy health
- Kubernetes manifests remain part of the design baseline, including configmaps,
  secret examples, deployment probes, and staging or production overlays.
- Release validation includes smoke coverage for:
  - `/overview`
  - `/alerts/:alertId`
  - `/admin/access-policies`
  - `/admin/feature-flags`
  - `/api/auth/session`
  - SSE connect and resume

## Implementation Phases

1. Repository foundation, auth shell, contract scaffolding, database schema,
   local dev stack, source compatibility matrix, and base capability evaluation
2. Live decisions or trades feeds, overview page, strategy drill-down, and
   mixed-source ingestion foundations
3. Historical lifecycle tracing, convergence jobs, PnL analytics, skip-only
   diagnostics, and export parity
4. Pipeline operations, alerts, alert detail, access-policy admin, alert-rule
   admin, feature-flag admin, and privileged audit surfaces
5. Hardening: performance, accessibility, denial-path testing, deployment
   assets, release validation, docs, and reconciliation stress coverage

## Post-Design Constitution Check

- PASS: Security boundaries remain server-side, with browser access limited to
  authenticated REST and SSE surfaces.
- PASS: Contract-first design now covers session capability resolution, access
  policy mutation, export grants, feature-flag mutation, and existing lifecycle
  boundaries.
- PASS: Live or historical parity remains anchored in durable canonical facts
  and projection cursors.
- PASS: Event integrity and ordered convergence remain explicit under
  redelivery, replay, backfill, and resync.
- PASS: Observability includes admin mutation audit trails in addition to
  ingest, broker, and lifecycle telemetry.
- PASS: Extensibility remains configuration-driven for strategies and admin
  policy objects.
- PASS: Performance, accessibility, testing, and documentation gates remain in
  scope and unchanged by the admin-control additions.

## Complexity Tracking

No constitution exceptions are required for this design revision.
