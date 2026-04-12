import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  bootstrapTestDatabase,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";

import { buildApp } from "../../../apps/api/src/app.js";

describe.sequential("policy change reconnect handling", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    await bootstrapTestDatabase();
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
    await shutdownTestDatabase();
  });

  beforeEach(async () => {
    await resetFoundationalState();
    app.capabilityCache.invalidate();
  });

  test("refreshes session capability after access policy changes", async () => {
    const initial = await app.inject({
      method: "GET",
      url: "/api/auth/session",
      headers: { "x-dashboard-user": "developer@example.internal" }
    });

    await app.inject({
      method: "POST",
      url: "/api/admin/access-policies",
      headers: { "x-dashboard-user": "admin@example.internal" },
      payload: {
        policy: {
          subjectType: "user",
          subjectKey: "user-developer",
          name: "Developer feature flags",
          precedence: 100,
          enabled: true
        },
        rules: [
          {
            ruleType: "admin_surface",
            effect: "allow",
            adminSurfaces: ["feature_flags"],
            enabled: true
          }
        ],
        exportGrants: []
      }
    });

    const refreshed = await app.inject({
      method: "GET",
      url: "/api/auth/session",
      headers: { "x-dashboard-user": "developer@example.internal" }
    });

    expect(initial.json().effectiveCapability.canManageFeatureFlags).toBe(false);
    expect(refreshed.json().effectiveCapability.canManageFeatureFlags).toBe(true);
  });
});
