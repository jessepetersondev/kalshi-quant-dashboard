import { describe, expect, test } from "vitest";

import { sessionResponseSchema } from "@kalshi-quant-dashboard/contracts";

describe("foundational session capability contracts", () => {
  test("parse an effective capability response with allowed export resources", () => {
    const result = sessionResponseSchema.parse({
      session: {
        principal: {
          userId: "user-developer",
          email: "developer@example.internal",
          displayName: "Developer"
        },
        issuedAt: "2026-04-11T12:00:00Z",
        authMode: "dev"
      },
      effectiveCapability: {
        resolvedRole: "developer",
        strategyScope: ["btc", "eth", "sol", "xrp"],
        detailLevelMax: "debug",
        canViewRawPayloads: true,
        canViewPrivilegedAuditLogs: false,
        canManageAlertRules: false,
        canManageFeatureFlags: false,
        canManageAccessPolicies: false,
        allowedExportResources: [
          {
            resource: "trades",
            strategyScope: ["btc", "eth"],
            columnProfile: "detailed"
          }
        ],
        resolutionVersion: "roles=developer;policies=policy-developer-default:0",
        resolvedAt: "2026-04-11T12:00:00Z"
      }
    });

    expect(result.effectiveCapability.allowedExportResources[0]?.resource).toBe("trades");
  });
});
