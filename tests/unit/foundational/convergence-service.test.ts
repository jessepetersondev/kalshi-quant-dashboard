import { afterEach, describe, expect, test, vi } from "vitest";

import { normalizedDashboardEventSchema } from "@kalshi-quant-dashboard/contracts";
import * as db from "@kalshi-quant-dashboard/db";

import { ConvergenceService } from "../../../apps/ingest/src/reconciliation/convergence-service.js";

describe("foundational ordered convergence service", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("sort timeline by occurred time, source sequence, published time, and first seen", () => {
    const service = new ConvergenceService();
    const base = {
      correlationId: "corr-1",
      strategyId: "btc",
      canonicalFamily: "trade",
      lifecycleStage: "publisher",
      sourceSystem: "publisher",
      sourceVariant: "publisher-envelope-v1",
      sourceRepo: "kalshi-integration-event-publisher",
      sourceEventName: "order.created",
      sourcePathMode: "hybrid",
      adapterVersion: "v1",
      degradedReasons: [],
      reconciliationStatus: "pending",
      normalizedPayload: {},
      rawPayload: {}
    } as const;

    const events = [
      normalizedDashboardEventSchema.parse({
        ...base,
        canonicalEventId: "b",
        dedupKey: "b",
        occurredAt: "2026-04-11T12:00:00Z",
        publishedAt: "2026-04-11T12:00:02Z",
        firstSeenAt: "2026-04-11T12:00:03Z",
        lastSeenAt: "2026-04-11T12:00:03Z",
        ordering: {
          sourceSequence: 20,
          sourceDeliveryOrdinal: 2,
          hasRedelivery: false,
          hasReplay: false,
          hasBackfill: false
        },
        aliases: []
      }),
      normalizedDashboardEventSchema.parse({
        ...base,
        canonicalEventId: "a",
        dedupKey: "a",
        occurredAt: "2026-04-11T12:00:00Z",
        publishedAt: "2026-04-11T12:00:01Z",
        firstSeenAt: "2026-04-11T12:00:02Z",
        lastSeenAt: "2026-04-11T12:00:02Z",
        ordering: {
          sourceSequence: 10,
          sourceDeliveryOrdinal: 1,
          hasRedelivery: false,
          hasReplay: false,
          hasBackfill: false
        },
        aliases: []
      }),
      normalizedDashboardEventSchema.parse({
        ...base,
        canonicalEventId: "c",
        dedupKey: "c",
        occurredAt: "2026-04-11T12:00:01Z",
        publishedAt: "2026-04-11T12:00:01Z",
        firstSeenAt: "2026-04-11T12:00:01Z",
        lastSeenAt: "2026-04-11T12:00:01Z",
        ordering: {
          sourceSequence: 5,
          sourceDeliveryOrdinal: 3,
          hasRedelivery: false,
          hasReplay: true,
          hasBackfill: false
        },
        aliases: []
      })
    ];

    expect(service.sortTimeline(events).map((event) => event.canonicalEventId)).toEqual([
      "a",
      "b",
      "c"
    ]);
  });

  test("handle missing and lexical source sequences while sorting", () => {
    const service = new ConvergenceService();
    const base = {
      correlationId: "corr-2",
      strategyId: "btc",
      canonicalFamily: "trade",
      lifecycleStage: "publisher",
      sourceSystem: "publisher",
      sourceVariant: "publisher-envelope-v1",
      sourceRepo: "kalshi-integration-event-publisher",
      sourceEventName: "order.created",
      sourcePathMode: "hybrid",
      adapterVersion: "v1",
      degradedReasons: [],
      reconciliationStatus: "pending",
      normalizedPayload: {},
      rawPayload: {},
      occurredAt: "2026-04-11T12:00:00Z",
      firstSeenAt: "2026-04-11T12:00:02Z",
      lastSeenAt: "2026-04-11T12:00:02Z",
      aliases: []
    } as const;

    const events = [
      normalizedDashboardEventSchema.parse({
        ...base,
        canonicalEventId: "z",
        dedupKey: "z",
        publishedAt: "2026-04-11T12:00:03Z",
        ordering: {
          sourceSequence: "beta",
          sourceDeliveryOrdinal: 3,
          hasRedelivery: false,
          hasReplay: false,
          hasBackfill: false
        }
      }),
      normalizedDashboardEventSchema.parse({
        ...base,
        canonicalEventId: "x",
        dedupKey: "x",
        publishedAt: "2026-04-11T12:00:01Z",
        ordering: {
          sourceDeliveryOrdinal: 1,
          hasRedelivery: false,
          hasReplay: false,
          hasBackfill: false
        }
      }),
      normalizedDashboardEventSchema.parse({
        ...base,
        canonicalEventId: "y",
        dedupKey: "y",
        publishedAt: "2026-04-11T12:00:02Z",
        ordering: {
          sourceSequence: "alpha",
          sourceDeliveryOrdinal: 2,
          hasRedelivery: false,
          hasReplay: false,
          hasBackfill: false
        }
      })
    ];

    expect(service.sortTimeline(events).map((event) => event.canonicalEventId)).toEqual([
      "x",
      "y",
      "z"
    ]);
  });

  test("record stale terminal gaps and stream mismatches", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            trade_id: "trade-1",
            correlation_id: "corr-1",
            strategy_id: "btc"
          }
        ],
        rowCount: 1
      })
      .mockResolvedValue({
        rows: [],
        rowCount: 0
      });

    vi.spyOn(db, "withClient").mockImplementation(
      async (callback: (client: { query: typeof query }) => Promise<unknown>) =>
        callback({ query } as never)
    );

    const service = new ConvergenceService();

    await expect(service.reconcileMissingTerminalEvents(10)).resolves.toBe(1);
    await expect(
      service.markStreamMismatch("corr-1", { expected: "terminal", actual: "missing" })
    ).resolves.toBeUndefined();

    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[0]?.[1]).toEqual(["10"]);
    expect(query.mock.calls[1]?.[1]?.[0]).toBe("gap-trade-1");
    expect(query.mock.calls[2]?.[1]?.[1]).toBe("corr-1");
  });
});
