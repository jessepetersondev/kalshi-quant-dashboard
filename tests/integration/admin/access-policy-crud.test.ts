import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  bootstrapTestDatabase,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";

import { buildApp } from "../../../apps/api/src/app.js";

describe.sequential("admin access policy CRUD", () => {
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

  test("creates a policy, exposes it in the admin list, and writes an audit entry", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/api/admin/access-policies",
      headers: { "x-dashboard-user": "admin@example.internal" },
      payload: {
        policy: {
          subjectType: "user",
          subjectKey: "user-developer",
          name: "Developer admin controls",
          precedence: 100,
          enabled: true
        },
        rules: [
          {
            ruleType: "admin_surface",
            effect: "allow",
            adminSurfaces: ["access_policies"]
          }
        ],
        exportGrants: []
      }
    });

    expect(createResponse.statusCode).toBe(201);
    const createdPolicyId = createResponse.json().policy.accessPolicyId as string;

    const listResponse = await app.inject({
      method: "GET",
      url: "/api/admin/access-policies?page=1&pageSize=50",
      headers: { "x-dashboard-user": "admin@example.internal" }
    });
    const auditResponse = await app.inject({
      method: "GET",
      url: "/api/admin/audit-logs?page=1&pageSize=50&search=access_policy.create",
      headers: { "x-dashboard-user": "admin@example.internal" }
    });

    expect(listResponse.statusCode).toBe(200);
    expect(
      listResponse.json().items.some((item: { accessPolicyId: string }) => item.accessPolicyId === createdPolicyId)
    ).toBe(true);
    expect(auditResponse.statusCode).toBe(200);
    expect(
      auditResponse.json().items.some((item: { targetId: string }) => item.targetId === createdPolicyId)
    ).toBe(true);
  });
});
