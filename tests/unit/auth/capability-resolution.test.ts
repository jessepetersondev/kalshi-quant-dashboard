import { describe, expect, test } from "vitest";

import {
  intersectAllowedExportResources,
  isRoleAtLeast,
  maxRole,
  normalizeScope,
  resolveEffectiveCapability,
  scopeAllows
} from "@kalshi-quant-dashboard/auth";

describe("auth capability resolution", () => {
  test("resolve defaults, merge scopes, and enforce deny rules", () => {
    const resolved = resolveEffectiveCapability({
      roleBindings: [
        { role: "operator", strategyScope: ["btc", "eth"] },
        { role: "developer", strategyScope: ["eth", "sol"] }
      ],
      policyRules: [
        {
          ruleType: "strategy_scope",
          effect: "allow",
          strategyScope: ["xrp"]
        },
        {
          ruleType: "strategy_scope",
          effect: "deny",
          strategyScope: ["eth"]
        },
        {
          ruleType: "raw_payload",
          effect: "deny"
        },
        {
          ruleType: "debug_stream",
          effect: "deny"
        },
        {
          ruleType: "admin_surface",
          effect: "allow",
          adminSurfaces: ["feature_flags", "access_policies", "audit_logs"]
        }
      ],
      exportGrants: [
        {
          resource: "trades",
          strategyScope: ["btc", "eth", "xrp"],
          columnProfile: "detailed"
        }
      ],
      resolutionVersion: "test-resolution"
    });

    expect(resolved.resolvedRole).toBe("developer");
    expect(resolved.strategyScope).toEqual(["btc", "sol", "xrp"]);
    expect(resolved.detailLevelMax).toBe("standard");
    expect(resolved.canViewRawPayloads).toBe(false);
    expect(resolved.canManageFeatureFlags).toBe(true);
    expect(resolved.canManageAccessPolicies).toBe(true);
    expect(resolved.canViewPrivilegedAuditLogs).toBe(true);
    expect(resolved.allowedExportResources).toEqual([
      {
        resource: "trades",
        strategyScope: ["btc", "xrp"],
        columnProfile: "detailed"
      }
    ]);
    expect(resolved.resolutionVersion).toBe("test-resolution");
  });

  test("keep operator defaults when no bindings or grants are provided", () => {
    const resolved = resolveEffectiveCapability({
      roleBindings: [],
      policyRules: [],
      exportGrants: []
    });

    expect(resolved.resolvedRole).toBe("operator");
    expect(resolved.strategyScope).toEqual(["*"]);
    expect(resolved.detailLevelMax).toBe("standard");
    expect(resolved.allowedExportResources).toEqual([]);
  });

  test("cover scope and role helpers", () => {
    expect(maxRole("operator", "developer")).toBe("developer");
    expect(isRoleAtLeast("admin", "developer")).toBe(true);
    expect(isRoleAtLeast("operator", "developer")).toBe(false);

    expect(normalizeScope(undefined)).toEqual(["*"]);
    expect(normalizeScope(["eth", "btc", "eth"])).toEqual(["btc", "eth"]);
    expect(scopeAllows(["*"], "btc")).toBe(true);
    expect(scopeAllows(["btc", "eth"], "sol")).toBe(false);

    expect(
      intersectAllowedExportResources(["btc"], [
        {
          resource: "trades",
          strategyScope: ["btc", "eth"],
          columnProfile: "summary"
        },
        {
          resource: "alerts",
          strategyScope: ["sol"],
          columnProfile: "detailed"
        }
      ])
    ).toEqual([
      {
        resource: "trades",
        strategyScope: ["btc"],
        columnProfile: "summary"
      }
    ]);
  });
});
