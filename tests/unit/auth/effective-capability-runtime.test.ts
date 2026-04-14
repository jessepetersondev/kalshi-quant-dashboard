import { describe, expect, test, vi } from "vitest";

import { createRuntimeConfig } from "@kalshi-quant-dashboard/config";

import { CapabilityCache } from "../../../apps/api/src/auth/capability-cache.js";
import { EffectiveCapabilityResolver } from "../../../apps/api/src/auth/effective-capability-resolver.js";
import { ExportScopeResolver } from "../../../apps/api/src/auth/export-scope-resolver.js";

describe("effective capability runtime helpers", () => {
  test("resolve and cache sessions by login and invalidate them by user id", async () => {
    const resolver = {
      resolveByLogin: vi
        .fn()
        .mockResolvedValue({
          principal: {
            userId: "user-admin",
            email: "admin@example.internal",
            displayName: "Admin"
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
                resource: "trades",
                strategyScope: ["*"],
                columnProfile: "raw_payload"
              }
            ],
            resolutionVersion: "roles=admin;policies=seed",
            resolvedAt: "2026-04-13T20:00:00.000Z"
          },
          issuedAt: "2026-04-13T20:00:00.000Z"
        })
    };

    const cache = new CapabilityCache(
      createRuntimeConfig({ AUTH_MODE: "proxy" }),
      60_000
    ) as CapabilityCache & { resolver: typeof resolver };
    cache.resolver = resolver;

    const first = await cache.resolve("admin@example.internal");
    const second = await cache.resolve("admin@example.internal");
    expect(first?.authMode).toBe("proxy");
    expect(second?.issuedAt).toBe(first?.issuedAt);
    expect(resolver.resolveByLogin).toHaveBeenCalledTimes(1);

    cache.invalidate("user-admin");
    await cache.resolve("admin@example.internal");
    expect(resolver.resolveByLogin).toHaveBeenCalledTimes(2);

    cache.invalidate();
    await cache.resolve("admin@example.internal");
    expect(resolver.resolveByLogin).toHaveBeenCalledTimes(3);
  });

  test("resolve effective capability snapshots through the repo and evaluator", async () => {
    const repo = {
      resolveInputsForLogin: vi.fn().mockResolvedValue({
        principal: {
          userId: "user-dev",
          email: "developer@example.internal",
          displayName: "Developer"
        },
        roleBindings: [{ role: "developer", strategyScope: ["btc", "eth"] }],
        policyRules: [],
        exportGrants: [
          {
            resource: "trades",
            strategyScope: ["btc"],
            columnProfile: "detailed"
          }
        ],
        policies: [{ accessPolicyId: "policy-dev", version: 3 }]
      }),
      resolveInputsForUserId: vi.fn().mockResolvedValue(null),
      saveSnapshot: vi.fn().mockResolvedValue(undefined)
    };

    const resolver = new EffectiveCapabilityResolver(repo as never);
    const resolved = await resolver.resolveByLogin("developer@example.internal");

    expect(resolved?.principal.userId).toBe("user-dev");
    expect(resolved?.effectiveCapability.resolvedRole).toBe("developer");
    expect(resolved?.effectiveCapability.allowedExportResources).toEqual([
      {
        resource: "trades",
        strategyScope: ["btc"],
        columnProfile: "detailed"
      }
    ]);
    expect(repo.saveSnapshot).toHaveBeenCalledOnce();
    expect(await resolver.resolveByUserId("missing-user")).toBeNull();

    repo.resolveInputsForUserId.mockResolvedValueOnce({
      principal: {
        userId: "user-admin",
        email: "admin@example.internal",
        displayName: "Admin"
      },
      roleBindings: [{ role: "admin", strategyScope: ["*"] }],
      policyRules: [],
      exportGrants: [],
      policies: []
    });
    const byUserId = await resolver.resolveByUserId("user-admin");
    expect(byUserId?.effectiveCapability.resolutionVersion).toBe("roles=admin;policies=none");
  });

  test("resolve export scope without widening the granted capability", () => {
    const resolver = new ExportScopeResolver();

    const effectiveCapability = {
      resolvedRole: "developer",
      strategyScope: ["btc", "eth"],
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
        },
        {
          resource: "trades",
          strategyScope: ["btc"],
          columnProfile: "raw_payload"
        }
      ],
      resolutionVersion: "roles=developer;policies=none",
      resolvedAt: "2026-04-13T20:00:00.000Z"
    } as const;

    expect(
      resolver.resolve({
        effectiveCapability,
        resource: "trades",
        requestedColumnProfile: "summary",
        requestedStrategies: ["btc"]
      })
    ).toEqual({
      resource: "trades",
      columnProfile: "summary",
      strategyScope: ["btc"]
    });

    expect(
      resolver.resolve({
        effectiveCapability,
        resource: "trades",
        requestedColumnProfile: "raw_payload",
        requestedStrategies: ["eth"]
      })
    ).toBeNull();

    expect(
      resolver.resolve({
        effectiveCapability,
        resource: "alerts",
        requestedColumnProfile: "summary"
      })
    ).toBeNull();
  });
});
