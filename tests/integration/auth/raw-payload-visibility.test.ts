import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  bootstrapTestDatabase,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";

import { buildApp } from "../../../apps/api/src/app.js";
import { seedLifecycleFacts } from "../lifecycle/helpers.js";

const ETH_DECISION_ID = "kalshi-eth-quant:KXETHD-TEST:2026-04-11T12:00:00Z";

describe.sequential("raw payload visibility", () => {
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

  test("hides raw payloads from operator and exposes them to developer debug detail", async () => {
    await seedLifecycleFacts();

    const operator = await app.inject({
      method: "GET",
      url: `/api/decisions/${encodeURIComponent(ETH_DECISION_ID)}`,
      headers: { "x-dashboard-user": "operator@example.internal" }
    });
    const developer = await app.inject({
      method: "GET",
      url: `/api/decisions/${encodeURIComponent(ETH_DECISION_ID)}?detailLevel=debug`,
      headers: { "x-dashboard-user": "developer@example.internal" }
    });

    expect(operator.statusCode).toBe(200);
    expect(operator.json().rawPayloadAvailable).toBe(false);
    expect(developer.statusCode).toBe(200);
    expect(developer.json().rawPayloadAvailable).toBe(true);
    expect(Array.isArray(developer.json().rawPayloads)).toBe(true);
  });
});
