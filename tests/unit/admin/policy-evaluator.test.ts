import { describe, expect, test } from "vitest";

import { PolicyEvaluator } from "../../../apps/api/src/auth/policy-evaluator.js";

describe("policy evaluator", () => {
  test("grants developer admin surfaces and export scope when policy allows them", () => {
    const evaluator = new PolicyEvaluator();
    const resolved = evaluator.resolve({
      roleBindings: [{ role: "developer", strategyScope: ["btc", "eth"] }],
      policyRules: [
        {
          ruleType: "admin_surface",
          effect: "allow",
          adminSurfaces: ["feature_flags", "access_policies"]
        }
      ],
      exportGrants: [
        {
          resource: "trades",
          strategyScope: ["btc"],
          columnProfile: "detailed"
        }
      ],
      policies: [{ accessPolicyId: "policy-1", version: 1 }],
      resolvedAt: "2026-04-11T12:00:00Z"
    });

    expect(resolved.canManageFeatureFlags).toBe(true);
    expect(resolved.canManageAccessPolicies).toBe(true);
    expect(resolved.allowedExportResources[0]).toMatchObject({
      resource: "trades",
      strategyScope: ["btc"]
    });
  });
});
