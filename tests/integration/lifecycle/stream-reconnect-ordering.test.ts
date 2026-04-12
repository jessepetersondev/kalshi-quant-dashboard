import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { query } from "@kalshi-quant-dashboard/db";
import {
  bootstrapTestDatabase,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";

import { buildApp } from "../../../apps/api/src/app.js";
import { seedLifecycleFacts } from "./helpers.js";

function extractEventIds(body: string): number[] {
  return body
    .split("\n")
    .filter((line) => line.startsWith("id: "))
    .map((line) => Number(line.slice(4)))
    .filter((value) => Number.isFinite(value));
}

describe.sequential("lifecycle stream reconnect ordering", () => {
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

  test("emit projection changes in ascending order and honor Last-Event-ID on reconnect", async () => {
    await seedLifecycleFacts();

    const initialResponse = await app.inject({
      method: "GET",
      url: "/api/live/stream?channels=decisions,trades",
      headers: {
        "x-dashboard-user": "developer@example.internal"
      }
    });

    expect(initialResponse.statusCode).toBe(200);
    const ids = extractEventIds(initialResponse.body);
    expect(ids.length).toBeGreaterThan(0);
    expect([...ids].sort((left, right) => left - right)).toEqual(ids);

    const reconnectResponse = await app.inject({
      method: "GET",
      url: "/api/live/stream?channels=decisions,trades",
      headers: {
        "x-dashboard-user": "developer@example.internal",
        "last-event-id": String(ids.at(-1))
      }
    });

    expect(reconnectResponse.statusCode).toBe(200);
    expect(extractEventIds(reconnectResponse.body)).toHaveLength(0);
  });

  test("emit stream.gap and stream.resync_required when reconciliation or retention requires refetch", async () => {
    await seedLifecycleFacts();

    await query(
      `
        insert into reconciliation_gaps (
          gap_id,
          correlation_id,
          strategy_id,
          gap_type,
          expected_stage,
          status,
          details
        )
        values (
          'gap-stream-skips',
          'corr-btc-1',
          'btc',
          'stream_history_mismatch',
          'terminal',
          'gap_detected',
          '{"message":"Skip stream must refetch","affectedChannels":["skips"]}'::jsonb
        )
      `
    );

    const gapResponse = await app.inject({
      method: "GET",
      url: "/api/live/stream?channels=skips",
      headers: {
        "x-dashboard-user": "developer@example.internal"
      }
    });

    expect(gapResponse.statusCode).toBe(200);
    expect(gapResponse.body).toContain("event: stream.gap");
    expect(gapResponse.body).toContain('"affectedChannels":["skips"]');

    await query(
      `
        delete from projection_changes
        where projection_change_id = (
          select min(projection_change_id)
          from projection_changes
        )
      `
    );

    let retainedWindow = await query<{ earliest_projection_change_id: number }>(
      `
        select min(projection_change_id)::int as earliest_projection_change_id
        from projection_changes
        where channel = 'decisions'
      `
    );

    if ((retainedWindow.rows[0]?.earliest_projection_change_id ?? 0) <= 2) {
      await query(
        `
          delete from projection_changes
          where projection_change_id = (
            select min(projection_change_id)
            from projection_changes
            where channel = 'decisions'
          )
        `
      );

      retainedWindow = await query<{ earliest_projection_change_id: number }>(
        `
          select min(projection_change_id)::int as earliest_projection_change_id
          from projection_changes
          where channel = 'decisions'
        `
      );
    }

    const tooOldCursor = Math.max(
      1,
      (retainedWindow.rows[0]?.earliest_projection_change_id ?? 3) - 2
    );

    const resyncResponse = await app.inject({
      method: "GET",
      url: "/api/live/stream?channels=decisions",
      headers: {
        "x-dashboard-user": "developer@example.internal",
        "last-event-id": String(tooOldCursor)
      }
    });

    expect(resyncResponse.statusCode).toBe(200);
    expect(resyncResponse.body).toContain("event: stream.resync_required");
    expect(resyncResponse.body).toContain('"refetch":true');
  });
});
