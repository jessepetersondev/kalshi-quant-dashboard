import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  bootstrapTestDatabase,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";

import { buildApp } from "../../../apps/api/src/app.js";

describe.sequential("feature flag audit logging", () => {
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

  test("records accepted and rejected feature flag mutations in audit logs", async () => {
    await app.inject({
      method: "PATCH",
      url: "/api/admin/feature-flags/adminControlsEnabled",
      headers: { "x-dashboard-user": "admin@example.internal" },
      payload: {
        enabled: false,
        version: 0,
        reason: "Accepted update"
      }
    });
    await app.inject({
      method: "PATCH",
      url: "/api/admin/feature-flags/adminControlsEnabled",
      headers: { "x-dashboard-user": "admin@example.internal" },
      payload: {
        enabled: true,
        version: 999,
        reason: "Rejected update"
      }
    });

    const audit = await app.inject({
      method: "GET",
      url: "/api/admin/audit-logs?page=1&pageSize=50&search=feature_flag.update",
      headers: { "x-dashboard-user": "admin@example.internal" }
    });

    expect(audit.statusCode).toBe(200);
    expect(
      audit.json().items.filter((entry: { action: string }) => entry.action === "feature_flag.update").length
    ).toBeGreaterThanOrEqual(2);
  });
});
