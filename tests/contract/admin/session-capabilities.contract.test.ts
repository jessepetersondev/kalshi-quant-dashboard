import { describe, expect, test } from "vitest";

import { sessionResponseSchema } from "@kalshi-quant-dashboard/contracts";

describe("admin session capability contracts", () => {
  test("parses session capability payloads with allowed export resources", () => {
    const session = sessionResponseSchema.parse({
      session: {
        principal: {
          userId: "user-admin",
          email: "admin@example.internal",
          displayName: "Admin"
        },
        issuedAt: "2026-04-11T12:00:00Z",
        authMode: "dev"
      },
      effectiveCapability: {
        resolvedRole: "admin",
        strategyScope: ["*"],
        detailLevelMax: "debug",
        canViewRawPayloads: true,
        canViewPrivilegedAuditLogs: true,
        canManageAlertRules: true,
        canManageFeatureFlags: true,
        canManageAccessPolicies: true,
        allowedExportResources: [
          {
            resource: "audit_logs",
            strategyScope: ["*"],
            columnProfile: "raw_payload"
          }
        ],
        resolutionVersion: "roles=admin;policies=seed",
        resolvedAt: "2026-04-11T12:00:00Z"
      }
    });

    expect(session.effectiveCapability.allowedExportResources[0]?.resource).toBe("audit_logs");
  });
});
