# Session and Effective Capability Contract

## Purpose

Define the contract-backed source of truth used by both frontend UI gating and
backend enforcement for session-scoped authorization decisions.

## Inputs

The effective capability result is resolved from:

- one or more active `role_binding` records for the authenticated user
- zero or more enabled matching `access_policy` records
- enabled `access_policy_rule` records for those policies
- enabled `export_scope_grant` records attached to matching policies

## Resolution Order

1. Resolve the authenticated principal to a `user_id`.
2. Load active `role_binding` rows and determine the base role and coarse
   `strategyScope`.
3. Load enabled matching access policies by `subject_type`, `subject_key`, and
   `precedence`.
4. Apply deny rules before allow rules within the same precedence level.
5. Intersect export grants with the resolved strategy scope.
6. Emit one versioned effective capability payload.

## Effective Capability Payload

`/api/auth/session` returns an `effectiveCapability` object with:

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
- `resolvedAt`

## `allowedExportResources`

Each entry contains:

- `resource`
- `strategyScope`
- `columnProfile`

`allowedExportResources` is the durable source of truth for:

- whether an export button is visible in the UI
- which resources a caller may export
- whether privileged columns are allowed for that export

## Enforcement Expectations

- REST detail endpoints use the effective capability result to determine whether
  raw payloads and privileged audit data are included.
- SSE uses the effective capability result to determine permitted
  `detailLevel` and strategy scope.
- Export endpoints reject resources not present in `allowedExportResources`.
- Admin routes require both admin role eligibility and the corresponding
  capability flag.

## Denial and Mutation Semantics

- `403` when a route, export, or stream exceeds the effective capability result.
- `422` when an admin mutation payload fails validation.
- `409` when an admin mutation uses a stale version.
- Accepted and rejected admin mutations both create `audit_log` entries.

## Verification Expectations

- Operator sessions never receive raw payloads, privileged audit access, or
  debug SSE subscriptions.
- Developer sessions may receive raw payloads and debug SSE only within policy
  scope.
- Admin sessions may mutate access policies and feature flags only when the
  effective capability result includes those controls.
