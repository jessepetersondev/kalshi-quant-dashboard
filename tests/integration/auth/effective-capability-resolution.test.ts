import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  bootstrapTestDatabase,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";

import { buildApp } from "../../../apps/api/src/app.js";

describe.sequential("effective capability resolution", () => {
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

  test("returns role-specific capability differences and allowed export resources", async () => {
    const operator = await app.inject({
      method: "GET",
      url: "/api/auth/session",
      headers: { "x-dashboard-user": "operator@example.internal" }
    });
    const developer = await app.inject({
      method: "GET",
      url: "/api/auth/session",
      headers: { "x-dashboard-user": "developer@example.internal" }
    });
    const admin = await app.inject({
      method: "GET",
      url: "/api/auth/session",
      headers: { "x-dashboard-user": "admin@example.internal" }
    });

    expect(operator.statusCode).toBe(200);
    expect(operator.json().effectiveCapability.canViewRawPayloads).toBe(false);
    expect(
      operator.json().effectiveCapability.allowedExportResources.map(
        (resource: { resource: string }) => resource.resource
      )
    ).toEqual(expect.arrayContaining(["decisions", "skips", "alerts", "pnl"]));
    expect(developer.json().effectiveCapability.detailLevelMax).toBe("debug");
    expect(admin.json().effectiveCapability.canManageFeatureFlags).toBe(true);
  });
});
