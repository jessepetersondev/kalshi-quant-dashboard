<!--
Sync Impact Report
Version change: unversioned template -> 1.0.0
Modified principles:
- Template Principle 1 -> I. Security-First Boundaries & Access Control
- Template Principle 2 -> II. Contract-First Boundaries & Runtime Validation
- Template Principle 3 -> III. Live/Historical Parity
- Template Principle 4 -> IV. Event Integrity, Idempotency & Degradation Signaling
- Template Principle 5 -> V. Observability as a Product Surface
- Added Principle -> VI. Strategy Extensibility Without Frontend Rewrites
- Added Principle -> VII. Performance at Scale
- Added Principle -> VIII. Accessible, Deterministic Trading UX
- Added Principle -> IX. Required Test Coverage for Critical Flows
- Added Principle -> X. Documentation & Operational Readiness
Added sections:
- Engineering Standards
- Delivery Workflow & Quality Gates
Removed sections:
- None
Templates requiring updates:
- ✅ updated: .specify/templates/plan-template.md
- ✅ updated: .specify/templates/spec-template.md
- ✅ updated: .specify/templates/tasks-template.md
- ⚠ pending: .specify/templates/commands/*.md (directory not present in repository)
- ⚠ pending: README.md and docs/quickstart.md (runtime guidance docs not present in repository)
Follow-up TODOs:
- None
-->

# Kalshi Quant Dashboard Constitution

## Core Principles

### I. Security-First Boundaries & Access Control
The browser MUST communicate only with authenticated application APIs and
server-managed streaming endpoints. Browser clients MUST NOT connect directly to
RabbitMQ, Kalshi, PostgreSQL, or any secret-bearing or privileged upstream
service. All secrets MUST remain server-side, every non-public interface MUST
require authentication, and RBAC MUST govern access to strategies, operators,
historical data, and operational controls.

Rationale: privileged integrations and market data controls must remain within
audited server boundaries so credentials, access policy, and incident response
stay enforceable.

### II. Contract-First Boundaries & Runtime Validation
Every HTTP API, streaming event, queue message, and persisted event boundary
MUST be defined in shared TypeScript contracts and validated at runtime at
ingress and egress. Untyped or unvalidated payloads MUST NOT cross process,
network, storage, or UI boundaries. Contract changes MUST include compatibility
handling and a coordinated migration plan before implementation begins.

Rationale: observability systems fail silently when schemas drift; shared types
plus runtime validators prevent data corruption and stale UI assumptions.

### III. Live/Historical Parity
Every live event rendered in the UI MUST be durably queryable from persisted
history using stable identifiers, event timestamps, ingestion timestamps, and
source metadata. Historical queries MUST be able to reproduce the same business
meaning as live views, including the source strategy, market context, and event
classification that produced the original update.

Rationale: operators must be able to investigate, replay, and audit trading
behavior without depending on ephemeral live state.

### IV. Event Integrity, Idempotency & Degradation Signaling
Ingestion pipelines MUST be idempotent, replay-safe, and deduplicated by
canonical identifiers. The system MUST record ordering metadata when available
and MUST preserve explicit degraded, partial, or missing-upstream states instead
of silently dropping or fabricating data. Recovery and replay workflows MUST not
create duplicate business events or hide data gaps.

Rationale: trading observability is only credible when duplicate, delayed, or
missing upstream data is visible and operationally safe to replay.

### V. Observability as a Product Surface
Structured logging, metrics, distributed tracing, health checks, and alertable
failure states are mandatory for every critical path. Each service and worker
MUST expose enough telemetry to identify contract failures, upstream outages,
latency regressions, replay anomalies, and access-control violations without
manual log spelunking.

Rationale: a trading observability system that cannot observe itself cannot be
trusted during incidents.

### VI. Strategy Extensibility Without Frontend Rewrites
BTC, ETH, SOL, and XRP are first-class initial strategies, and new strategies
MUST be addable through backend configuration, shared contracts, and reusable UI
composition rather than bespoke frontend rewrites. Strategy-specific logic MUST
be isolated behind stable interfaces so the dashboard can grow without branching
its core screens by asset.

Rationale: strategy growth is expected; coupling new asset support to frontend
reimplementation slows delivery and creates inconsistent operator experiences.

### VII. Performance at Scale
Large datasets MUST be filtered, aggregated, paginated, and time-bounded on the
server. The browser MUST use incremental fetching and virtualized rendering for
high-volume tables and timelines, and MUST NOT load unbounded history into
memory. Performance budgets for latency and rendering MUST be defined for every
user-facing feature that operates on live or historical event streams.

Rationale: trading telemetry grows without bound; bounded queries and rendering
are required to keep the dashboard responsive and reliable.

### VIII. Accessible, Deterministic Trading UX
Keyboard accessibility, screen-reader support, deterministic loading states,
empty states, error states, and reconnecting states are mandatory. The default
dashboard experience MUST ship with a dark theme appropriate for prolonged
operator use, and degraded or partial data states MUST be visible in both visual
and assistive-technology pathways.

Rationale: operators need predictable interfaces under pressure, including when
network conditions degrade or assistive technologies are in use.

### IX. Required Test Coverage for Critical Flows
Unit, integration, contract, and end-to-end tests are required for every
critical flow. Critical flows include authentication and RBAC, live event
delivery, persisted history queries, ingestion replay and deduplication, and any
workflow that changes operational state or operator decisions. A feature is not
complete until the required test layers are automated and passing.

Rationale: only layered automated tests can catch schema drift, replay bugs,
boundary regressions, and UI/operator failures before production.

### X. Documentation & Operational Readiness
Local setup, environment documentation, schema documentation, runbooks, and
troubleshooting guides are required before work is considered done. Any change
that introduces a new operational dependency, alert, failure mode, or
environment variable MUST update the relevant docs in the same delivery cycle.

Rationale: production readiness depends on operators and future engineers being
able to run, diagnose, and recover the system without tribal knowledge.

## Engineering Standards

- Client-visible data paths MUST terminate in server-controlled APIs or
  server-managed streaming gateways; direct client access to upstream brokers,
  exchanges, or secret-bearing services is prohibited.
- Persisted event records MUST capture canonical event identifiers, source
  identifiers, event timestamps, ingestion timestamps, strategy identifiers,
  processing status, and degraded-data reasons when upstream data is incomplete.
- Shared TypeScript contracts MUST be versioned alongside runtime validators and
  stored where backend, workers, and frontend consume the same source of truth.
- Read models MUST support server-side filtering, aggregation, pagination, and
  time-bounded historical queries. Frontend large-data views MUST use
  virtualization or equivalent bounded rendering techniques.
- All operator-facing screens MUST expose deterministic loading, empty, error,
  reconnecting, and degraded-data states that remain keyboard reachable and
  screen-reader intelligible.

## Delivery Workflow & Quality Gates

1. Every feature spec MUST document auth and RBAC impact, boundary contracts,
   historical persistence and parity, degraded-data behavior, observability,
   performance limits, accessibility states, required tests, and documentation
   or runbook updates.
2. Every implementation plan MUST fail Constitution Check if it lacks server-side
   boundary ownership, shared contracts with runtime validation, live and
   historical parity, replay-safe ingestion, observability coverage, bounded
   data access patterns, accessibility states, or operational documentation.
3. Every task list MUST include work for contract definitions and validators,
   persistence and replay handling, observability instrumentation, accessibility
   and deterministic states, all required test layers, and documentation.
4. Pull requests and release reviews MUST verify compliance with every
   applicable principle. Unresolved violations block merge unless a documented
   exception is approved by the project owner or designated maintainer.

## Governance

This constitution is the highest-priority engineering policy for Kalshi Quant
Dashboard. When another artifact conflicts with it, this constitution takes
precedence until the dependent artifact is brought back into sync.

Amendments require a written description of the change, synchronized updates to
affected templates and operational documents, and approval from the project
owner or designated maintainer.

Versioning policy for this constitution is mandatory:

- MAJOR versions remove or redefine a principle or governance requirement in a
  backward-incompatible way.
- MINOR versions add a principle, add a mandatory section, or materially expand
  an existing requirement.
- PATCH versions clarify wording without changing required behavior.

Compliance review expectations are mandatory:

- Every implementation plan MUST pass Constitution Check before research begins
  and again after design is complete.
- Every pull request MUST state how security boundaries, contracts, parity and
  integrity, observability, extensibility, performance, accessibility, testing,
  and documentation requirements are satisfied.
- Before release, operators MUST confirm that health checks, alerts, and
  runbooks cover any new failure modes introduced by the change.

**Version**: 1.0.0 | **Ratified**: 2026-04-11 | **Last Amended**: 2026-04-11
