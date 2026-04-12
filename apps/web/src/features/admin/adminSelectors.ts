import type { SessionResponse } from "@kalshi-quant-dashboard/contracts";

export function canManageAccessPolicies(session: SessionResponse | undefined): boolean {
  return Boolean(session?.effectiveCapability.canManageAccessPolicies);
}

export function canManageFeatureFlags(session: SessionResponse | undefined): boolean {
  return Boolean(session?.effectiveCapability.canManageFeatureFlags);
}

export function canManageAlertRules(session: SessionResponse | undefined): boolean {
  return Boolean(session?.effectiveCapability.canManageAlertRules);
}

export function canViewPrivilegedAudit(session: SessionResponse | undefined): boolean {
  return Boolean(session?.effectiveCapability.canViewPrivilegedAuditLogs);
}
