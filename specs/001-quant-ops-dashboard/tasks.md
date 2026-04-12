# Tasks: Kalshi Quant Dashboard

**Input**: Design documents from `/specs/001-quant-ops-dashboard/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Unit, integration, contract, and end-to-end tests are REQUIRED for all critical flows. The remaining partial analyze areas for `FR-002c`, `FR-002e`, and `FR-002f` each have explicit build coverage and explicit verification coverage below.

**Organization**: Tasks are grouped by setup, foundational work, and then by user story so each story can be implemented and validated independently.

## Remediation Log

- [X] 2026-04-12 Reopened and re-closed drift-affected tasks `T039`, `T053`, `T054`, `T058`, `T063`, `T066`, `T078`, `T080`, `T092`, `T096`, `T122`, and `T125` after aligning the shipped export surface with the current spec, extending operator export scope for `skips`, `alerts`, and `pnl`, refreshing export docs and release artifacts, restoring historical identifier search parity for decisions and trades when no explicit range is supplied, stabilizing lifecycle row identity during live refetches, refreshing e2e lifecycle scenario timestamps into the active default range, and re-running the full validation stack. Verify with `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:contract`, `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55434/kalshi_quant_dashboard pnpm test:integration`, `pnpm test:e2e`, and `pnpm build`.
- [X] 2026-04-12 Reopened and re-closed drift-affected tasks `T032`, `T050`, `T080`, `T084`, and `T103` after aligning `live-updates.yaml` refs with OpenAPI and runtime, wiring requested `strategy` and `compare` SSE filters end to end, strengthening YAML `$ref` validation, and cleaning the stale feature-flag plan wording. Verify with `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:contract`, `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55434/kalshi_quant_dashboard pnpm test:integration`, `pnpm test:e2e`, and `pnpm build`.
- [X] 2026-04-11 Reopened and re-closed drift-affected tasks `T032`, `T053`, `T055`, `T058`, `T059`, `T060`, `T063`, `T066`, `T070`, `T074`, `T084`, `T099`, `T103`, `T109`, and `T111` after aligning export contracts, SSE YAML/runtime/client payloads, live skip SSE convergence, executor consumer runtime wiring, and feature-flag OpenAPI/runtime schemas. Verify with `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:contract`, `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55434/kalshi_quant_dashboard pnpm test:integration`, `pnpm test:e2e`, and `pnpm build`.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the monorepo, workspace tooling, base app shells, documentation tree, and local development stack.

- [X] T001 Create workspace manifests in `package.json`, `pnpm-workspace.yaml`, `turbo.json`, and `tsconfig.base.json` (depends on none; verify `pnpm install --ignore-scripts` resolves all workspaces)
- [X] T002 [P] Configure repository tooling in `.gitignore`, `.editorconfig`, `eslint.config.js`, `prettier.config.cjs`, `.npmrc`, and `commitlint.config.cjs` (depends on T001; verify `pnpm exec eslint --version` and `pnpm exec prettier --version` succeed)
- [X] T003 [P] Create app package manifests and tsconfigs in `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/ingest/package.json`, and `apps/ingest/tsconfig.json` (depends on T001; verify `pnpm -r exec tsc --showConfig` succeeds for each app)
- [X] T004 [P] Create shared package manifests and tsconfigs in `packages/auth/package.json`, `packages/config/package.json`, `packages/contracts/package.json`, `packages/db/package.json`, `packages/observability/package.json`, `packages/source-adapters/package.json`, `packages/testing/package.json`, `packages/ui/package.json`, and matching `tsconfig.json` files (depends on T001; verify `pnpm -r exec tsc --showConfig` succeeds for each package)
- [X] T005 [P] Create documentation scaffolding in `docs/environment.md`, `docs/local-development.md`, `docs/runbooks/.gitkeep`, `docs/schema/.gitkeep`, `docs/troubleshooting.md`, and `docs/release-readiness.md` (depends on T001; verify `find docs -maxdepth 2 -type f | sort` lists the new files)
- [X] T006 Create local infrastructure scaffolding in `infra/compose/local.yml`, `.env.example`, and `drizzle.config.ts` (depends on T001; verify `docker compose -f infra/compose/local.yml config` succeeds)
- [X] T007 [P] Scaffold the React entry shell in `apps/web/index.html`, `apps/web/src/main.tsx`, `apps/web/src/app/router.tsx`, and `apps/web/src/app/store.ts` (depends on T003; verify `pnpm --filter web build` reaches Vite config resolution)
- [X] T008 [P] Scaffold the Fastify and ingest entrypoints in `apps/api/src/main.ts`, `apps/api/src/app.ts`, `apps/ingest/src/main.ts`, and `apps/ingest/src/app.ts` (depends on T003; verify `pnpm -r exec tsc --noEmit` compiles the entrypoints)
- [X] T009 [P] Create base package exports in `packages/auth/src/index.ts`, `packages/config/src/index.ts`, `packages/contracts/src/index.ts`, `packages/db/src/index.ts`, `packages/observability/src/index.ts`, `packages/source-adapters/src/index.ts`, `packages/testing/src/index.ts`, and `packages/ui/src/index.ts` (depends on T004; verify `pnpm -r exec tsc --noEmit` compiles the package stubs)
- [X] T010 Create shared test harness and root task aliases in `vitest.workspace.ts`, `playwright.config.ts`, `tests/contract/.gitkeep`, `tests/integration/.gitkeep`, `tests/e2e/.gitkeep`, `tests/smoke/.gitkeep`, `scripts/dev.ts`, and `scripts/test.ts` (depends on T001, T002, T003, T004; verify `pnpm run` lists lint, typecheck, test, test:integration, test:contract, test:e2e, and build)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Deliver the shared contracts, database schema, generic adapter framework, capability resolution foundation, ordered-convergence engine, and baseline observability used by every story.

**⚠️ CRITICAL**: No user story work should start until this phase is complete.

- [X] T011 [P] Implement runtime env and secret-boundary schemas in `packages/config/src/env.ts`, `packages/config/src/runtime-config.ts`, and `packages/config/src/secrets.ts` (depends on T004, T006, T009; verify `pnpm -r exec tsc --noEmit` compiles the config package)
- [X] T012 [P] Implement logging, metrics, and tracing bootstrap in `packages/observability/src/logging.ts`, `packages/observability/src/metrics.ts`, `packages/observability/src/tracing.ts`, and `packages/observability/src/index.ts` (depends on T004, T009; verify `pnpm -r exec tsc --noEmit` compiles the observability package)
- [X] T013 [P] Implement base role, scope, and capability primitives in `packages/auth/src/roles.ts`, `packages/auth/src/scope.ts`, `packages/auth/src/capabilities.ts`, `packages/auth/src/export-scope.ts`, and `packages/auth/src/session.ts` (depends on T004, T009; verify with T038 and `pnpm -r exec tsc --noEmit`)
- [X] T014 [P] Implement session, effective-capability, and RBAC shared contracts in `packages/contracts/src/auth/session.ts`, `packages/contracts/src/auth/effective-capabilities.ts`, `packages/contracts/src/auth/rbac.ts`, and `packages/contracts/src/rest/common.ts` (depends on T004, T009, T013; verify with T035 and T038)
- [X] T015 [P] Implement normalized event and observation schemas with ordering or replay metadata in `packages/contracts/src/normalized-events.ts` and `packages/contracts/src/normalized-observations.ts` (depends on T004, T009; verify with T034 and T036)
- [X] T016 [P] Implement publisher source-boundary schemas in `packages/contracts/src/source/publisher.ts` and `packages/contracts/src/source/publisher-results.ts` (depends on T004, T009; verify with T034)
- [X] T017 [P] Implement executor source-boundary schemas in `packages/contracts/src/source/executor.ts` and `packages/contracts/src/source/executor-dead-letter.ts` (depends on T004, T009; verify with T034)
- [X] T018 [P] Implement strategy runtime and skip-only source-boundary schemas in `packages/contracts/src/source/quant-runtime.ts` and `packages/contracts/src/source/skip-diagnostics.ts` (depends on T004, T009; verify with T034 and T071)
- [X] T019 [P] Implement RabbitMQ management source-boundary schemas in `packages/contracts/src/source/rabbitmq-management.ts` (depends on T004, T009; verify with T034)
- [X] T020 [P] Implement admin access-policy and feature-flag shared contracts in `packages/contracts/src/rest/admin/access-policies.ts`, `packages/contracts/src/rest/admin/feature-flags.ts`, and `packages/contracts/src/live/subscriptions.ts` (depends on T004, T009, T014; verify with T035, T099, and T103)
- [X] T021 [P] Implement the source compatibility registry and field-mapping matrix in `packages/source-adapters/src/compatibility/source-profiles.ts`, `packages/source-adapters/src/compatibility/field-mappings.ts`, and `docs/schema/source-compatibility.md` (depends on T015, T016, T017, T018, T019; verify with T034 and T037)
- [X] T022 [P] Implement user, role-binding, strategy, source-binding, and endpoint schema files in `packages/db/src/schema/auth.ts`, `packages/db/src/schema/strategies.ts`, and `packages/db/src/schema/source-bindings.ts` (depends on T004, T009; verify with T028 and T037)
- [X] T023 [P] Implement access-policy, policy-rule, export-scope, effective-capability, and feature-flag schema files in `packages/db/src/schema/access-policies.ts`, `packages/db/src/schema/effective-capabilities.ts`, and `packages/db/src/schema/feature-flags.ts` (depends on T004, T009, T013, T014, T020; verify with T028, T038, and T099)
- [X] T024 [P] Implement canonical-event, event-observation, identifier-alias, and projection-change schema files in `packages/db/src/schema/canonical-events.ts`, `packages/db/src/schema/event-observations.ts`, `packages/db/src/schema/identifiers.ts`, and `packages/db/src/schema/projection-changes.ts` (depends on T004, T009, T015; verify with T028 and T036)
- [X] T025 [P] Implement lifecycle and reconciliation schema files in `packages/db/src/schema/decisions.ts`, `packages/db/src/schema/trades.ts`, `packages/db/src/schema/fills.ts`, and `packages/db/src/schema/gaps.ts` (depends on T004, T009, T015; verify with T028 and T036)
- [X] T026 [P] Implement alert-rule, alert, audit-log, heartbeat, and operations schema files in `packages/db/src/schema/alert-rules.ts`, `packages/db/src/schema/alerts.ts`, `packages/db/src/schema/audit.ts`, `packages/db/src/schema/heartbeats.ts`, and `packages/db/src/schema/operations.ts` (depends on T004, T009, T015; verify with T028 and T086)
- [X] T027 [P] Implement position and PnL schema files in `packages/db/src/schema/positions.ts` and `packages/db/src/schema/pnl.ts` (depends on T004, T009, T015; verify with T028 and T069)
- [X] T028 Implement the initial migrations and database client in `packages/db/src/client.ts`, `packages/db/src/migrate.ts`, `packages/db/src/migrations.ts`, and `packages/db/migrations/0001_initial.sql` (depends on T022, T023, T024, T025, T026, T027; verify `pnpm db:migrate` applies cleanly to local Postgres)
- [X] T029 [P] Implement the generic adapter framework and strategy registry loader in `packages/source-adapters/src/base/source-adapter.ts`, `packages/source-adapters/src/base/adapter-registry.ts`, `packages/source-adapters/src/base/strategy-registry.ts`, and `packages/source-adapters/src/base/source-binding-resolver.ts` (depends on T021, T022, T028; verify with T037 and `pnpm -r exec tsc --noEmit`)
- [X] T030 [P] Implement reusable RabbitMQ and HTTP collector abstractions in `apps/ingest/src/consumers/rabbitmq-consumer.ts`, `apps/ingest/src/collectors/http-poller.ts`, and `apps/ingest/src/collectors/collector-runner.ts` (depends on T008, T011, T012, T029; verify with T037 and T085)
- [X] T031 Implement normalization, deduplication, checkpoint, and convergence services in `apps/ingest/src/normalization/normalize-observation.ts`, `apps/ingest/src/services/dedup-service.ts`, `apps/ingest/src/services/checkpoint-service.ts`, and `apps/ingest/src/reconciliation/convergence-service.ts` (depends on T015, T024, T025, T029, T030; verify with T036, T054, and T055)
- [X] T032 Implement auth, security, health, and SSE foundations in `apps/api/src/plugins/auth.ts`, `apps/api/src/plugins/security.ts`, `apps/api/src/plugins/health.ts`, `apps/api/src/plugins/sse.ts`, `apps/api/src/routes/auth.ts`, and `apps/api/src/routes/health.ts` (depends on T008, T011, T012, T014, T028; verify with T038, T099, and T103)
- [X] T033 Implement API session-context, capability-cache, and route-capability foundations in `apps/api/src/auth/session-context.ts`, `apps/api/src/auth/capability-cache.ts`, `apps/api/src/plugins/route-capabilities.ts`, and `apps/api/src/services/denial-audit-service.ts` (depends on T013, T014, T023, T028, T032; verify with T038 and T100)
- [X] T034 [P] Write source-boundary and compatibility-matrix contract tests in `tests/contract/foundational/source-boundaries.contract.test.ts` and `tests/contract/foundational/source-compatibility.contract.test.ts` (depends on T015, T016, T017, T018, T019, T021; verify the suites fail before implementation and pass after `pnpm test:contract`)
- [X] T035 [P] Write contract tests for session capability, allowed export resources, and admin mutation schemas in `tests/contract/foundational/session-capabilities.contract.test.ts` and `tests/contract/foundational/admin-mutations.contract.test.ts` (depends on T014, T020, T023, T032; verify the suites fail before implementation and pass after `pnpm test:contract`)
- [X] T036 [P] Write unit tests for ordering, redelivery, replay, and ordered convergence semantics in `tests/unit/foundational/dedup-ordering.test.ts` and `tests/unit/foundational/convergence-service.test.ts` (depends on T015, T024; verify the suites fail before T031 and pass after `pnpm test`)
- [X] T037 [P] Write integration tests for strategy registry boot, generic adapter loading, and mixed-source binding compatibility in `tests/integration/foundational/strategy-registry.test.ts` and `tests/integration/foundational/source-bindings.test.ts` (depends on T021, T022, T029, T030; verify the suites fail before implementation and pass after `pnpm test:integration`)
- [X] T038 [P] Write integration tests for session capability resolution, `allowedExportResources`, health probes, and baseline SSE filtering in `tests/integration/foundational/auth-health.test.ts` and `tests/integration/foundational/rbac-capabilities.test.ts` (depends on T013, T014, T023, T032, T033; verify the suites fail before implementation and pass after `pnpm test:integration`)
- [X] T039 Seed users, BTC, ETH, SOL, and XRP strategy configs, source bindings, access policies, export grants, feature flags, alert-rule defaults, and representative fixtures in `packages/db/src/seed/users.ts`, `packages/db/src/seed/strategies.ts`, `packages/db/src/seed/source-bindings.ts`, `packages/db/src/seed/access-policies.ts`, `packages/db/src/seed/feature-flags.ts`, `packages/db/src/seed/alert-rules.ts`, and `packages/db/src/seed/fixtures/**/*.json` (depends on T022, T023, T026, T027, T028, T029; verify `pnpm db:seed` loads the four initial strategies without asset-specific code branches)

**Checkpoint**: Foundation ready. User story work can proceed.

---

## Phase 3: User Story 1 - Monitor Live Portfolio and Strategy Health (Priority: P1) 🎯 MVP

**Goal**: Deliver the authenticated landing experience with overview and strategy pages that show live decisions, live trades, strategy health, queue health summary, aggregate PnL, and recent alerts.

**Independent Test**: Sign in as an operator, land on `/overview`, verify the initial viewport shows global health, aggregate PnL, live decision and trade feeds, queue health, and recent alerts, then open a strategy detail page and confirm its health, source-path mode, recent activity, and PnL trend are visible without using other pages.

### Tests for User Story 1

- [X] T040 [P] [US1] Write unit tests for overview aggregation, strategy cards, and source-path badges in `tests/unit/overview/overview-selectors.test.ts` and `tests/unit/overview/strategy-source-badge.test.ts` (depends on T031, T039; verify the suites fail before implementation and pass after `pnpm test`)
- [X] T041 [P] [US1] Write contract tests for overview, strategies, and standard live stream payloads in `tests/contract/overview/overview-and-strategies.contract.test.ts` and `tests/contract/overview/live-overview.contract.test.ts` (depends on T014, T015, T032, T039; verify the suites fail before implementation and pass after `pnpm test:contract`)
- [X] T042 [P] [US1] Write integration tests for mixed-source overview projection, strategy detail, and config-driven onboarding visibility in `tests/integration/overview/overview-api.test.ts` and `tests/integration/overview/strategy-onboarding.test.ts` (depends on T031, T032, T039; verify the suites fail before implementation and pass after `pnpm test:integration`)
- [X] T043 [P] [US1] Write Playwright coverage for overview landing, strategy drill-down, and paused live-feed UX in `tests/e2e/overview/landing-and-strategy.spec.ts` and `tests/e2e/overview/live-feed-controls.spec.ts` (depends on T032, T039; verify the specs fail before implementation and pass after `pnpm test:e2e`)

### Implementation for User Story 1

- [X] T044 [P] [US1] Implement overview and strategy contracts in `packages/contracts/src/rest/overview.ts`, `packages/contracts/src/rest/strategies.ts`, and `packages/contracts/src/live/overview.ts` (depends on T040, T041; verify with T041 and T042)
- [X] T045 [P] [US1] Implement overview, strategy-summary, and live-feed projectors in `apps/ingest/src/projections/overview-projector.ts`, `apps/ingest/src/projections/strategy-summary-projector.ts`, `apps/ingest/src/projections/live-decision-feed-projector.ts`, and `apps/ingest/src/projections/live-trade-feed-projector.ts` (depends on T042, T044; verify with T042 and T043)
- [X] T046 [US1] Implement overview and strategy services plus routes in `apps/api/src/services/overview-service.ts`, `apps/api/src/services/strategy-service.ts`, `apps/api/src/routes/overview.ts`, and `apps/api/src/routes/strategies.ts` (depends on T041, T042, T045; verify with T041 and T042)
- [X] T047 [P] [US1] Build the overview page and widgets in `apps/web/src/pages/OverviewPage.tsx`, `apps/web/src/components/overview/GlobalHealthCard.tsx`, `apps/web/src/components/overview/AggregatePnlCard.tsx`, `apps/web/src/components/overview/LiveDecisionFeed.tsx`, and `apps/web/src/components/overview/LiveTradeFeed.tsx` (depends on T043, T044, T046; verify with T043)
- [X] T048 [P] [US1] Build the strategies list and strategy detail pages in `apps/web/src/pages/StrategiesPage.tsx`, `apps/web/src/pages/StrategyDetailPage.tsx`, `apps/web/src/components/strategies/StrategyList.tsx`, and `apps/web/src/components/strategies/StrategyDetailHeader.tsx` (depends on T043, T044, T046; verify with T042 and T043)
- [X] T049 [P] [US1] Wire overview and strategy RTK Query endpoints plus route state in `apps/web/src/features/overview/overviewApi.ts`, `apps/web/src/features/strategies/strategiesApi.ts`, and `apps/web/src/features/router/queryState.ts` (depends on T046, T047, T048; verify with T041 and T043)
- [X] T050 [US1] Implement the standard SSE client, pause buffer, and freshness banners in `apps/web/src/features/live/streamClient.ts`, `apps/web/src/features/live/pauseBuffer.ts`, `apps/web/src/components/live/FeedControls.tsx`, and `apps/web/src/components/live/FreshnessBanner.tsx` (depends on T032, T044, T047, T049; verify with T043)
- [X] T051 [US1] Implement loading, empty, error, degraded, and unauthorized states for overview or strategy surfaces in `apps/web/src/components/state/LoadingState.tsx`, `apps/web/src/components/state/EmptyState.tsx`, `apps/web/src/components/state/ErrorState.tsx`, `apps/web/src/components/state/UnauthorizedState.tsx`, and `apps/web/src/components/state/DegradedStatePanel.tsx` (depends on T047, T048, T049, T050; verify with T043)

**Checkpoint**: User Story 1 should be independently testable and production-shaped.

---

## Phase 4: User Story 2 - Trace Decisions and Trades End-to-End (Priority: P2)

**Goal**: Deliver searchable decisions and trades with full timelines, ordering or replay metadata, raw-payload inspection, deep links, detail drawers, export, and convergent live-to-history behavior.

**Independent Test**: Search by correlation ID, decision ID, order ID, client order ID, Kalshi order ID, routing key, ticker, or symbol; open a decision or trade; confirm the timeline, aliases, raw-payload visibility, and historical parity remain correct after replay, reconnect, or resync.

### Tests for User Story 2

- [X] T052 [P] [US2] Write unit tests for timeline ordering, identifier-alias search, and raw-payload gating selectors in `tests/unit/lifecycle/timeline-ordering.test.ts` and `tests/unit/lifecycle/identifier-alias-search.test.ts` (depends on T031, T033, T039; verify the suites fail before implementation and pass after `pnpm test`)
- [X] T053 [P] [US2] Write contract tests for decisions, trades, detail visibility, export parity, and live detail payloads in `tests/contract/lifecycle/decision-trade.contract.test.ts` and `tests/contract/lifecycle/export.contract.test.ts` (depends on T014, T015, T020, T032, T039; verify the suites fail before implementation and pass after `pnpm test:contract`)
- [X] T054 [P] [US2] Write integration tests for lifecycle convergence in the normal flow and deep-link parity in `tests/integration/lifecycle/convergence-normal.test.ts` and `tests/integration/lifecycle/deep-link-parity.test.ts` (depends on T031, T032, T039; verify the suites fail before implementation and pass after `pnpm test:integration`)
- [X] T055 [P] [US2] Write integration tests for replay, reconnect, resync, and ordered catch-up in `tests/integration/lifecycle/convergence-replay-resync.test.ts` and `tests/integration/lifecycle/stream-reconnect-ordering.test.ts` (depends on T031, T032, T039; verify the suites fail before implementation and pass after `pnpm test:integration`)
- [X] T056 [P] [US2] Write integration tests for operator versus developer raw-payload and export authorization in `tests/integration/auth/lifecycle-authorization.test.ts` (depends on T033, T038, T039; verify the suite fails before implementation and passes after `pnpm test:integration`)
- [X] T057 [P] [US2] Write Playwright coverage for lifecycle search, trace, deep links, and resync behavior in `tests/e2e/lifecycle/search-trace-resync.spec.ts` and `tests/e2e/lifecycle/detail-route-parity.spec.ts` (depends on T032, T039; verify the specs fail before implementation and pass after `pnpm test:e2e`)

### Implementation for User Story 2

- [X] T058 [P] [US2] Implement decision, trade, detail, export, and live contracts in `packages/contracts/src/rest/decisions.ts`, `packages/contracts/src/rest/trades.ts`, `packages/contracts/src/rest/details.ts`, `packages/contracts/src/rest/exports.ts`, `packages/contracts/src/live/decisions.ts`, and `packages/contracts/src/live/trades.ts` (depends on T052, T053; verify with T053, T054, and T055)
- [X] T059 [P] [US2] Implement publisher and executor consumers in `apps/ingest/src/adapters/rabbitmq/publisher-consumer.ts`, `apps/ingest/src/adapters/rabbitmq/executor-consumer.ts`, and `apps/ingest/src/consumers/consumer-supervisor.ts` (depends on T016, T017, T030, T039, T058; verify with T054 and T055)
- [X] T060 [P] [US2] Implement publisher and executor normalizers in `apps/ingest/src/normalization/publisher-normalizer.ts`, `apps/ingest/src/normalization/executor-normalizer.ts`, and `apps/ingest/src/normalization/lifecycle-alias-builder.ts` (depends on T015, T016, T017, T031, T058, T059; verify with T054 and T055)
- [X] T061 [P] [US2] Implement lifecycle, alias, and terminal-state projectors in `apps/ingest/src/projections/decision-lifecycle-projector.ts`, `apps/ingest/src/projections/trade-attempt-projector.ts`, `apps/ingest/src/projections/fill-fact-projector.ts`, and `apps/ingest/src/projections/identifier-alias-projector.ts` (depends on T024, T025, T031, T058, T060; verify with T054 and T055)
- [X] T062 [US2] Implement terminal-gap, stream-resync, and history-convergence jobs in `apps/ingest/src/reconciliation/terminal-gap-job.ts`, `apps/ingest/src/reconciliation/stream-resync-job.ts`, and `apps/ingest/src/reconciliation/history-convergence-checker.ts` (depends on T031, T059, T060, T061; verify with T054 and T055)
- [X] T063 [US2] Implement decision, trade, detail, and export services plus routes in `apps/api/src/services/decision-service.ts`, `apps/api/src/services/trade-service.ts`, `apps/api/src/services/detail-service.ts`, `apps/api/src/services/export-service.ts`, `apps/api/src/routes/decisions.ts`, `apps/api/src/routes/trades.ts`, and `apps/api/src/routes/exports.ts` (depends on T053, T056, T058, T061, T062; verify with T053, T054, and T056)
- [X] T064 [P] [US2] Build the decisions and trades pages in `apps/web/src/pages/DecisionsPage.tsx`, `apps/web/src/pages/TradesPage.tsx`, `apps/web/src/components/lifecycle/DecisionTable.tsx`, `apps/web/src/components/lifecycle/TradeTable.tsx`, and `apps/web/src/components/lifecycle/SearchBar.tsx` (depends on T057, T058, T063; verify with T057)
- [X] T065 [P] [US2] Build the decision or trade drawers and detail pages in `apps/web/src/components/lifecycle/DecisionDrawer.tsx`, `apps/web/src/components/lifecycle/TradeDrawer.tsx`, `apps/web/src/pages/DecisionDetailPage.tsx`, `apps/web/src/pages/TradeDetailPage.tsx`, and `apps/web/src/components/lifecycle/RawPayloadPanel.tsx` (depends on T057, T058, T063; verify with T056 and T057)
- [X] T066 [US2] Wire decisions or trades RTK Query endpoints, deep-link query state, and CSV export parity in `apps/web/src/features/decisions/decisionsApi.ts`, `apps/web/src/features/trades/tradesApi.ts`, `apps/web/src/features/router/queryState.ts`, and `apps/web/src/features/exports/exportClient.ts` (depends on T063, T064, T065; verify with T053 and T057)
- [X] T067 [US2] Implement export audit logging, detail-visibility omission markers, and timeline latency badges in `apps/api/src/services/export-audit-service.ts`, `apps/api/src/services/detail-visibility-service.ts`, `apps/web/src/components/lifecycle/TimelineLatencyBadge.tsx`, and `apps/web/src/components/lifecycle/VisibilityOmissionNotice.tsx` (depends on T063, T065, T066; verify with T056 and T057)

**Checkpoint**: User Story 2 should prove end-to-end lifecycle traceability and live-to-history convergence.

---

## Phase 5: User Story 3 - Analyze PnL and Skipped Trade Patterns (Priority: P3)

**Goal**: Deliver skips and PnL analytics with compare mode, explicit skip-only diagnostics, PnL edge-case handling, and degraded-state visibility.

**Independent Test**: Open the skips and PnL pages, compare multiple strategies, confirm skip-only diagnostics appear without downstream orders, and validate realized or unrealized PnL, fees, stale marks, and disagreement indicators against seeded edge cases.

### Tests for User Story 3

- [X] T068 [P] [US3] Write unit tests for skip taxonomy and no-order normalization in `tests/unit/analytics/skip-taxonomy.test.ts` and `tests/unit/analytics/no-order-normalization.test.ts` (depends on T018, T031, T039; verify the suites fail before implementation and pass after `pnpm test`)
- [X] T069 [P] [US3] Write unit tests for partial fills, partial closes, settlement transitions, stale marks, and fee allocation in `tests/unit/analytics/pnl-edge-cases.test.ts` and `tests/unit/analytics/fee-allocation.test.ts` (depends on T027, T031, T039; verify the suites fail before implementation and pass after `pnpm test`)
- [X] T070 [P] [US3] Write contract tests for skips, PnL analytics, compare mode, and live analytics payloads in `tests/contract/analytics/skip-pnl.contract.test.ts` and `tests/contract/analytics/pnl-compare.contract.test.ts` (depends on T014, T015, T018, T020, T032, T039; verify the suites fail before implementation and pass after `pnpm test:contract`)
- [X] T071 [P] [US3] Write integration tests for skip-only diagnostics and PnL disagreement reconciliation in `tests/integration/analytics/skip-only-and-pnl-reconciliation.test.ts` and `tests/integration/analytics/pnl-disagreement.test.ts` (depends on T031, T032, T039; verify the suites fail before implementation and pass after `pnpm test:integration`)
- [X] T072 [P] [US3] Write integration tests for PnL edge fixtures and compare-mode queries in `tests/integration/analytics/pnl-edge-fixtures.test.ts` and `tests/integration/analytics/compare-mode.test.ts` (depends on T031, T032, T039; verify the suites fail before implementation and pass after `pnpm test:integration`)
- [X] T073 [P] [US3] Write Playwright coverage for skip analysis, PnL analytics, and compare mode in `tests/e2e/analytics/skip-pnl.spec.ts` and `tests/e2e/analytics/compare-mode.spec.ts` (depends on T032, T039; verify the specs fail before implementation and pass after `pnpm test:e2e`)

### Implementation for User Story 3

- [X] T074 [P] [US3] Implement skips and PnL contracts in `packages/contracts/src/rest/skips.ts`, `packages/contracts/src/rest/pnl.ts`, and `packages/contracts/src/live/skips.ts` (depends on T068, T069, T070; verify with T070, T071, and T072)
- [X] T075 [P] [US3] Implement direct quant-runtime collectors and skip or no-order normalizers in `apps/ingest/src/adapters/http/quant-runtime-collector.ts`, `apps/ingest/src/adapters/http/strategy-health-collector.ts`, `apps/ingest/src/normalization/skip-normalizer.ts`, and `apps/ingest/src/normalization/no-order-normalizer.ts` (depends on T018, T029, T030, T039, T074; verify with T071)
- [X] T076 [P] [US3] Implement skip, position, market-position, and PnL projectors in `apps/ingest/src/projections/skip-event-projector.ts`, `apps/ingest/src/projections/position-snapshot-projector.ts`, `apps/ingest/src/projections/market-position-projector.ts`, and `apps/ingest/src/projections/pnl-snapshot-projector.ts` (depends on T024, T027, T031, T074, T075; verify with T071 and T072)
- [X] T077 [US3] Implement PnL reconciliation and valuation services in `apps/ingest/src/services/pnl-reconciliation-service.ts` and `apps/ingest/src/jobs/pnl-resync-job.ts` (depends on T027, T031, T076; verify with T069, T071, and T072)
- [X] T078 [US3] Implement skips and PnL services plus routes in `apps/api/src/services/skip-service.ts`, `apps/api/src/services/pnl-service.ts`, `apps/api/src/routes/skips.ts`, and `apps/api/src/routes/pnl.ts` (depends on T070, T074, T076, T077; verify with T070, T071, and T072)
- [X] T079 [P] [US3] Build the skips and PnL pages plus compare-mode containers in `apps/web/src/pages/SkipsPage.tsx`, `apps/web/src/pages/PnlPage.tsx`, `apps/web/src/components/skips/SkipTaxonomyTable.tsx`, `apps/web/src/components/pnl/PnlSummaryCards.tsx`, and `apps/web/src/components/pnl/CompareModeGrid.tsx` (depends on T073, T074, T078; verify with T073)
- [X] T080 [P] [US3] Wire skips or PnL RTK Query endpoints, compare mode, timezone toggles, and stale or partial badges in `apps/web/src/features/skips/skipsApi.ts`, `apps/web/src/features/pnl/pnlApi.ts`, `apps/web/src/features/compare/compareSlice.ts`, and `apps/web/src/components/pnl/StalePnlBadge.tsx` (depends on T078, T079; verify with T070 and T073)
- [X] T081 [US3] Add skip-only diagnostics and PnL edge-case fixtures in `packages/db/src/seed/fixtures/skips/skip-only.json`, `packages/db/src/seed/fixtures/skips/no-order.json`, `packages/db/src/seed/fixtures/pnl/partial-fill.json`, `packages/db/src/seed/fixtures/pnl/partial-close.json`, `packages/db/src/seed/fixtures/pnl/settlement.json`, `packages/db/src/seed/fixtures/pnl/stale-mark.json`, and `packages/db/src/seed/fixtures/pnl/disagreement.json` (depends on T039; verify `pnpm db:seed` loads the fixtures and T071 or T072 pass)
- [X] T082 [US3] Implement attribution, fees, win-loss, and disagreement UI components in `apps/web/src/components/pnl/AttributionChart.tsx`, `apps/web/src/components/pnl/FeeBreakdown.tsx`, `apps/web/src/components/pnl/WinLossSummary.tsx`, and `apps/web/src/components/pnl/PnlDisagreementBadge.tsx` (depends on T079, T080; verify with T072 and T073)

**Checkpoint**: User Story 3 should prove skip-only ingestion and PnL correctness across seeded edge cases.

---

## Phase 6: User Story 4 - Operate the Pipeline and Incident Surface (Priority: P4)

**Goal**: Deliver RabbitMQ and pipeline operations views, incidents, alert deep links, system health, reconnect or degraded handling, and alert-rule administration.

**Independent Test**: Induce a queue backlog or missing heartbeat, open the operations and alerts pages, verify the queue and consumer metrics reflect the degraded state, open an alert via a drawer and via `/alerts/:alertId`, update the threshold as an admin, and confirm the UI preserves context and permissions correctly.

### Tests for User Story 4

- [X] T083 [P] [US4] Write unit tests for alert-rule evaluation, backlog age, heartbeat freshness, and incident transitions in `tests/unit/operations/alert-rules.test.ts` and `tests/unit/operations/incident-transitions.test.ts` (depends on T026, T031, T039; verify the suites fail before implementation and pass after `pnpm test`)
- [X] T084 [P] [US4] Write contract tests for operations, alerts, `/alerts/:alertId`, system health, admin alert rules, and alert live payloads in `tests/contract/operations/alerts-ops.contract.test.ts` and `tests/contract/operations/admin-alert-rules.contract.test.ts` (depends on T014, T015, T020, T032, T039; verify the suites fail before implementation and pass after `pnpm test:contract`)
- [X] T085 [P] [US4] Write integration tests for RabbitMQ management collectors, backlog or DLQ alerts, and consumer freshness in `tests/integration/operations/queue-alert-thresholds.test.ts` and `tests/integration/operations/consumer-freshness.test.ts` (depends on T030, T031, T032, T039; verify the suites fail before implementation and pass after `pnpm test:integration`)
- [X] T086 [P] [US4] Write integration tests for alert-rule threshold changes, incident creation, and audit entries in `tests/integration/operations/alert-rule-update.test.ts` and `tests/integration/operations/incident-audit.test.ts` (depends on T026, T031, T032, T039; verify the suites fail before implementation and pass after `pnpm test:integration`)
- [X] T087 [P] [US4] Write Playwright coverage for operations, alert drawers, `/alerts/:alertId`, and reconnect states in `tests/e2e/operations/alerts-operations.spec.ts` and `tests/e2e/operations/alert-deep-link.spec.ts` (depends on T032, T039; verify the specs fail before implementation and pass after `pnpm test:e2e`)

### Implementation for User Story 4

- [X] T088 [P] [US4] Implement operations, alerts, system health, and admin alert-rule contracts in `packages/contracts/src/rest/operations.ts`, `packages/contracts/src/rest/alerts.ts`, `packages/contracts/src/rest/system-health.ts`, `packages/contracts/src/rest/admin/alert-rules.ts`, and `packages/contracts/src/live/alerts.ts` (depends on T083 and T084; verify with T084, T085, and T086)
- [X] T089 [P] [US4] Implement RabbitMQ management, publisher diagnostics, and executor health collectors in `apps/ingest/src/adapters/http/rabbitmq-management-collector.ts`, `apps/ingest/src/adapters/http/publisher-diagnostics-collector.ts`, and `apps/ingest/src/adapters/http/executor-health-collector.ts` (depends on T019, T030, T039, T088; verify with T085)
- [X] T090 [P] [US4] Implement queue-metric, heartbeat, alert, and system-health projectors in `apps/ingest/src/projections/queue-metric-projector.ts`, `apps/ingest/src/projections/heartbeat-projector.ts`, `apps/ingest/src/projections/alert-projector.ts`, and `apps/ingest/src/projections/system-health-projector.ts` (depends on T024, T026, T031, T088, T089; verify with T085 and T086)
- [X] T091 [P] [US4] Implement alert-rule repositories, default loaders, and evaluators in `packages/db/src/repos/alert-rule-config-repo.ts`, `apps/ingest/src/alerts/alert-rule-loader.ts`, and `apps/ingest/src/alerts/alert-evaluator.ts` (depends on T026, T028, T088, T090; verify with T083 and T086)
- [X] T092 [US4] Implement operations, alerts, alert detail, system-health, and admin alert-rule services plus routes in `apps/api/src/services/operations-service.ts`, `apps/api/src/services/alert-service.ts`, `apps/api/src/services/system-health-service.ts`, `apps/api/src/services/admin-alert-rule-service.ts`, `apps/api/src/routes/operations.ts`, `apps/api/src/routes/alerts.ts`, `apps/api/src/routes/system-health.ts`, and `apps/api/src/routes/admin/alert-rules.ts` (depends on T084, T086, T088, T090, T091; verify with T084, T085, and T086)
- [X] T093 [P] [US4] Build the operations, alerts list, and system-health pages in `apps/web/src/pages/OperationsPage.tsx`, `apps/web/src/pages/AlertsPage.tsx`, `apps/web/src/pages/SystemHealthPage.tsx`, `apps/web/src/components/operations/PipelineFlowDiagram.tsx`, `apps/web/src/components/operations/QueueHealthTable.tsx`, and `apps/web/src/components/alerts/AlertTable.tsx` (depends on T087, T088, T092; verify with T087)
- [X] T094 [P] [US4] Build alert drawer, alert detail page, and cross-entry navigation components in `apps/web/src/components/alerts/AlertDrawer.tsx`, `apps/web/src/pages/AlertDetailPage.tsx`, `apps/web/src/components/alerts/AlertLink.tsx`, and `apps/web/src/components/alerts/AlertDetailPanel.tsx` (depends on T087, T088, T092; verify with T084 and T087)
- [X] T095 [P] [US4] Build the admin alert-rule page and forms in `apps/web/src/pages/AdminAlertRulesPage.tsx`, `apps/web/src/components/admin/AlertRuleTable.tsx`, and `apps/web/src/components/admin/AlertRuleForm.tsx` (depends on T087, T088, T092; verify with T086 and T087)
- [X] T096 [US4] Wire operations and alerts RTK Query endpoints, alert deep-link navigation, and stream status handling in `apps/web/src/features/operations/operationsApi.ts`, `apps/web/src/features/alerts/alertsApi.ts`, `apps/web/src/features/router/alertNavigation.ts`, and `apps/web/src/features/live/streamStatus.ts` (depends on T092, T093, T094; verify with T084 and T087)
- [X] T097 [US4] Implement reconnect banners, degraded-state panels, and alert acknowledgement audit hooks in `apps/web/src/components/live/ReconnectBanner.tsx`, `apps/web/src/components/state/DegradedStatePanel.tsx`, `apps/api/src/services/alert-ack-service.ts`, and `apps/api/src/services/alert-audit-service.ts` (depends on T092, T093, T094, T096; verify with T086 and T087)

**Checkpoint**: User Story 4 should be independently testable with induced queue, consumer, or heartbeat failures.

---

## Phase 7: User Story 5 - Administer Access and Runtime Controls (Priority: P5)

**Goal**: Deliver contract-backed access-policy, export-scope, feature-flag, audit-log, and effective-capability administration that governs UI gating and backend enforcement consistently.

**Independent Test**: Sign in as admin, open `/admin/access-policies` and `/admin/feature-flags`, create or update valid and invalid policy changes, confirm `allowedExportResources` and raw-payload visibility change for affected users, verify denied paths remain denied, and confirm every accepted or rejected mutation writes an audit record.

### Tests for User Story 5

- [X] T098 [P] [US5] Write unit tests for policy evaluation, capability resolution, and feature-flag payload validation in `tests/unit/admin/policy-evaluator.test.ts` and `tests/unit/admin/feature-flag-validation.test.ts` (depends on T013, T020, T023; verify the suites fail before implementation and pass after `pnpm test`)
- [X] T099 [P] [US5] Write contract tests for session capability responses, access-policy CRUD, and feature-flag mutation contracts in `tests/contract/admin/session-capabilities.contract.test.ts` and `tests/contract/admin/access-policy-feature-flag.contract.test.ts` (depends on T014, T020, T023, T032; verify the suites fail before implementation and pass after `pnpm test:contract`)
- [X] T100 [P] [US5] Write integration tests for role or policy capability differences, `allowedExportResources`, and raw-payload visibility in `tests/integration/auth/effective-capability-resolution.test.ts` and `tests/integration/auth/raw-payload-visibility.test.ts` (depends on T033, T038, T039, T063; verify the suites fail before implementation and pass after `pnpm test:integration`)
- [X] T101 [P] [US5] Write integration tests for admin access-policy CRUD, export-scope enforcement, and audit-log creation in `tests/integration/admin/access-policy-crud.test.ts` and `tests/integration/admin/export-scope-enforcement.test.ts` (depends on T023, T033, T038, T039; verify the suites fail before implementation and pass after `pnpm test:integration`)
- [X] T102 [P] [US5] Write integration tests for feature-flag update success, deny, invalid payload, conflict, and audit-log behavior in `tests/integration/admin/feature-flag-mutation.test.ts` and `tests/integration/admin/feature-flag-audit.test.ts` (depends on T020, T023, T033, T038, T039; verify the suites fail before implementation and pass after `pnpm test:integration`)
- [X] T103 [P] [US5] Write integration tests for SSE authorization filtering or denial after policy changes in `tests/integration/auth/sse-capability-enforcement.test.ts` and `tests/integration/auth/policy-change-reconnect.test.ts` (depends on T020, T032, T033, T038, T039; verify the suites fail before implementation and pass after `pnpm test:integration`)
- [X] T104 [P] [US5] Write Playwright coverage for access-policy and feature-flag administration in `tests/e2e/admin/access-policies.spec.ts` and `tests/e2e/admin/feature-flags.spec.ts` (depends on T032, T039; verify the specs fail before implementation and pass after `pnpm test:e2e`)

### Implementation for User Story 5

- [X] T105 [P] [US5] Implement access-policy, export-scope, effective-capability, and feature-flag repositories in `packages/db/src/repos/admin/access-policy-repo.ts`, `packages/db/src/repos/admin/export-scope-repo.ts`, `packages/db/src/repos/admin/effective-capability-repo.ts`, and `packages/db/src/repos/admin/feature-flag-repo.ts` (depends on T023, T028, T098, T099; verify with T100, T101, and T102)
- [X] T106 [US5] Implement effective-capability resolution, policy evaluation, and export-scope combination in `apps/api/src/auth/effective-capability-resolver.ts`, `apps/api/src/auth/policy-evaluator.ts`, and `apps/api/src/auth/export-scope-resolver.ts` (depends on T033, T098, T099, T105; verify with T100 and T101)
- [X] T107 [US5] Implement session service and contract-backed capability exposure in `apps/api/src/services/session-service.ts`, `apps/api/src/routes/auth.ts`, and `apps/api/src/auth/session-context.ts` (depends on T099, T100, T105, T106; verify with T099 and T100)
- [X] T108 [US5] Implement admin access-policy services and routes in `apps/api/src/services/access-policy-service.ts` and `apps/api/src/routes/admin/access-policies.ts` (depends on T099, T101, T105, T106; verify with T099, T101, and T104)
- [X] T109 [US5] Implement admin feature-flag services and routes in `apps/api/src/services/feature-flag-service.ts` and `apps/api/src/routes/admin/feature-flags.ts` (depends on T099, T102, T105, T106; verify with T099, T102, and T104)
- [X] T110 [US5] Implement export, raw-payload, and admin-route enforcement in `apps/api/src/plugins/route-capabilities.ts`, `apps/api/src/services/export-authorization-service.ts`, and `apps/api/src/services/detail-visibility-service.ts` (depends on T100, T101, T105, T106, T107; verify with T100, T101, and T102)
- [X] T111 [US5] Implement SSE capability filtering, denial responses, and reconnect revalidation in `apps/api/src/plugins/sse.ts` and `apps/api/src/services/live-subscription-service.ts` (depends on T103, T106, T107, T110; verify with T103 and T104)
- [X] T112 [P] [US5] Build session bootstrap, route gating, and admin navigation controls in `apps/web/src/features/session/sessionApi.ts`, `apps/web/src/features/session/sessionSlice.ts`, `apps/web/src/routes/RequireCapability.tsx`, and `apps/web/src/components/nav/AdminNav.tsx` (depends on T099, T107; verify with T100 and T104)
- [X] T113 [P] [US5] Build the access-policy admin page, list, editor, error states, and audit panel in `apps/web/src/pages/AdminAccessPoliciesPage.tsx`, `apps/web/src/components/admin/access-policies/PolicyList.tsx`, `apps/web/src/components/admin/access-policies/PolicyEditor.tsx`, `apps/web/src/components/admin/access-policies/PolicyRuleEditor.tsx`, `apps/web/src/components/admin/access-policies/ExportScopeEditor.tsx`, and `apps/web/src/components/admin/access-policies/PolicyAuditPanel.tsx` (depends on T104, T108, T112; verify with T101 and T104)
- [X] T114 [P] [US5] Build the feature-flag admin page, editor, validation, and conflict feedback in `apps/web/src/pages/AdminFeatureFlagsPage.tsx`, `apps/web/src/components/admin/feature-flags/FeatureFlagTable.tsx`, `apps/web/src/components/admin/feature-flags/FeatureFlagEditor.tsx`, and `apps/web/src/components/admin/feature-flags/FeatureFlagErrorPanel.tsx` (depends on T104, T109, T112; verify with T102 and T104)
- [X] T115 [US5] Implement admin audit-log services, routes, page, and viewers in `apps/api/src/services/admin-audit-service.ts`, `apps/api/src/routes/admin/audit-logs.ts`, `apps/web/src/pages/AdminAuditLogsPage.tsx`, and `apps/web/src/components/admin/AuditLogTable.tsx` (depends on T026, T101, T102, T108, T109, T112; verify with T101, T102, and T104)
- [X] T116 [US5] Wire admin RTK Query endpoints and mutation flows for session, access policies, feature flags, and audit logs in `apps/web/src/features/admin/adminApi.ts`, `apps/web/src/features/admin/adminSelectors.ts`, and `apps/web/src/features/admin/adminMutationToasts.ts` (depends on T107, T108, T109, T112, T113, T114, T115; verify with T099, T100, T101, T102, T103, and T104)

**Checkpoint**: User Story 5 should close the remaining admin-policy and feature-flag control gaps across UI gating and backend enforcement.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Complete deployment readiness, performance, accessibility, documentation, and release validation across the full product.

- [X] T117 [P] Add container build assets in `infra/docker/web.Dockerfile`, `infra/docker/api.Dockerfile`, and `infra/docker/ingest.Dockerfile` (depends on T010, T051, T067, T082, T097, and T116; verify `docker build` succeeds for all three images)
- [X] T118 [P] Add runtime configuration manifests, secrets boundaries, and health probes in `infra/kubernetes/base/web-deployment.yaml`, `infra/kubernetes/base/api-deployment.yaml`, `infra/kubernetes/base/ingest-deployment.yaml`, `infra/kubernetes/base/configmap.yaml`, `infra/kubernetes/base/secrets.example.yaml`, `infra/kubernetes/overlays/staging/kustomization.yaml`, and `infra/kubernetes/overlays/production/kustomization.yaml` (depends on T011, T032, T117; verify `docker run --rm -v \"$PWD\":/work -w /work bitnami/kubectl:latest kustomize infra/kubernetes/overlays/staging` renders valid manifests)
- [X] T119 [P] Add promotion and smoke-validation scripts in `scripts/release/verify-staging.ts`, `scripts/release/promote.ts`, `scripts/release/seed-smoke.ts`, and `tests/smoke/deployment-smoke.test.ts` (depends on T117 and T118; verify `pnpm test:smoke` passes against the local deployment stack)
- [X] T120 [P] Add CI workflows for lint, typecheck, unit, integration, contract, end-to-end, build, and deployment smoke in `.github/workflows/ci.yml` and `.github/workflows/deploy-smoke.yml` (depends on T010, T117, and T119; verify the workflows run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm test:contract`, `pnpm test:e2e`, and `pnpm build`)
- [X] T121 Optimize indexes, server pagination defaults, and virtualized table primitives in `packages/db/src/schema/indexes.ts`, `apps/api/src/services/pagination.ts`, `packages/ui/src/primitives/VirtualizedDataTable.tsx`, and `apps/web/src/components/table/DataTableShell.tsx` (depends on T028, T046, T063, T078, T092, and T116; verify large-query behavior with T042, T057, T073, and T087)
- [X] T122 [P] Finalize environment, schema, runbook, and troubleshooting docs in `README.md`, `docs/environment.md`, `docs/local-development.md`, `docs/runbooks/replay-and-resync.md`, `docs/runbooks/queue-backlog-and-dlq.md`, `docs/runbooks/stale-pnl.md`, `docs/schema/normalized-events.md`, `docs/schema/source-compatibility.md`, `docs/schema/access-control.md`, `docs/schema/admin-mutations.md`, and `docs/troubleshooting.md` (depends on T021, T031, T077, T091, T106, T109, and T118; verify the docs cover quickstart scenarios 1-15 in T125)
- [X] T123 [P] Finish accessibility hardening and cross-cutting test coverage in `packages/ui/src/primitives/Table.tsx`, `packages/ui/src/primitives/Dialog.tsx`, `packages/ui/src/primitives/FormField.tsx`, `apps/web/src/components/state/ScreenReaderStatus.tsx`, `tests/e2e/accessibility/navigation.spec.ts`, and `tests/contract/live/stream.contract.test.ts` (depends on T051, T067, T082, T097, and T116; verify `pnpm test:e2e -- tests/e2e/accessibility/navigation.spec.ts` and `pnpm test:contract -- tests/contract/live/stream.contract.test.ts` pass)
- [X] T124 [P] Align implementation documentation with the planned source tree in `README.md`, `docs/local-development.md`, and `docs/schema/index.md` so they reference `apps/api/src/plugins/sse.ts` and `docs/schema/*` consistently (depends on T008, T032, T122; verify `git grep -n -E \"apps/api/src/streams|packages/projections\" -- README.md docs ':!docs/troubleshooting.md'` returns no matches)
- [X] T125 Validate all quickstart and deployment-readiness scenarios in `specs/001-quant-ops-dashboard/quickstart.md` and record release readiness in `docs/release-readiness.md` (depends on T039, T055, T071, T086, T104, T119, T122, T123, and T124; verify scenarios 1-15 from quickstart are executed and captured)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; starts immediately.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user stories.
- **User Stories (Phases 3-7)**: Depend on Foundational completion.
- **Polish (Phase 8)**: Depends on the selected story set being complete.

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational; recommended MVP slice.
- **US2 (P2)**: Can start after Foundational and shares live-feed, export, and routing primitives with US1.
- **US3 (P3)**: Can start after Foundational and depends on the generic adapter plus canonical-event foundations.
- **US4 (P4)**: Can start after Foundational and depends on alert-rule schema plus the same stream foundations used by earlier stories.
- **US5 (P5)**: Can start after Foundational but validates policy effects most completely after the export, raw-payload, and live-stream surfaces from US2 and US4 exist.

### Remaining Analyze Coverage

- **FR-002c access or export policy scope**: Build in T020, T023, T033, T063, T105, T106, T108, T110, T113, and T116; verify in T035, T038, T056, T099, T100, T101, T103, and T104.
- **FR-002e admin control surfaces and feature-flag round trip**: Build in T020, T023, T091, T095, T108, T109, T113, T114, T115, and T116; verify in T084, T086, T099, T101, T102, and T104.
- **FR-002f effective capability enforcement across exports, raw payloads, live subscriptions, and admin pages**: Build in T014, T032, T033, T063, T092, T106, T107, T110, T111, T112, and T116; verify in T038, T056, T099, T100, T101, T102, T103, and T104.
- **File-layout alignment for `apps/api/src/plugins/sse.ts` and `docs/schema/*`**: Build in T032, T122, and T124; verify in T124 and T125.

### Recommended Delivery Order

1. Complete Setup and Foundational work.
2. Deliver **US1** to land a trustworthy operator overview and strategy health slice.
3. Deliver **US2** to validate lifecycle traceability, export parity, and ordered convergence.
4. Deliver **US3** for skip-only diagnostics and PnL correctness.
5. Deliver **US4** for operations, incidents, alert deep links, and alert-rule administration.
6. Deliver **US5** to finalize access-policy, export-scope, feature-flag, and audit-control administration.
7. Finish deployment, docs, accessibility, and release readiness.

---

## Parallel Opportunities

### Setup

- `T002`, `T003`, `T004`, and `T005` can run in parallel after `T001`.
- `T007`, `T008`, and `T009` can run in parallel after `T003` and `T004`.

### Foundational

- `T011` through `T027` can be split by package owner once the workspace exists.
- `T034`, `T035`, `T036`, `T037`, and `T038` can run in parallel after the corresponding contract or schema stubs are in place.

### User Story 1

```bash
Task: "T040 tests/unit/overview/overview-selectors.test.ts"
Task: "T041 tests/contract/overview/overview-and-strategies.contract.test.ts"
Task: "T042 tests/integration/overview/overview-api.test.ts"
Task: "T043 tests/e2e/overview/landing-and-strategy.spec.ts"
```

```bash
Task: "T045 apps/ingest/src/projections/overview-projector.ts"
Task: "T047 apps/web/src/pages/OverviewPage.tsx"
Task: "T048 apps/web/src/pages/StrategiesPage.tsx"
Task: "T049 apps/web/src/features/overview/overviewApi.ts"
```

### User Story 2

```bash
Task: "T052 tests/unit/lifecycle/timeline-ordering.test.ts"
Task: "T053 tests/contract/lifecycle/decision-trade.contract.test.ts"
Task: "T054 tests/integration/lifecycle/convergence-normal.test.ts"
Task: "T055 tests/integration/lifecycle/convergence-replay-resync.test.ts"
Task: "T056 tests/integration/auth/lifecycle-authorization.test.ts"
Task: "T057 tests/e2e/lifecycle/search-trace-resync.spec.ts"
```

```bash
Task: "T059 apps/ingest/src/adapters/rabbitmq/publisher-consumer.ts"
Task: "T060 apps/ingest/src/normalization/publisher-normalizer.ts"
Task: "T064 apps/web/src/pages/DecisionsPage.tsx"
Task: "T065 apps/web/src/pages/DecisionDetailPage.tsx"
```

### User Story 3

```bash
Task: "T068 tests/unit/analytics/skip-taxonomy.test.ts"
Task: "T069 tests/unit/analytics/pnl-edge-cases.test.ts"
Task: "T070 tests/contract/analytics/skip-pnl.contract.test.ts"
Task: "T071 tests/integration/analytics/skip-only-and-pnl-reconciliation.test.ts"
Task: "T072 tests/integration/analytics/pnl-edge-fixtures.test.ts"
Task: "T073 tests/e2e/analytics/skip-pnl.spec.ts"
```

```bash
Task: "T075 apps/ingest/src/adapters/http/quant-runtime-collector.ts"
Task: "T076 apps/ingest/src/projections/skip-event-projector.ts"
Task: "T079 apps/web/src/pages/SkipsPage.tsx"
Task: "T080 apps/web/src/features/pnl/pnlApi.ts"
```

### User Story 4

```bash
Task: "T083 tests/unit/operations/alert-rules.test.ts"
Task: "T084 tests/contract/operations/alerts-ops.contract.test.ts"
Task: "T085 tests/integration/operations/queue-alert-thresholds.test.ts"
Task: "T086 tests/integration/operations/alert-rule-update.test.ts"
Task: "T087 tests/e2e/operations/alerts-operations.spec.ts"
```

```bash
Task: "T089 apps/ingest/src/adapters/http/rabbitmq-management-collector.ts"
Task: "T090 apps/ingest/src/projections/alert-projector.ts"
Task: "T093 apps/web/src/pages/OperationsPage.tsx"
Task: "T094 apps/web/src/pages/AlertDetailPage.tsx"
Task: "T095 apps/web/src/pages/AdminAlertRulesPage.tsx"
```

### User Story 5

```bash
Task: "T098 tests/unit/admin/policy-evaluator.test.ts"
Task: "T099 tests/contract/admin/session-capabilities.contract.test.ts"
Task: "T100 tests/integration/auth/effective-capability-resolution.test.ts"
Task: "T101 tests/integration/admin/access-policy-crud.test.ts"
Task: "T102 tests/integration/admin/feature-flag-mutation.test.ts"
Task: "T103 tests/integration/auth/sse-capability-enforcement.test.ts"
Task: "T104 tests/e2e/admin/access-policies.spec.ts"
```

```bash
Task: "T105 packages/db/src/repos/admin/access-policy-repo.ts"
Task: "T108 apps/api/src/routes/admin/access-policies.ts"
Task: "T109 apps/api/src/routes/admin/feature-flags.ts"
Task: "T113 apps/web/src/pages/AdminAccessPoliciesPage.tsx"
Task: "T114 apps/web/src/pages/AdminFeatureFlagsPage.tsx"
Task: "T115 apps/web/src/pages/AdminAuditLogsPage.tsx"
```

---

## Implementation Strategy

### MVP First

1. Finish Setup and Foundational work, especially the shared contracts, generic adapter framework, canonical event or observation model, and session capability foundation.
2. Deliver **US1** to establish a trustworthy operator landing and strategy health slice.
3. Add **US2** next so the team can validate ordered convergence, deep-link parity, and export behavior before expanding analytics and control surfaces.

### Incremental Delivery

1. **US1** proves mixed-source monitoring, landing behavior, and data-driven strategy surfaces.
2. **US2** proves lifecycle traceability, export parity, and live-to-history convergence.
3. **US3** proves skip-only inputs and PnL correctness across edge cases.
4. **US4** proves operations, alert deep links, and alert-rule administration.
5. **US5** proves contract-backed access policy, export scope, feature-flag mutation, and audit enforcement.
6. **Phase 7** makes the release deployable, documented, accessible, and production-ready.
