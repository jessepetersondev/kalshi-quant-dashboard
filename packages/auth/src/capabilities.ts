import { type AllowedExportResource, intersectAllowedExportResources } from "./export-scope.js";
import { isRoleAtLeast, maxRole, type Role } from "./roles.js";
import { normalizeScope, type StrategyScope } from "./scope.js";

export const detailLevels = ["standard", "debug"] as const;

export type DetailLevel = (typeof detailLevels)[number];

export interface RoleBindingInput {
  readonly role: Role;
  readonly strategyScope: readonly string[];
}

export interface PolicyRuleInput {
  readonly ruleType:
    | "strategy_scope"
    | "raw_payload"
    | "debug_stream"
    | "privileged_audit"
    | "admin_surface";
  readonly effect: "allow" | "deny";
  readonly strategyScope?: readonly string[];
  readonly adminSurfaces?: readonly (
    | "alert_rules"
    | "feature_flags"
    | "access_policies"
    | "audit_logs"
  )[];
}

export interface EffectiveCapability {
  readonly resolvedRole: Role;
  readonly strategyScope: StrategyScope;
  readonly detailLevelMax: DetailLevel;
  readonly canViewRawPayloads: boolean;
  readonly canViewPrivilegedAuditLogs: boolean;
  readonly canManageAlertRules: boolean;
  readonly canManageFeatureFlags: boolean;
  readonly canManageAccessPolicies: boolean;
  readonly allowedExportResources: readonly AllowedExportResource[];
  readonly resolutionVersion: string;
}

export interface CapabilityResolutionInput {
  readonly roleBindings: readonly RoleBindingInput[];
  readonly policyRules: readonly PolicyRuleInput[];
  readonly exportGrants: readonly AllowedExportResource[];
  readonly resolutionVersion?: string;
}

const defaultCapabilityByRole: Record<
  Role,
  Omit<
    EffectiveCapability,
    "resolvedRole" | "strategyScope" | "allowedExportResources" | "resolutionVersion"
  >
> = {
  operator: {
    detailLevelMax: "standard",
    canViewRawPayloads: false,
    canViewPrivilegedAuditLogs: false,
    canManageAlertRules: false,
    canManageFeatureFlags: false,
    canManageAccessPolicies: false
  },
  developer: {
    detailLevelMax: "debug",
    canViewRawPayloads: true,
    canViewPrivilegedAuditLogs: false,
    canManageAlertRules: false,
    canManageFeatureFlags: false,
    canManageAccessPolicies: false
  },
  admin: {
    detailLevelMax: "debug",
    canViewRawPayloads: true,
    canViewPrivilegedAuditLogs: true,
    canManageAlertRules: true,
    canManageFeatureFlags: true,
    canManageAccessPolicies: true
  }
};

export function resolveEffectiveCapability(
  input: CapabilityResolutionInput
): EffectiveCapability {
  const resolvedRole = input.roleBindings.reduce<Role>(
    (role, binding) => maxRole(role, binding.role),
    "operator"
  );
  const mergedScope = normalizeScope(
    input.roleBindings.flatMap((binding) => binding.strategyScope)
  );
  const defaults = defaultCapabilityByRole[resolvedRole];

  let detailLevelMax: DetailLevel = defaults.detailLevelMax;
  let canViewRawPayloads = defaults.canViewRawPayloads;
  let canViewPrivilegedAuditLogs = defaults.canViewPrivilegedAuditLogs;
  let canManageAlertRules = defaults.canManageAlertRules;
  let canManageFeatureFlags = defaults.canManageFeatureFlags;
  let canManageAccessPolicies = defaults.canManageAccessPolicies;
  let strategyScope = mergedScope;

  for (const rule of input.policyRules) {
    const allowed = rule.effect === "allow";

    if (rule.ruleType === "strategy_scope" && rule.strategyScope) {
      strategyScope = normalizeScope(
        allowed
          ? strategyScope[0] === "*"
            ? rule.strategyScope
            : [...strategyScope, ...rule.strategyScope]
          : strategyScope.filter((strategyId) => !rule.strategyScope?.includes(strategyId))
      );
      continue;
    }

    if (rule.ruleType === "raw_payload") {
      canViewRawPayloads = allowed && isRoleAtLeast(resolvedRole, "developer");
      continue;
    }

    if (rule.ruleType === "debug_stream") {
      detailLevelMax =
        allowed && isRoleAtLeast(resolvedRole, "developer") ? "debug" : "standard";
      continue;
    }

    if (rule.ruleType === "privileged_audit") {
      canViewPrivilegedAuditLogs = allowed && isRoleAtLeast(resolvedRole, "developer");
      continue;
    }

    if (rule.ruleType === "admin_surface" && rule.adminSurfaces?.length) {
      const enabled = allowed && isRoleAtLeast(resolvedRole, "developer");

      for (const adminSurface of rule.adminSurfaces) {
        if (adminSurface === "alert_rules") {
          canManageAlertRules = enabled;
        }

        if (adminSurface === "feature_flags") {
          canManageFeatureFlags = enabled;
        }

        if (adminSurface === "access_policies") {
          canManageAccessPolicies = enabled;
        }

        if (adminSurface === "audit_logs") {
          canViewPrivilegedAuditLogs = enabled;
        }
      }
    }
  }

  return {
    resolvedRole,
    strategyScope,
    detailLevelMax,
    canViewRawPayloads,
    canViewPrivilegedAuditLogs,
    canManageAlertRules,
    canManageFeatureFlags,
    canManageAccessPolicies,
    allowedExportResources: intersectAllowedExportResources(strategyScope, input.exportGrants),
    resolutionVersion: input.resolutionVersion ?? "seed-v1"
  };
}
