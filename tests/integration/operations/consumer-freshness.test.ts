import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  bootstrapTestDatabase,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";

import { buildApp } from "../../../apps/api/src/app.js";
import { seedOperationsFacts } from "../../support/phase6.js";

describe.sequential("consumer freshness and heartbeat health", () => {
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

  test("marks system health degraded when consumers are stale or heartbeats halt", async () => {
    await seedOperationsFacts();

    const health = await app.inject({
      method: "GET",
      url: "/api/system-health",
      headers: { "x-dashboard-user": "operator@example.internal" }
    });

    expect(health.statusCode).toBe(200);
    expect(health.json().overview.degraded).toBe(true);
    expect(
      health.json().components.some(
        (component: { componentName: string; status: string }) =>
          component.componentName === "kalshi.integration.executor" &&
          component.status === "degraded"
      )
    ).toBe(true);
  });
});
