import {
  resolveEffectiveCapability,
  type PolicyRuleInput,
  type RoleBindingInput
} from "@kalshi-quant-dashboard/auth";
import type { AllowedExportResource, EffectiveCapability } from "@kalshi-quant-dashboard/contracts";

function buildResolutionVersion(
  roleBindings: readonly RoleBindingInput[],
  policies: readonly { accessPolicyId: string; version: number }[]
): string {
  const rolePart = roleBindings.map((binding) => binding.role).sort().join("+") || "none";
  const policyPart =
    policies
      .map((policy) => `${policy.accessPolicyId}:${policy.version}`)
      .sort()
      .join("+") || "none";

  return `roles=${rolePart};policies=${policyPart}`;
}

export class PolicyEvaluator {
  resolve(args: {
    readonly roleBindings: readonly RoleBindingInput[];
    readonly policyRules: readonly PolicyRuleInput[];
    readonly exportGrants: readonly AllowedExportResource[];
    readonly policies: readonly { accessPolicyId: string; version: number }[];
    readonly resolvedAt?: string;
  }): EffectiveCapability {
    const resolved = resolveEffectiveCapability({
      roleBindings: args.roleBindings,
      policyRules: args.policyRules,
      exportGrants: args.exportGrants,
      resolutionVersion: buildResolutionVersion(args.roleBindings, args.policies)
    });

    return {
      ...resolved,
      strategyScope: [...resolved.strategyScope],
      allowedExportResources: resolved.allowedExportResources.map((entry) => ({
        ...entry,
        strategyScope: [...entry.strategyScope]
      })),
      resolvedAt: args.resolvedAt ?? new Date().toISOString()
    };
  }
}
