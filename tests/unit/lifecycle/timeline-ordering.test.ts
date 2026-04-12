import { describe, expect, test } from "vitest";

import { eventTimelineItemSchema } from "@kalshi-quant-dashboard/contracts";

import { sortTimelineItemsForDisplay } from "../../../apps/web/src/features/lifecycle/selectors.js";

describe("lifecycle timeline ordering selectors", () => {
  test("sort timeline rows by occurredAt, source sequence, publishedAt, and firstSeenAt", () => {
    const rows = [
      eventTimelineItemSchema.parse({
        canonicalEventId: "b",
        canonicalFamily: "trade",
        lifecycleStage: "publisher",
        occurredAt: "2026-04-11T12:00:00Z",
        publishedAt: "2026-04-11T12:00:03Z",
        firstSeenAt: "2026-04-11T12:00:04Z",
        sourceEventName: "order.created",
        sourcePathMode: "hybrid",
        ordering: { sourceSequence: 2 },
        degradedReasons: []
      }),
      eventTimelineItemSchema.parse({
        canonicalEventId: "a",
        canonicalFamily: "trade_intent",
        lifecycleStage: "intent",
        occurredAt: "2026-04-11T12:00:00Z",
        publishedAt: "2026-04-11T12:00:02Z",
        firstSeenAt: "2026-04-11T12:00:03Z",
        sourceEventName: "trade-intent.created",
        sourcePathMode: "hybrid",
        ordering: { sourceSequence: 1 },
        degradedReasons: []
      }),
      eventTimelineItemSchema.parse({
        canonicalEventId: "c",
        canonicalFamily: "executor_event",
        lifecycleStage: "terminal",
        occurredAt: "2026-04-11T12:00:01Z",
        publishedAt: "2026-04-11T12:00:01Z",
        firstSeenAt: "2026-04-11T12:00:02Z",
        sourceEventName: "order.execution_succeeded",
        sourcePathMode: "hybrid",
        ordering: { sourceSequence: 3 },
        degradedReasons: []
      })
    ];

    expect(sortTimelineItemsForDisplay(rows).map((row) => row.canonicalEventId)).toEqual([
      "a",
      "b",
      "c"
    ]);
  });
});
