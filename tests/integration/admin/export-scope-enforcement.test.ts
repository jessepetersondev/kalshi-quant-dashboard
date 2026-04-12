import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  bootstrapTestDatabase,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";

import { buildApp } from "../../../apps/api/src/app.js";
import { seedLifecycleFacts } from "../lifecycle/helpers.js";
import { seedAnalyticsFacts } from "../../support/phase6.js";

describe.sequential("export scope enforcement", () => {
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

  test("denies exports outside the granted strategy scope", async () => {
    await seedLifecycleFacts();

    const detail = await app.inject({
      method: "GET",
      url: "/api/admin/access-policies/policy-operator-default",
      headers: { "x-dashboard-user": "admin@example.internal" }
    });
    const update = await app.inject({
      method: "PATCH",
      url: "/api/admin/access-policies/policy-operator-default",
      headers: { "x-dashboard-user": "admin@example.internal" },
      payload: {
        version: detail.json().policy.version,
        policy: {
          subjectType: detail.json().policy.subjectType,
          subjectKey: detail.json().policy.subjectKey,
          name: detail.json().policy.name,
          precedence: detail.json().policy.precedence,
          enabled: detail.json().policy.enabled
        },
        rules: [],
        exportGrants: [
          {
            resource: "decisions",
            strategyScope: ["btc"],
            columnProfile: "summary",
            enabled: true
          }
        ]
      }
    });

    expect(update.statusCode).toBe(200);

    const denied = await app.inject({
      method: "GET",
      url: "/api/exports/decisions.csv?strategy=eth",
      headers: { "x-dashboard-user": "operator@example.internal" }
    });
    const allowed = await app.inject({
      method: "GET",
      url: "/api/exports/decisions.csv?strategy=btc",
      headers: { "x-dashboard-user": "operator@example.internal" }
    });

    expect(denied.statusCode).toBe(403);
    expect(allowed.statusCode).toBe(200);
  });

  test("denies pnl compare exports outside the granted strategy scope", async () => {
    await seedAnalyticsFacts();

    const detail = await app.inject({
      method: "GET",
      url: "/api/admin/access-policies/policy-operator-default",
      headers: { "x-dashboard-user": "admin@example.internal" }
    });
    const update = await app.inject({
      method: "PATCH",
      url: "/api/admin/access-policies/policy-operator-default",
      headers: { "x-dashboard-user": "admin@example.internal" },
      payload: {
        version: detail.json().policy.version,
        policy: {
          subjectType: detail.json().policy.subjectType,
          subjectKey: detail.json().policy.subjectKey,
          name: detail.json().policy.name,
          precedence: detail.json().policy.precedence,
          enabled: detail.json().policy.enabled
        },
        rules: [],
        exportGrants: [
          {
            resource: "pnl",
            strategyScope: ["btc"],
            columnProfile: "summary",
            enabled: true
          }
        ]
      }
    });

    expect(update.statusCode).toBe(200);

    const denied = await app.inject({
      method: "GET",
      url: "/api/exports/pnl.csv?bucket=all-time&compare=btc,eth",
      headers: { "x-dashboard-user": "operator@example.internal" }
    });
    const allowed = await app.inject({
      method: "GET",
      url: "/api/exports/pnl.csv?bucket=all-time&compare=btc",
      headers: { "x-dashboard-user": "operator@example.internal" }
    });

    expect(denied.statusCode).toBe(403);
    expect(allowed.statusCode).toBe(200);
  });
});
