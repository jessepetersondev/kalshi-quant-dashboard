import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { query } from "@kalshi-quant-dashboard/db";
import {
  bootstrapTestDatabase,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";
import { tradeListResponseSchema } from "@kalshi-quant-dashboard/contracts";

import { buildApp } from "../../../apps/api/src/app.js";
import {
  getCanonicalOrderingFlags,
  seedLifecycleFacts,
  seedReplayObservation
} from "./helpers.js";

describe.sequential("lifecycle replay and resync convergence", () => {
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

  test("preserve one trade fact while recording replay and redelivery metadata", async () => {
    await seedLifecycleFacts();
    await seedReplayObservation();

    const tradesResponse = await app.inject({
      method: "GET",
      url: "/api/trades?search=publisher-order-1",
      headers: {
        "x-dashboard-user": "developer@example.internal"
      }
    });

    expect(tradesResponse.statusCode).toBe(200);
    const tradeList = tradeListResponseSchema.parse(tradesResponse.json());
    expect(tradeList.items).toHaveLength(1);

    const flags = await getCanonicalOrderingFlags("corr-btc-1");
    expect(flags.some((row) => row.ordering.hasReplay === true)).toBe(true);
    expect(flags.some((row) => row.ordering.hasRedelivery === true)).toBe(true);

    const gaps = await query<{ gap_id: string }>(
      `
        select gap_id
        from reconciliation_gaps
        where correlation_id = 'corr-btc-1'
      `
    );
    expect(gaps.rows).toHaveLength(0);
  });
});
