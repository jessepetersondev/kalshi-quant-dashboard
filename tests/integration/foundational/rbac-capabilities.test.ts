import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  bootstrapTestDatabase,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";

import { buildApp } from "../../../apps/api/src/app.js";

describe.sequential("foundational RBAC capability resolution", () => {
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
  });

  test("return effective capability and allowed export resources per seeded role", async () => {
    const operator = await app.inject({
      method: "GET",
      url: "/api/auth/session",
      headers: {
        "x-dashboard-user": "operator@example.internal"
      }
    });
    const developer = await app.inject({
      method: "GET",
      url: "/api/auth/session",
      headers: {
        "x-dashboard-user": "developer@example.internal"
      }
    });
    const admin = await app.inject({
      method: "GET",
      url: "/api/auth/session",
      headers: {
        "x-dashboard-user": "admin@example.internal"
      }
    });

    expect(operator.statusCode).toBe(200);
    expect(operator.json().effectiveCapability.canViewRawPayloads).toBe(false);
    expect(
      operator.json().effectiveCapability.allowedExportResources.map(
        (resource: { resource: string }) => resource.resource
      )
    ).toEqual(expect.arrayContaining(["decisions", "skips", "alerts", "pnl"]));

    expect(developer.statusCode).toBe(200);
    expect(developer.json().effectiveCapability.canViewRawPayloads).toBe(true);
    expect(developer.json().effectiveCapability.detailLevelMax).toBe("debug");
    expect(developer.json().effectiveCapability.allowedExportResources[0].resource).toBe(
      "trades"
    );

    expect(admin.statusCode).toBe(200);
    expect(admin.json().effectiveCapability.canManageFeatureFlags).toBe(true);
    expect(admin.json().effectiveCapability.canManageAccessPolicies).toBe(true);
  });

  test("deny debug SSE for operator and allow it for developer", async () => {
    const operatorStream = await app.inject({
      method: "GET",
      url: "/api/live/stream?channels=overview&detailLevel=debug",
      headers: {
        "x-dashboard-user": "operator@example.internal"
      }
    });
    const developerStream = await app.inject({
      method: "GET",
      url: "/api/live/stream?channels=overview&detailLevel=debug",
      headers: {
        "x-dashboard-user": "developer@example.internal"
      }
    });

    expect(operatorStream.statusCode).toBe(403);
    expect(developerStream.statusCode).toBe(200);
    expect(developerStream.headers["content-type"]).toContain("text/event-stream");
    expect(developerStream.body).toContain("stream.status");
  });
});
