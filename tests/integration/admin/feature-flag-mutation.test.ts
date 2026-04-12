import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  bootstrapTestDatabase,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";

import { buildApp } from "../../../apps/api/src/app.js";

describe.sequential("feature flag mutation", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    await bootstrapTestDatabase();
    app = await buildApp();
  });

  afterAll(async () => {
    await app?.close();
    await shutdownTestDatabase();
  });

  beforeEach(async () => {
    await resetFoundationalState();
    app.capabilityCache.invalidate();
  });

  test("accepts valid updates and rejects invalid or conflicting payloads", async () => {
    const success = await app.inject({
      method: "PATCH",
      url: "/api/admin/feature-flags/adminControlsEnabled",
      headers: { "x-dashboard-user": "admin@example.internal" },
      payload: {
        enabled: false,
        version: 0,
        reason: "Temporarily disable admin controls"
      }
    });
    const conflict = await app.inject({
      method: "PATCH",
      url: "/api/admin/feature-flags/adminControlsEnabled",
      headers: { "x-dashboard-user": "admin@example.internal" },
      payload: {
        enabled: true,
        version: 0,
        reason: "Stale retry"
      }
    });
    const invalid = await app.inject({
      method: "PATCH",
      url: "/api/admin/feature-flags/adminControlsEnabled",
      headers: { "x-dashboard-user": "admin@example.internal" },
      payload: {
        enabled: true,
        version: 1,
        reason: ""
      }
    });
    const denied = await app.inject({
      method: "PATCH",
      url: "/api/admin/feature-flags/adminControlsEnabled",
      headers: { "x-dashboard-user": "operator@example.internal" },
      payload: {
        enabled: true,
        version: 1,
        reason: "Operator should not mutate"
      }
    });

    expect(success.statusCode).toBe(200);
    expect(conflict.statusCode).toBe(409);
    expect(invalid.statusCode).toBe(422);
    expect(denied.statusCode).toBe(403);
  });
});
