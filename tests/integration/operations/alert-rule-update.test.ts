import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  bootstrapTestDatabase,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";

import { buildApp } from "../../../apps/api/src/app.js";

describe.sequential("alert rule updates", () => {
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

  test("updates thresholds, denies non-admin callers, and writes audit entries", async () => {
    const list = await app.inject({
      method: "GET",
      url: "/api/admin/alert-rules",
      headers: { "x-dashboard-user": "admin@example.internal" }
    });
    const rule = list.json().items[0];

    const update = await app.inject({
      method: "PATCH",
      url: `/api/admin/alert-rules/${encodeURIComponent(rule.alertRuleId)}`,
      headers: { "x-dashboard-user": "admin@example.internal" },
      payload: {
        version: rule.version,
        thresholdValue: rule.thresholdValue + 10,
        thresholdUnit: rule.thresholdUnit,
        enabled: true,
        reason: "Raise threshold for validation"
      }
    });
    const denied = await app.inject({
      method: "PATCH",
      url: `/api/admin/alert-rules/${encodeURIComponent(rule.alertRuleId)}`,
      headers: { "x-dashboard-user": "operator@example.internal" },
      payload: {
        version: rule.version + 1,
        thresholdValue: rule.thresholdValue,
        thresholdUnit: rule.thresholdUnit,
        enabled: true,
        reason: "Denied mutation"
      }
    });
    const audit = await app.inject({
      method: "GET",
      url: "/api/admin/audit-logs?page=1&pageSize=50&search=alert_rule.update",
      headers: { "x-dashboard-user": "admin@example.internal" }
    });

    expect(update.statusCode).toBe(200);
    expect(denied.statusCode).toBe(403);
    expect(audit.statusCode).toBe(200);
    expect(
      audit.json().items.some((entry: { action: string }) => entry.action === "alert_rule.update")
    ).toBe(true);
  });
});
