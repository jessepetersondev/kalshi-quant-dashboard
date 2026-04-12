import { describe, expect, test } from "vitest";

import { loadFixture } from "@kalshi-quant-dashboard/testing";
import { sourceProfiles } from "@kalshi-quant-dashboard/source-adapters";

import { normalizeObservation } from "../../../apps/ingest/src/normalization/normalize-observation.js";

describe("foundational dedup and ordering metadata", () => {
  test("derive stable dedup keys across duplicate deliveries", async () => {
    const fixture = await loadFixture<Record<string, unknown>>(
      "publisher/trade-intent-created.json"
    );

    const first = normalizeObservation({
      sourceProfile: sourceProfiles.publisherEnvelopeV1,
      sourceRepo: "kalshi-integration-event-publisher",
      payload: fixture,
      metadata: {
        exchange: "kalshi.integration.events",
        queue: "kalshi.integration.executor",
        routingKey: "kalshi.integration.trading.trade-intent.created",
        deliveryTag: 1,
        sourceDeliveryOrdinal: 1,
        redelivered: false
      }
    }).entries[0]!;
    const redelivery = normalizeObservation({
      sourceProfile: sourceProfiles.publisherEnvelopeV1,
      sourceRepo: "kalshi-integration-event-publisher",
      payload: fixture,
      replayKind: "redelivery",
      metadata: {
        exchange: "kalshi.integration.events",
        queue: "kalshi.integration.executor",
        routingKey: "kalshi.integration.trading.trade-intent.created",
        deliveryTag: 2,
        sourceDeliveryOrdinal: 2,
        redelivered: true
      }
    }).entries[0]!;

    expect(first.event.dedupKey).toBe(redelivery.event.dedupKey);
    expect(first.event.ordering.hasRedelivery).toBe(false);
    expect(redelivery.event.ordering.hasRedelivery).toBe(true);
    expect(redelivery.observation.replayKind).toBe("redelivery");
  });
});
