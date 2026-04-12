# Feature Specification: Kalshi Quant Dashboard

**Feature Branch**: `001-quant-ops-dashboard`  
**Created**: 2026-04-11  
**Status**: Draft  
**Input**: User description: "Build an internal control plane and observability
dashboard that unifies live and historical visibility across the Kalshi BTC,
ETH, SOL, XRP, event publisher, and executor systems."

## Clarifications

### Session 2026-04-11

- Q: Which identifier should be canonical for stitching the full lifecycle across quant, publisher, executor, RabbitMQ, and Kalshi surfaces? → A: `correlation_id` is the single canonical id for every decision, trade, retry, fill, skip, and alert in the lifecycle.
- Q: How should the dashboard normalize different upstream message shapes? → A: Use a fixed canonical event taxonomy for normalized storage and querying, while preserving each raw source event name and payload as metadata.
- Q: How should the dashboard deduplicate normalized records across replayed or mismatched upstream messages? → A: Deduplicate by `source_system + source_event_name + source_event_id`; if `source_event_id` is missing, fall back to a deterministic semantic fingerprint built from canonical family and key semantic fields.
- Q: How should the dashboard model lifecycle state across publisher, executor, RabbitMQ, fill, and terminal-result facts? → A: Use fixed canonical lifecycle stages for cross-system querying while preserving source-specific statuses and raw event names as metadata.
- Q: How should skipped-trade reasons be normalized for cross-strategy analytics? → A: Normalize skips into a canonical `skip_category` plus optional `skip_code` while preserving the raw skip reason text.
- Q: What is the canonical PnL basis for the dashboard? → A: `realized_pnl` is net of allocated fees on closed or settled quantity; `unrealized_pnl` is net mark-to-market on still-open quantity; fees are also exposed separately.
- Q: What is the canonical attribution grain for dashboard PnL? → A: The canonical attribution unit is the market-position lifecycle, with rollups to strategy, symbol, market, and portfolio.
- Q: How should PnL time buckets be calculated? → A: Use UTC as the canonical calculation basis; `24h`, `7d`, and `30d` are rolling UTC windows; `MTD` and `YTD` are UTC calendar buckets; local timezone affects display only.
- Q: How should the dashboard behave when PnL inputs are stale or partial? → A: Show the last successfully computed PnL values with explicit `stale` or `partial` status, freshness timestamps, and degraded aggregate labeling.
- Q: How should custom PnL date ranges work? → A: For a custom UTC range, realized PnL is included by canonical realization timestamp within the range, and unrealized PnL is valued as of the range end timestamp.
- Q: How should the dashboard handle current upstream repo differences? → A: Current-state compatibility requires mixed ingestion from the centralized publisher/RabbitMQ path plus direct strategy collectors where sibling repos do not yet publish all required facts through the centralized path; future-state convergence may later move all strategies onto the centralized path, but the current product must not assume that migration is already complete.
- Q: How must alerts be reachable in the UI? → A: Alerts must be reachable both as in-context drawers and as dedicated deep-linkable detail pages at `/alerts/:alertId`, with navigation from overview, alerts list, strategy detail, and pipeline or operations pages.
- Q: How should skip-only and no-trade diagnostics be treated? → A: Skip-only and no-trade diagnostics are first-class upstream inputs and must be shown explicitly rather than inferred from missing downstream order events.
- Q: How should live views converge with history after interruptions? → A: Live decisions, trades, skips, alerts, and health events must reconcile into searchable history with stable identifiers and timestamps after reconnect, replay, backfill, or resync.
- Q: How explicit must role differences be? → A: Operator, Developer, and Admin permissions must differ explicitly for raw payload access, export scope, administrative controls, and live subscription visibility so those differences are testable and visible in product behavior.
- Q: How explicit must admin-managed access, export, and runtime controls be? → A: Access policy, export-scope policy, and feature-flag administration are first-class product features; the dashboard must expose a contract-backed effective-capability result, a dedicated `/admin/access-policies` surface, fully round-trip feature-flag controls, and audit history for every admin mutation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Monitor Live Portfolio and Strategy Health (Priority: P1)

As an operator, I want a single overview and per-strategy view so I can tell
within a minute what each strategy is doing, whether the pipeline is healthy,
and whether intervention is needed.

**Why this priority**: Immediate situational awareness is the primary value of
the product. Without it, operators still need to inspect multiple systems and
logs to understand current trading activity.

**Independent Test**: Using seeded or live internal data, an operator can open
the overview and strategy pages and determine current strategy activity,
aggregate PnL, skip volume, queue health, and active incidents without leaving
the dashboard.

**Acceptance Scenarios**:

1. **Given** the operator has authenticated successfully, **When** the
   dashboard first loads, **Then** the first landing view is the overview
   dashboard and its primary content shows global health, critical or recent
   alerts, aggregate PnL, live decision feed, live trade feed, skip count, and
   queue health before deeper drill-down navigation is required.
2. **Given** the operator selects a strategy from the strategy list, **When**
   the strategy detail page opens, **Then** it shows that strategy's current
   health, recent decisions, trades, skips, active alerts, and PnL trend.
3. **Given** a new strategy is onboarded through the standard data contracts,
   **When** it begins sending valid events, **Then** it appears in the strategy
   list and shared monitoring views through configuration and contract mapping
   without requiring a custom page design, hard-coded per-asset UI, or bespoke
   collector rewrite, provided it follows the
   `kalshi-${cryptoSymbol}-quant` strategy-repo convention.

---

### User Story 2 - Trace Decisions and Trades End-to-End (Priority: P2)

As a developer or operator, I want to search for a decision or trade and view
its full lifecycle so I can diagnose what happened without reading raw logs.

**Why this priority**: Fast lifecycle traceability is the main diagnostic
workflow for debugging execution issues, explaining skips, and confirming final
outcomes across multiple systems.

**Independent Test**: A user can start from a correlation ID, decision ID,
order ID, Kalshi ID, or filtered result set and reach a complete per-item
timeline that covers strategy emission through terminal result.

**Acceptance Scenarios**:

1. **Given** a user searches by correlation ID, decision ID, order ID, or a
   combination of filters, **When** the decisions or trades page is queried,
   **Then** matching records are returned with server-backed filtering, search,
   sorting, pagination, deep-linkable query state, and a detail drawer for the
   selected item.
2. **Given** a decision moves through strategy emission, publisher, RabbitMQ,
   executor, Kalshi submission, and terminal outcome, **When** the user opens
   the decision or trade detail drawer, **Then** the dashboard shows the
   end-to-end audit trail with timestamps, routing information, queue and
   exchange metadata, retry counts, final outcome, and the actually observed
   upstream path for that lifecycle instead of implying that every strategy used
   the same centralized publisher path.
3. **Given** a decision or trade is skipped, delayed, retried, rejected, or
   dead-lettered, **When** the detail drawer is opened, **Then** the dashboard
   shows the exact known reason, stage, and related audit entries while
   explicitly marking any missing upstream data as degraded instead of inferred.
4. **Given** the user opens a decision or trade from a table or a shared link,
   **When** the detail view is shown, **Then** desktop layouts use a detail
   drawer for in-context inspection and the same record is also reachable as a
   dedicated deep-linkable detail page.

---

### User Story 3 - Analyze PnL and Skipped Trade Patterns (Priority: P3)

As an operator, I want to analyze performance and skip behavior by strategy and
market so I can compare systems, understand trends, and spot problems early.

**Why this priority**: Operators need more than raw event visibility; they also
need portfolio understanding, attribution, and explanations for missed
opportunities or changing performance.

**Independent Test**: A user can compare strategies side-by-side, inspect
filtered skipped-trade breakdowns, and review PnL summaries and trends for the
required time ranges without using external spreadsheets or logs.

**Acceptance Scenarios**:

1. **Given** live and historical PnL data is available, **When** the user opens
   the PnL analytics page, **Then** the dashboard shows summaries and time
   series for 24h, 7d, 30d, MTD, YTD, all-time, and a custom range by strategy,
   symbol, market, and aggregate portfolio.
2. **Given** skip events exist across multiple strategies and markets, **When**
   the user opens the skipped trades page, **Then** the page shows skip taxonomy
   and root-cause breakdowns with filters for strategy, symbol, market, time,
   and reason.
3. **Given** the user compares BTC, ETH, SOL, XRP, and any newly onboarded
   strategies, **When** a side-by-side comparison is requested, **Then** the
   dashboard presents the same metrics, synchronized time range, and drill-down
   actions consistently for each selected strategy in compare mode.

---

### User Story 4 - Operate the Pipeline and Incident Surface (Priority: P4)

As an operator, I want a dedicated operations and incidents surface so I can
see pipeline bottlenecks, alert conditions, and stale or missing data before
they become trading blind spots.

**Why this priority**: Pipeline failures, stuck queues, and stale data can make
every other screen misleading. Operators need an explicit operations view to
trust the rest of the dashboard.

**Independent Test**: In a seeded or live environment, an operator can inspect
pipeline health, active alerts, system status, and filtered incidents, then
export or deep-link the same state for follow-up.

**Acceptance Scenarios**:

1. **Given** the publisher, RabbitMQ, and consumers are active, **When** the
   user opens the pipeline and RabbitMQ operations page, **Then** it shows event
   flow, queue and exchange health, queue depth, consumer count, oldest message
   age, DLQ size, publish failures, unroutable events, and reconnect status.
2. **Given** heartbeats go missing, queues become stuck, DLQs grow, consumers
   fail, PnL becomes stale, ingest fails, or terminal events do not arrive,
   **When** those conditions occur, **Then** visible alerts and incident records
   appear on the alerts/incidents and system health pages with severity,
   affected component, first seen time, latest seen time, and current status.
3. **Given** a user has filtered a set of decisions, trades, alerts, or PnL
   results, **When** they export the current view or share a deep link, **Then**
   the exported data and linked state match the visible filters and selected
   detail context.
4. **Given** live streaming feeds are active on the overview or table-driven
   pages, **When** the operator pauses and later resumes a feed, **Then** the
   visible feed freezes while paused, shows a paused or freshness indicator,
   and on resume applies missed events in canonical order without losing the
   current query context.
5. **Given** an alert appears on the overview, alerts list, strategy detail, or
   pipeline and operations pages, **When** the user opens that alert,
   **Then** the same alert is reachable both as an in-context drawer and as a
   dedicated deep-linkable page at `/alerts/:alertId` without losing the
   surrounding query context.

---

### User Story 5 - Administer Access and Runtime Controls (Priority: P5)

As an admin, I want to manage access policy, export policy, and runtime control
state from the dashboard so permissions and operational controls stay correct
without hidden manual processes.

**Why this priority**: Monitoring and diagnostics depend on trustworthy access
boundaries and controlled rollout behavior. The dashboard is not production
ready if those controls remain implicit or unmanaged.

**Independent Test**: An admin can open the access-policy and feature-flag
surfaces, view current effective capabilities and export scope, submit valid and
invalid changes, and confirm that successful changes are audited and reflected
consistently across live, historical, export, and deep-link flows.

**Acceptance Scenarios**:

1. **Given** an admin opens `/admin/access-policies`, **When** they review or
   update access or export policy, **Then** the dashboard shows current policy
   state, effective capability outcomes, and audit history for those changes.
2. **Given** an admin submits an invalid access policy, export policy, or
   feature-flag change, **When** validation fails, **Then** the dashboard shows
   explicit validation errors and does not partially apply the invalid change.
3. **Given** an admin changes access policy, export scope, or runtime flag
   state, **When** affected users next access live subscriptions, exports,
   privileged audit views, or deep links, **Then** the resulting permissions and
   visible controls reflect the updated effective capability result
   consistently.
4. **Given** an admin opens feature-flag controls, **When** they update a flag,
   **Then** the dashboard shows the current flag state, who changed it, when it
   changed, and the corresponding audit history.

### Edge Cases

- Duplicate upstream messages must not create duplicate decisions, trades,
  fills, alerts, or PnL facts in the dashboard.
- Late-arriving lifecycle updates must attach to the correct decision or trade
  timeline without rewriting already known facts incorrectly.
- If part of a lifecycle is missing, the dashboard must show the known facts and
  clearly label the record as degraded or incomplete rather than filling gaps.
- If one strategy currently contributes facts through centralized
  publisher/RabbitMQ events while another still requires direct strategy
  collectors, the dashboard must normalize both paths without implying they were
  sourced the same way.
- If a strategy is healthy but the publisher, RabbitMQ, executor, or Kalshi
  stage is unhealthy, the dashboard must show the failing stage explicitly.
- If a strategy emits skip-only or no-trade diagnostics with no downstream order
  event, the dashboard must show that explicit skip or no-trade fact rather
  than inferring it from silence.
- If a user lacks permission for a strategy, export, or diagnostic detail, the
  dashboard must withhold that surface without leaking hidden data in search or
  deep links.
- If a strategy is newly onboarded but has no historical data yet, it must
  appear with accurate empty states rather than missing from shared views.
- If an upstream repository does not follow the `kalshi-${cryptoSymbol}-quant`
  strategy-repo convention, it must not appear as a strategy in shared strategy
  lists or comparisons, even if it contributes pipeline or operational data.
- If users switch between UTC and local time, all pages, exports, and detail
  views must keep timestamps internally consistent and visibly labeled.
- If very large result sets are requested, the dashboard must preserve filters,
  bounded queries, and stable navigation without attempting to show unbounded
  history at once.
- If a live feed is paused, the page must preserve the visible result set,
  indicate paused or stale state clearly, and resume from the missed-event
  backlog without duplicating visible records.
- If a filter or search query returns no rows, the page must distinguish
  between "no matching results", "no data yet", and "data unavailable because
  of degraded upstream state".
- If a deep link targets a record the user cannot access or that no longer
  exists, the page must show an explicit unauthorized, unavailable, or not
  found state without clearing the surrounding query context.
- If reconnect, replay, backfill, or resync occurs after the user has already
  seen live decisions, trades, skips, alerts, or health events, those facts
  must still reconcile into searchable history with matching identifiers and
  timestamps once persistence catches up.
- If an admin submits an invalid access policy, export policy, or feature-flag
  change, the dashboard must surface validation errors clearly and must not
  apply any ambiguous or partial mutation.
- If an access policy or export policy change removes permissions while a user
  already has a live feed, deep link, or export surface open, subsequent data
  delivery and navigation must respect the new effective capability result
  without leaking previously unauthorized detail.

## Contracts & Boundaries *(mandatory for any network, queue, or persistence change)*

### Boundary Inventory

- **Boundary**: Strategy, publisher, executor, and Kalshi lifecycle event intake
  into the dashboard domain.
  **Shared Contract**: A fixed canonical event taxonomy for normalized storage
  and querying with event families including `decision`, `trade`,
  `trade_intent`, `skip`, `publisher_event`, `queue_metric`,
  `executor_event`, `fill`, `position_snapshot`, `pnl_snapshot`, `heartbeat`,
  `alert`, and `audit_event`. Every accepted normalized record carries a
  canonical `correlation_id`, source metadata, the original source event name,
  the original source payload, and any source-local aliases such as decision
  ids, trade ids, trade intent ids, publisher order ids, command event ids,
  client order ids, external order ids, and Kalshi ids.
  **Runtime Validation**: Every inbound event is validated before it is accepted
  for live display, normalization, alert evaluation, or historical storage.
  **Compatibility Plan**: Changes are additive by default; any semantic change
  requires versioned contract updates, documented migration rules, and replay
  expectations. Current-state compatibility requires mixed ingestion from the
  centralized publisher/RabbitMQ path plus direct strategy collectors where a
  `kalshi-${cryptoSymbol}-quant` repository does not yet publish all required
  facts through the centralized path. Future-state convergence may later move
  all strategies onto the centralized publisher/RabbitMQ path, but the current
  dashboard contract MUST remain accurate before and after that convergence.
- **Boundary**: Live operator-facing updates delivered to overview, strategy,
  decision, trade, PnL, and operations views.
  **Shared Contract**: Shared read-model definitions for live decision feeds,
  live trade feeds, health summaries, alerts, and derived status surfaces.
  **Runtime Validation**: Outbound live updates are validated before delivery so
  the UI only receives recognized, typed states.
  **Compatibility Plan**: New fields can appear without breaking existing views;
  removed or redefined fields require a coordinated contract revision.
- **Boundary**: Historical search, detail retrieval, analytics, and CSV export.
  **Shared Contract**: Shared query and result definitions for filtered tables,
  detail drawers, analytics summaries, time series, exports, and deep-linkable
  state.
  **Runtime Validation**: Requests and responses are validated so filters,
  identifiers, time ranges, and exported datasets remain consistent.
  **Compatibility Plan**: Query defaults remain stable across releases, and any
  change to field meaning requires documented migration behavior.
- **Boundary**: Authenticated session capability evaluation and admin-managed
  access, export, and runtime control changes.
  **Shared Contract**: Shared capability and policy definitions describing the
  effective role result, authorized strategy scope, live subscription detail,
  raw payload visibility, allowed export resources or scopes, privileged audit
  visibility, access and export policy records, runtime flag state, validation
  errors, and audit metadata for admin mutations.
  **Runtime Validation**: Effective capability payloads and every admin policy
  or runtime-control mutation are validated before access is granted or changes
  are accepted.
  **Compatibility Plan**: Capability fields and policy records are additive by
  default; changed permission semantics require documented migration behavior so
  UI gating and backend enforcement remain aligned.
- **Boundary**: Alert, incident, and system health state flowing into the
  dashboard.
  **Shared Contract**: Shared incident and health signal definitions describing
  severity, component, condition type, timestamps, freshness, and resolution
  state.
  **Runtime Validation**: Health and alert payloads are validated before they
  affect visible incident state or operator trust signals.
  **Compatibility Plan**: New alert types can be added without changing the user
  workflow; changed severity semantics require explicit release notes.

### Security & Access Model

- **Authentication**: All non-public access requires individual authenticated
  internal user sessions before any dashboard data is shown.
- **RBAC**: Operator, Developer, and Admin roles govern access to live views,
  audit trails, exports, health surfaces, and administrative controls.
- **Role Semantics**: Operators can monitor, filter, export approved data, and
  work incident surfaces; Developers can inspect canonical and raw diagnostic
  details needed for debugging; Admins can manage access policy, export policy,
  runtime controls, and other privileged operational controls.
- **Role-Visible Differences**: Raw source payload access, source-native
  diagnostic detail, export scope, live subscription scope, privileged audit
  visibility, and access to privileged administrative controls are explicitly
  role-scoped so users can see only the level of detail and control their role
  permits.
- **Capability Source of Truth**: The effective capability result for a user,
  including authorized strategy scope, allowed export resources or scopes, live
  subscription detail level, raw payload visibility, privileged audit access,
  and admin-control rights, MUST come from a shared contract-backed policy
  result used by both visible UI gating and backend enforcement.
- **Admin Control Surfaces**: Authorized admins can manage access or export
  policy through `/admin/access-policies` and manage runtime flag state through
  the feature-flag control surface, with explicit validation errors and audit
  visibility for every successful or rejected mutation.
- **Secret Handling**: The browser only accesses the internal dashboard
  application. All RabbitMQ credentials, Kalshi credentials, signing material,
  API tokens, and other secret-bearing service access remain server-side only,
  and the browser never connects directly to RabbitMQ, Kalshi, or other
  secret-bearing services.

### Live/Historical Parity & Integrity

- **Live Surface**: Overview, strategy detail, decision, trade, skip, PnL,
  operations, and incident screens show current known facts as they arrive.
- **Historical Record**: Searchable retained history preserves the same business
  entities and lifecycle facts so users can revisit past events and audit them.
- **Identifiers/Timestamps/Source Metadata**: `correlation_id` is the canonical
  lifecycle identifier across decisions, trades, retries, fills, skips, alerts,
  and audit entries. Records also carry source-local aliases such as decision
  ids, trade ids, order ids, publisher order ids, command event ids, client
  order ids, external order ids, Kalshi ids, strategy identifiers, symbol,
  market, timestamps for each stage, routing keys, queue and exchange metadata,
  retry counts, and final outcome.
- **Integrity Rules**: The dashboard shows exact raw facts plus normalized
  derived states, converges live updates with persisted history, deduplicates by
  `source_system + source_event_name + source_event_id` when available, falls
  back to a deterministic semantic fingerprint when a stable source event id is
  absent, preserves canonical `correlation_id` stitching across the lifecycle,
  applies fixed canonical lifecycle stages for cross-system querying, and
  surfaces missing or degraded upstream data explicitly. Live decisions, trades,
  skips, alerts, and health events must reconcile into searchable history with
  stable identifiers and timestamps after reconnect, replay, backfill, or
  resync instead of diverging into separate live-only and historical-only
  truths.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require authenticated internal access before any
  non-public dashboard view, export, or detail state is available.
- **FR-001a**: System MUST keep all secrets and secret-bearing service access on
  the server side only, and MUST NOT allow the browser to connect directly to
  RabbitMQ, Kalshi, or any other privileged upstream service.
- **FR-002**: System MUST enforce role-based access control for Operator,
  Developer, and Admin users across strategies, diagnostics, exports, and
  operational controls.
- **FR-002a**: System MUST define Operator, Developer, and Admin role
  permissions explicitly so monitoring, raw diagnostic inspection, export,
  privileged audit visibility, live subscription detail, and privileged
  administration actions are separable and testable.
- **FR-002b**: System MUST record audit logs for authentication events, RBAC
  denials, data exports, incident acknowledgements, access policy changes,
  export policy changes, feature-flag updates, and other privileged operational
  actions.
- **FR-002c**: Operators MUST be able to access normalized live subscriptions,
  historical views, incident surfaces, and only the export scope approved for
  their authorized strategies, but MUST NOT receive raw source payload access,
  debug-level live subscription detail, privileged audit-log visibility, or
  privileged administrative controls.
- **FR-002d**: Developers MUST be able to access all operator-visible surfaces
  for their authorized strategies plus raw source payloads, source-native
  diagnostic detail, debug-level live subscription detail, and deeper lifecycle
  debugging surfaces needed to diagnose upstream issues, while remaining limited
  to the export scope and audit visibility explicitly granted by policy.
- **FR-002e**: Admins MUST be able to access developer-visible surfaces plus
  access policy controls, export policy controls, feature-flag controls,
  privileged audit-log visibility, and other privileged administrative actions.
- **FR-002f**: Live subscriptions, historical searches, exports, raw payload
  access, privileged audit visibility, and administrative surfaces MUST all be
  filtered by role, effective capability result, and strategy scope so
  unauthorized detail never appears in normal navigation, live feeds, exports,
  or deep-linked states.
- **FR-002g**: System MUST expose a contract-backed effective capability result
  for the authenticated user, including authorized strategy scope, raw payload
  visibility, live subscription detail level, allowed export resources or
  scopes, privileged audit visibility, and available administrative controls,
  and MUST use that same evaluated result for UI gating and backend
  authorization.
- **FR-002h**: System MUST provide an admin access and export policy management
  surface at `/admin/access-policies` where authorized admins can view, create,
  update, and audit policy changes affecting role scope, strategy scope, export
  scope or resources, live subscription detail, and privileged audit access.
- **FR-002i**: System MUST validate access policy, export policy, and
  feature-flag mutations before they are applied, MUST show validation errors
  explicitly, and MUST prevent partially applied or ambiguous admin changes.
- **FR-002j**: System MUST provide round-trip feature-flag administration so
  authorized admins can view current flag state, update flags, see validation
  errors when a change is invalid, and inspect who changed what and when.
- **FR-003**: System MUST unify live and historical visibility across
  `../kalshi-btc-quant`, `../kalshi-eth-quant`, `../kalshi-sol-quant`,
  `../kalshi-xrp-quant`, `../kalshi-integration-event-publisher`, and
  `../kalshi-integration-executor`.
- **FR-003a**: System MUST treat only repositories following the
  `kalshi-${cryptoSymbol}-quant` naming convention as strategy repos eligible
  for strategy lists, strategy detail views, and side-by-side strategy
  comparison.
- **FR-003b**: System MUST normalize upstream message shapes into a fixed
  canonical event taxonomy with event families for decisions, trades, trade
  intents, skips, publisher events, queue metrics, executor events, fills,
  position snapshots, PnL snapshots, heartbeats, alerts, and audit events.
- **FR-003c**: System MUST deduplicate normalized records by source-stable event
  identity composed of `source_system + source_event_name + source_event_id`
  when available, and MUST fall back to a deterministic semantic fingerprint
  when a stable source event id is absent.
- **FR-003d**: System MUST support current-state compatibility through mixed
  ingestion from the centralized publisher/RabbitMQ path plus direct strategy
  collectors where a connected `kalshi-${cryptoSymbol}-quant` repository does
  not yet publish all required facts through the centralized path.
- **FR-003e**: System MUST support future-state convergence in which strategies
  may later move onto the centralized publisher/RabbitMQ path, but MUST NOT
  require that convergence before the dashboard can show complete visibility for
  the current connected strategies.
- **FR-004**: System MUST show every live trade decision generated by each
  connected quant strategy.
- **FR-005**: System MUST show every trade intent, submitted trade, fill,
  update, and terminal result associated with a decision or trade lifecycle.
- **FR-006**: System MUST show every skipped trade together with its skip
  taxonomy and exact known reason.
- **FR-006a**: System MUST treat skip-only and no-trade diagnostics from
  connected strategy systems as first-class upstream inputs and MUST display
  them explicitly rather than inferring them from missing downstream order
  events.
- **FR-007**: System MUST show why a trade was skipped, delayed, retried,
  rejected, or dead-lettered, including the stage where that status occurred.
- **FR-008**: System MUST show the end-to-end lifecycle of a decision from
  strategy emission through publisher, RabbitMQ, executor, Kalshi submission,
  and terminal result.
- **FR-008a**: Lifecycle views MUST reflect the actually observed upstream path
  for each decision or trade and MUST NOT present direct strategy-collector
  facts as though they had already flowed through the centralized
  publisher/RabbitMQ path when they did not.
- **FR-009**: System MUST provide an overview dashboard with global health,
  aggregate PnL, live decision feed, live trade feed, skip count, queue health,
  and recent alerts.
- **FR-009a**: The first page shown after successful authentication MUST be the
  overview dashboard, and that landing view MUST prioritize global health,
  active alerts, aggregate PnL, live decision feed, live trade feed, skip
  count, and queue health in the initial operator viewport.
- **FR-010**: System MUST provide strategy list and strategy detail pages for
  BTC, ETH, SOL, XRP, and future onboarded strategies.
- **FR-010a**: System MUST represent the publisher, executor, and RabbitMQ only
  as operational pipeline components and dependency surfaces, not as strategy
  entries.
- **FR-010b**: Onboarding a new strategy MUST be achievable through strategy
  configuration, source-contract mapping, and shared reusable UI composition,
  without requiring a hard-coded per-asset page type, bespoke monitoring flow,
  or asset-specific collector rewrite in the product surface.
- **FR-011**: System MUST provide a filterable and searchable decisions page
  with deep-linkable detail state and a detail drawer.
- **FR-011a**: The decisions page MUST support server-side filtering by
  strategy, symbol, market, time range, lifecycle stage, degraded-state flag,
  and canonical identifiers, full-text search over supported identifiers and
  reason fields, default sort by newest event time descending, and deep-linkable
  query state.
- **FR-012**: System MUST provide a filterable and searchable trades and order
  lifecycle page with deep-linkable detail state and a detail drawer.
- **FR-012a**: The trades and order lifecycle page MUST support server-side
  filtering by strategy, symbol, market, status, lifecycle stage, time range,
  degraded-state flag, and canonical identifiers, full-text search over
  supported identifiers and reason fields, default sort by newest event time
  descending, and deep-linkable query state.
- **FR-013**: System MUST provide a skipped trades page with skip taxonomy and
  root-cause breakdown views.
- **FR-013a**: System MUST normalize skipped-trade reasons into a canonical
  `skip_category` plus optional `skip_code` for cross-strategy reporting while
  preserving the raw skip reason text for operator diagnostics.
- **FR-014**: System MUST provide a PnL analytics page with summaries, time
  series, attribution, and win/loss metrics for 24h, 7d, 30d, MTD, YTD,
  all-time, and custom date ranges.
- **FR-014a**: System MUST define `realized_pnl` as net of allocated fees on
  quantity that has actually closed or settled, and MUST define
  `unrealized_pnl` as net mark-to-market on quantity that remains open.
- **FR-014b**: System MUST expose fees as separate values alongside net PnL so
  operators can inspect both net and fee components.
- **FR-014c**: System MUST treat the market-position lifecycle as the canonical
  attribution unit for PnL and roll that unit up into strategy, symbol, market,
  and aggregate portfolio views.
- **FR-014d**: System MUST calculate PnL buckets in UTC, with `24h`, `7d`, and
  `30d` defined as rolling UTC windows, `MTD` and `YTD` defined as UTC calendar
  buckets, and local timezone selection affecting timestamp display only.
- **FR-014e**: System MUST define `all-time` PnL as the span from the earliest
  retained canonical PnL record through the query evaluation time.
- **FR-014f**: System MUST continue showing the last successfully computed PnL
  values when inputs are stale or partial, but MUST label affected strategy,
  market, symbol, and portfolio totals as `stale` or `partial` with freshness
  timestamps and degraded-state indicators.
- **FR-014g**: System MUST compute custom-range realized PnL by canonical
  realization timestamp within the selected UTC range and MUST compute
  custom-range unrealized PnL as the mark on still-open quantity at the range
  end timestamp.
- **FR-015**: System MUST allow side-by-side comparison of BTC, ETH, SOL, XRP,
  and future strategies using the same core workflows and metrics.
- **FR-015a**: Compare mode MUST allow selection of multiple strategies and
  apply the same time range, metric definitions, and drill-down behavior across
  all selected strategies in one synchronized view.
- **FR-016**: System MUST provide per-decision and per-trade audit trails with
  correlation IDs, timestamps, routing keys, queue and exchange metadata, order
  IDs, Kalshi IDs, retry counts, and final outcome.
- **FR-016a**: System MUST treat `correlation_id` as the single canonical
  lifecycle key across decisions, trades, retries, fills, skips, alerts, and
  audit entries, while preserving all other source-specific identifiers as
  searchable aliases.
- **FR-017**: System MUST provide a pipeline and RabbitMQ operations page that
  visualizes event flow and bottlenecks, including queue depth, consumer count,
  oldest message age, DLQ size, publish failures, unroutable events, and
  reconnect status.
- **FR-018**: System MUST provide alerts/incidents and system health pages for
  missing heartbeats, stuck queues, growing DLQs, failed consumers, stale PnL,
  ingest failures, and missing terminal events.
- **FR-018a**: System MUST evaluate explicit configurable alert conditions for
  queue backlog age, queue depth, DLQ size or growth, missing heartbeats, stale
  consumer activity, ingest failures, and live reconnect degradation.
- **FR-018b**: Alerts MUST be reachable from the overview, alerts list,
  strategy detail, and pipeline or operations pages with consistent severity,
  component, freshness, and status context preserved across those entry points.
- **FR-019**: System MUST support live updates, historical search, CSV export,
  and deep-linking to decision and trade detail states.
- **FR-019b**: CSV export MUST apply the active filters, search terms, sort
  order, time range, timezone display choice, and compare selection for the
  current page and MUST export all authorized rows matching the current query,
  not only the currently visible page.
- **FR-019c**: Deep links MUST preserve the active route, filters, search
  terms, sort order, time range, timezone selection, compare selection, and any
  selected drawer or detail-page state.
- **FR-019d**: Live decision feeds, live trade feeds, and other streaming views
  MUST provide explicit pause and resume controls that freeze visible updates
  while paused and resume missed events in canonical order.
- **FR-019e**: Decision, trade, alert, and comparable investigative records
  MUST be reachable both as in-context detail drawers and as dedicated
  deep-linkable detail pages, including alert detail pages at
  `/alerts/:alertId`.
- **FR-019f**: Overview, alerts list, strategy detail, and pipeline or
  operations pages MUST provide direct navigation into the corresponding alert
  drawer and the dedicated `/alerts/:alertId` page without losing the
  surrounding query context.
- **FR-019a**: System MUST preserve the last known valid live data during stream
  interruption, surface reconnect state with freshness timestamps, and resume
  live updates without silently clearing affected views.
- **FR-020**: System MUST support both UTC and local time display across pages,
  drawers, and exported outputs.
- **FR-021**: System MUST never invent state from partial data and MUST instead
  show exact known facts and normalized derived states with explicit degraded
  markers where data is missing.
- **FR-021a**: System MUST preserve the raw source event name and raw source
  payload for every normalized record so operators and developers can compare
  canonical facts against the original upstream message shape.
- **FR-021b**: System MUST assign fixed canonical lifecycle stages for
  cross-system querying and timelines while preserving source-specific statuses,
  publisher statuses, executor result names, and terminal outcome details as
  metadata.
- **FR-021c**: Live decisions, trades, skips, alerts, and health events that a
  user sees in real time MUST reconcile into searchable history with stable
  identifiers and timestamps after reconnect, replay, backfill, or resync.
- **FR-022**: System MUST ensure duplicated upstream messages do not create
  duplicated facts in live or historical views.
- **FR-023**: System MUST make every decision and trade traceable across systems
  through correlation identifiers and related audit metadata.
- **FR-024**: System MUST make loading, empty, error, reconnecting, and
  degraded modes first-class on every core view.
- **FR-024a**: Every filterable or searchable page MUST preserve the current
  query controls and selected sort while showing loading, empty, error,
  reconnecting, unauthorized, not-found, or degraded states.
- **FR-024b**: Empty states MUST distinguish between no data yet, no results for
  the current query, and unavailable data caused by degraded upstream state.
- **FR-025**: System MUST be usable on desktop-first layouts while remaining
  workable on tablet-width screens.
- **FR-026**: System MUST support local testing with seeded or sample data and a
  real integration environment so teams can validate live and historical
  behavior before release.
- **FR-027**: System MUST be production-ready for internal use and MUST NOT rely
  on demo-only, scaffold-only, or mock-only behavior for required workflows.

### Key Entities *(include if feature involves data)*

- **Strategy**: A monitored quant system such as BTC, ETH, SOL, XRP, or a
  future onboarded asset, including identity, status, and comparative metrics,
  sourced only from repositories that follow the `kalshi-${cryptoSymbol}-quant`
  naming convention.
- **Strategy Source Compatibility Mode**: The current source-path state for a
  strategy, distinguishing centralized publisher/RabbitMQ-fed facts from direct
  strategy-collected facts where full upstream convergence has not yet occurred.
- **Decision**: A strategy-emitted trading decision with its rationale context,
  timestamps, a canonical `correlation_id`, and downstream lifecycle references.
- **Trade Lifecycle Record**: The full sequence of intent, submission, update,
  fill, retry, rejection, dead-letter, and terminal outcome facts tied to a
  decision or order and stitched by canonical `correlation_id`.
- **Canonical Event Record**: A normalized record stored under one fixed event
  family with a canonical `correlation_id`, source repository identity, source
  event name, raw payload, timestamps, aliases, deduplication identity, and any
  derived state fields used for cross-repo querying.
- **Canonical Lifecycle Stage**: A fixed cross-system stage assigned to a
  normalized record so decisions, trade intents, publisher events, executor
  results, fills, and terminal outcomes can be stitched into one queryable
  timeline without discarding source-native statuses.
- **Skip Event**: A recorded non-execution outcome that captures skip taxonomy,
  canonical `skip_category`, optional `skip_code`, raw skip reason text, stage,
  timing, and affected strategy or market context, including explicit skip-only
  and no-trade diagnostics that are emitted without a downstream order event.
- **PnL Snapshot**: A performance record for a strategy, symbol, market, or
  portfolio over a defined time range with trend and attribution context,
  including net realized PnL on closed or settled quantity, net unrealized PnL
  on open quantity, separate fee values, UTC bucket semantics, freshness or
  partiality status, custom-range end-time valuation semantics, and rollups
  derived from market-position lifecycle attribution.
- **Pipeline Health Signal**: A health or freshness fact about the publisher,
  RabbitMQ, consumer population, executor, ingestion, or terminal event flow,
  including queue depth, backlog age, DLQ size or growth, heartbeat freshness,
  consumer freshness, reconnect status, and ingest health.
- **Alert/Incident**: A visible operational condition with severity, component,
  first-seen time, current status, triggering condition, threshold context, and
  resolution history.
- **Access/Export Policy**: An admin-managed policy that defines which users or
  roles can access which strategies, what live subscription detail they may
  receive, what export resources or scopes they may use, whether privileged
  audit visibility is allowed, and how those rules are audited over time.
- **Effective Capability Result**: The evaluated permission outcome presented to
  the user session and enforced by the product, including role, strategy scope,
  raw payload visibility, live subscription detail, allowed export resources or
  scopes, privileged audit visibility, and available admin controls.
- **Feature Flag State**: An admin-managed runtime control that records current
  state, scope, validation outcome, and change history for a product behavior
  gate.
- **Audit Trail Entry**: A timestamped fact tied to a decision, trade, health
  condition, alert, auth event, RBAC denial, export action, or privileged
  operation that supports end-to-end traceability and investigation, keyed by
  canonical `correlation_id` plus source-local aliases when applicable.

### Observability, Performance & UX Requirements

- **OP-001**: System MUST emit structured logs, metrics, and traces for
  decision lifecycle visibility, ingestion, alert evaluation, and operator
  query flows.
- **OP-002**: System MUST expose health checks and alertable failure states for
  the publisher, queueing layer, consumers, executor path, ingest path, and PnL
  freshness monitoring.
- **OP-003**: System MUST emit audit logs for authentication outcomes, RBAC
  denials, data export actions, alert or incident state changes, access or
  export policy changes, feature-flag updates, and privileged operator or
  administrator actions.
- **PF-001**: System MUST use server-side filtering, pagination, aggregation, or
  bounded time ranges for decisions, trades, skips, alerts, audit trails, and
  analytics views.
- **PF-002**: UI MUST support stable comparison and navigation for large
  datasets without requiring users to load unbounded history into a single view.
- **PF-003**: High-volume tables and timelines MUST use table virtualization or
  equivalent bounded rendering and MUST keep query sizes server-bounded.
- **PF-004**: Large dataset handling MUST preserve filters, sorting, and deep
  links across paginated navigation without requiring full-history browser
  loads.
- **UX-001**: UI MUST provide keyboard-accessible and screen-reader-friendly
  loading, empty, error, reconnecting, and degraded-data states for every core
  dashboard view.
- **UX-002**: UI MUST provide a consistent dark-theme experience appropriate for
  prolonged operational monitoring.
- **UX-003**: Reconnecting views MUST show the last successful update time, the
  current reconnect state, and whether visible data is degraded or stale.
- **UX-004**: Filterable pages MUST make active filters, search terms, sort
  order, timezone selection, and compare-mode context visible without requiring
  the user to reopen a settings surface.
- **UX-005**: Table-driven pages MUST support in-context inspection through
  drawers without losing list position, while full-page detail routes present
  the same canonical information for shared links and direct navigation.

### Testing & Documentation Requirements

- **TD-001**: System MUST include unit tests for lifecycle normalization, PnL
  aggregation, alert evaluation, and other critical decision-support logic.
- **TD-002**: System MUST include integration tests covering data flow from the
  connected quant, publisher, executor, mixed-ingestion compatibility paths,
  and effective capability enforcement flows into dashboard views.
- **TD-003**: System MUST include contract tests for decision, trade, skip,
  health, alert, analytics, access-policy, feature-flag, session-capability,
  and mixed-source compatibility schemas shared across producers and consumers.
- **TD-004**: System MUST include end-to-end tests for operator overview,
  lifecycle tracing, PnL analysis, skip analysis, alert deep-link navigation,
  incident investigation workflows, and admin access-policy or feature-flag
  management workflows.
- **TD-005**: System MUST update local setup docs, environment docs, schema
  docs, runbooks, and troubleshooting guides before the feature is considered
  complete.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In controlled operator test sessions, users can determine the
  current state of each active strategy, current aggregate PnL, and current
  pipeline health in under 60 seconds in at least 95% of attempts.
- **SC-002**: In controlled diagnostic test sessions, users can trace a single
  decision or trade from initial strategy emission to terminal outcome without
  reading raw logs in at least 95% of attempts.
- **SC-003**: During validation windows, 100% of displayed live decisions and
  trade lifecycle events, skip events, alerts, and health events become
  searchable in historical views with matching identifiers and timestamps once
  persistence is complete, including after reconnect, replay, backfill, or
  resync.
- **SC-004**: Users can compare at least four strategies side-by-side across the
  required PnL and skip-analysis views and complete a filtered export workflow
  without leaving the dashboard.
- **SC-005**: A newly onboarded strategy can appear in overview, strategy,
  decision, trade, skip, analytics, and incident workflows through configuration
  and contract mapping alone, with no new page type, hard-coded asset UI, or
  bespoke monitoring flow.
- **SC-006**: In role-validation test sessions, operator, developer, and admin
  accounts each see only the live subscriptions, raw payload detail, export
  resources or scope, privileged audit visibility, and administrative surfaces
  permitted for that role, with no unauthorized access exposure during normal
  navigation, live delivery, export, or deep-linked access.
- **SC-007**: In controlled admin-validation sessions, authorized admins can
  successfully view and update access or export policy and feature-flag state,
  receive explicit validation errors for invalid changes, and confirm that every
  accepted change records who changed what and when in 100% of attempts.

## Assumptions

- The primary users are internal operators, developers, and administrators who
  need authenticated access to trading observability data.
- The initial release focuses on visibility, diagnostics, alerting, and
  investigation rather than manual order placement or strategy editing.
- Effective user capabilities, allowed export resources or scopes, and
  privileged audit visibility are expected to be derived from an internal
  contract-backed policy source of truth rather than inferred ad hoc from UI
  state.
- Connected sibling systems continue to emit or make available identifiable
  decision, trade, health, and PnL data needed for a unified dashboard.
- Future strategies are introduced as new repositories following the
  `kalshi-${cryptoSymbol}-quant` convention rather than as arbitrary repo names.
- In the current state, some connected strategy repositories may expose part of
  their required dashboard facts through the centralized publisher/RabbitMQ path
  while others still require direct strategy collectors for decisions, skips,
  positions, health, or PnL visibility.
- Over time, strategies may converge onto the centralized publisher/RabbitMQ
  path, but the dashboard requirements apply before and after that convergence
  and therefore must not assume the migration is already complete.
- Skip-only and no-trade diagnostics remain available as explicit upstream
  inputs rather than being derived solely from the absence of downstream order
  events.
- Onboarding a new strategy is expected to be configuration- and
  contract-mapping-driven rather than dependent on a new hard-coded asset page
  or a bespoke monitoring flow.
- Historical retention is sufficient to support all-time views, audits,
  incident review, and comparison over custom date ranges.
- Desktop is the primary operating environment, while tablet-width layouts are
  required for secondary use; phone-first workflows are out of scope.
- Local development and test environments can use seeded or sample data sets in
  addition to real integration testing against centralized RabbitMQ-backed flows
  and any direct strategy-collector compatibility paths required by the current
  upstream state.

## Operational Readiness Checklist *(mandatory)*

- [x] Contracts are shared between producers and consumers and enforced at
      runtime.
- [x] Auth and RBAC changes are documented and tested.
- [x] Live and historical representations are mapped with stable identifiers and
      metadata.
- [x] Idempotency, replay, deduplication, and degraded-data handling are
      specified.
- [x] Logging, metrics, tracing, health checks, and alerts are specified.
- [x] Performance bounds, pagination strategy, and virtualization needs are
      specified.
- [x] Accessibility states and dark-theme expectations are specified.
- [x] Required tests and documentation updates are in scope.
