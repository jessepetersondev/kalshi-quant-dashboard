# RBAC Surface Matrix

## Role Definitions

- `operator`: monitor authorized strategies, investigate normalized lifecycles,
  export approved operational views, and work alerts or incidents.
- `developer`: operator capabilities plus raw source payload inspection,
  source-native diagnostic detail, and debug-level live subscription detail for
  authorized strategies, subject to policy.
- `admin`: developer capabilities plus access-policy administration,
  feature-flag administration, alert-rule administration, and privileged
  audit-log visibility, subject to policy.

## Resolution Model

- `role_binding` establishes the base role and coarse strategy scope.
- `access_policy` and `access_policy_rule` can further allow or deny:
  - strategy scope
  - raw payload visibility
  - debug SSE access
  - privileged audit visibility
  - admin surfaces
- `export_scope_grant` is the source of truth for `allowedExportResources`.
- `effectiveCapability` is the single evaluated result returned by session
  bootstrap and reused by REST, SSE, export, and admin-route enforcement.

## Surface Matrix

| Surface | Operator | Developer | Admin |
|---|---|---|---|
| Overview, strategy list, strategy detail | Allow within effective strategy scope | Allow within effective strategy scope | Allow within effective strategy scope |
| Decisions, trades, skips, PnL, operations, alerts lists | Allow within effective strategy scope | Allow within effective strategy scope | Allow within effective strategy scope |
| Decision, trade, and alert detail summaries | Allow within effective strategy scope | Allow within effective strategy scope | Allow within effective strategy scope |
| Raw source payloads on detail endpoints | Deny | Allow only when `canViewRawPayloads` is true | Allow only when `canViewRawPayloads` is true |
| Source-native debug metadata on detail endpoints | Deny | Allow only when `detailLevelMax = debug` | Allow only when `detailLevelMax = debug` |
| CSV export of approved resources | Allow only for resources in `allowedExportResources` | Allow only for resources in `allowedExportResources` | Allow only for resources in `allowedExportResources` |
| Export of privileged or raw-payload columns | Deny | Allow only when an export grant includes the privileged column profile | Allow only when an export grant includes the privileged column profile |
| Live SSE `detailLevel=standard` | Allow within effective strategy scope | Allow within effective strategy scope | Allow within effective strategy scope |
| Live SSE `detailLevel=debug` | Deny | Allow only when `detailLevelMax = debug` | Allow only when `detailLevelMax = debug` |
| Admin alert-rule pages and endpoints | Deny | Deny unless explicitly granted by policy | Allow when `canManageAlertRules` is true |
| Admin feature-flag pages and endpoints | Deny | Deny unless explicitly granted by policy | Allow when `canManageFeatureFlags` is true |
| Admin access-policy pages and endpoints | Deny | Deny unless explicitly granted by policy | Allow when `canManageAccessPolicies` is true |
| Privileged audit-log endpoints | Deny | Allow only when `canViewPrivilegedAuditLogs` is true | Allow only when `canViewPrivilegedAuditLogs` is true |

## API and Contract Implications

- `GET /api/auth/session` returns `effectiveCapability` with:
  - `resolvedRole`
  - `strategyScope`
  - `detailLevelMax`
  - `canViewRawPayloads`
  - `canViewPrivilegedAuditLogs`
  - `canManageAlertRules`
  - `canManageFeatureFlags`
  - `canManageAccessPolicies`
  - `allowedExportResources`
  - `resolutionVersion`
- Detail endpoints return normalized summaries to all authorized roles, but
  `rawPayloads` and `debugMetadata` are omitted unless the effective capability
  result allows them.
- SSE supports `detailLevel=standard|debug`, but the request is validated
  against `effectiveCapability.detailLevelMax`.
- Export endpoints validate the requested resource and column profile against
  `allowedExportResources`.
- Admin mutation endpoints require the corresponding capability flag and return
  validation or conflict responses for invalid or stale updates.

## Mutation and Audit Expectations

- Access-policy creation and update are admin-only surfaces.
- Feature-flag updates are admin-only surfaces.
- Alert-rule updates remain admin-controlled.
- Accepted and rejected admin mutations create `audit_log` records with actor,
  target, before-state, after-state when applicable, result, and reason.

## Denial-Path Expectations

- Unauthorized deep links must not leak hidden record existence through payload
  shape, count, or searchable aliases.
- Operators requesting `detailLevel=debug` receive `403`, not a silent
  downgrade.
- Export requests for resources outside `allowedExportResources` receive `403`.
- Users who lose policy access after a mutation must not continue receiving
  unauthorized live updates or privileged detail on subsequent requests.
- `/admin/access-policies` and `/admin/feature-flags` return `403` unless the
  effective capability result includes those controls.

## Required Negative-Path Validation

- Operator cannot access raw payload detail on decisions, trades, alerts, or
  operations.
- Operator cannot subscribe to debug SSE detail.
- Operator cannot access `/api/admin/access-policies`,
  `/api/admin/feature-flags`, or privileged audit-log endpoints.
- Developer cannot mutate access policies or feature flags unless a policy
  explicitly grants that surface.
- Deep links to `/alerts/:alertId`, decision detail, or trade detail return
  `403` when the underlying strategy is outside effective scope.
- Access-policy and feature-flag mutation endpoints return `422` for validation
  failures and `409` for version conflicts.
