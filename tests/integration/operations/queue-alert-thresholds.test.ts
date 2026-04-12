import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  bootstrapTestDatabase,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";

import { buildApp } from "../../../apps/api/src/app.js";
import { seedOperationsFacts } from "../../support/phase6.js";

describe.sequential("queue alert thresholds", () => {
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

  test("creates backlog and dlq alerts from RabbitMQ management samples", async () => {
    await seedOperationsFacts();

    const operations = await app.inject({
      method: "GET",
      url: "/api/operations/queues?detailLevel=standard",
      headers: { "x-dashboard-user": "operator@example.internal" }
    });
    const alerts = await app.inject({
      method: "GET",
      url: "/api/alerts?page=1&pageSize=50&detailLevel=standard&timezone=utc",
      headers: { "x-dashboard-user": "operator@example.internal" }
    });
    const alertExport = await app.inject({
      method: "GET",
      url: "/api/exports/alerts.csv?timezone=utc",
      headers: { "x-dashboard-user": "operator@example.internal" }
    });

    expect(operations.statusCode).toBe(200);
    expect(
      operations.json().queueSummary.some(
        (row: { queueName: string; oldestMessageAgeSeconds: number | null }) =>
          row.queueName === "kalshi.integration.executor" &&
          (row.oldestMessageAgeSeconds ?? 0) >= 45
      )
    ).toBe(true);
    expect(alerts.statusCode).toBe(200);
    expect(
      alerts.json().items.some((row: { alertType: string }) => row.alertType === "queue_backlog_age")
    ).toBe(true);
    expect(
      alerts.json().items.some((row: { alertType: string }) => row.alertType === "dlq_growth")
    ).toBe(true);
    expect(alertExport.statusCode).toBe(200);
    expect(alertExport.body).toContain("Queue backlog age exceeded threshold");
  });
});
