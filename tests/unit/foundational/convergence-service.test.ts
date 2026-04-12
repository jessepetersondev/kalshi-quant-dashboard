import { describe, expect, test } from "vitest";

import { normalizedDashboardEventSchema } from "@kalshi-quant-dashboard/contracts";

import { ConvergenceService } from "../../../apps/ingest/src/reconciliation/convergence-service.js";

describe("foundational ordered convergence service", () => {
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
});
