import { describe, expect, test } from "vitest";

import {
  deadLetterRecordSchema,
  executionRecordSchema,
  publisherEnvelopeSchema,
  publisherResultEnvelopeSchema,
  quantHealthSchema,
  quantPositionsEnvelopeSchema,
  quantStatusSchema,
  rabbitMqManagementQueueSchema,
  noTradeDiagnosticSchema
} from "@kalshi-quant-dashboard/contracts";
import { loadFixture } from "@kalshi-quant-dashboard/testing";

describe("foundational source boundary contracts", () => {
  test("parse inspected publisher and executor fixtures", async () => {
    const tradeIntent = await loadFixture<Record<string, unknown>>(
      "publisher/trade-intent-created.json"
    );
    const executionSucceeded = await loadFixture<Record<string, unknown>>(
      "publisher/order-execution-succeeded.json"
    );
    const executionRecord = await loadFixture<Record<string, unknown>>(
      "executor/execution-record.json"
    );
    const deadLetterRecord = await loadFixture<Record<string, unknown>>(
      "executor/dead-letter-record.json"
    );

    expect(publisherEnvelopeSchema.parse(tradeIntent).name).toBe("trade-intent.created");
    expect(publisherResultEnvelopeSchema.parse(executionSucceeded).name).toBe(
      "order.execution_succeeded"
    );
    expect(executionRecordSchema.parse(executionRecord).externalOrderId).toBe(
      "external-order-1"
    );
    expect(deadLetterRecordSchema.parse(deadLetterRecord).deadLetterQueue).toBe(
      "kalshi.integration.executor.dlq"
    );
  });

  test("parse direct strategy and RabbitMQ management fixtures", async () => {
    const status = await loadFixture<Record<string, unknown>>("strategies/eth-status.json");
    const positions = await loadFixture<unknown>("strategies/btc-positions.json");
    const noTrade = await loadFixture<Record<string, unknown>>(
      "strategies/sol-no-trade-diagnostics.json"
    );
    const heartbeat = await loadFixture<Record<string, unknown>>(
      "heartbeats/strategy-heartbeat.json"
    );

    expect(quantStatusSchema.parse(status).latest_decisions).toHaveLength(2);
    expect(quantPositionsEnvelopeSchema.parse(positions)).toHaveLength(1);
    expect(noTradeDiagnosticSchema.parse(noTrade).top_reasons[0]?.reason).toBe(
      "no side passed gate"
    );
    expect(quantHealthSchema.parse(heartbeat).live_execution_configured).toBe(true);

    const rawQueue = rabbitMqManagementQueueSchema.parse({
      name: "kalshi.integration.executor",
      messages: 12,
      messages_ready: 12,
      messages_unacknowledged: 0,
      consumers: 1,
      state: "running",
      idle_since: "2026-04-11T12:00:00Z"
    });
    expect(rawQueue.name).toBe("kalshi.integration.executor");
  });
});
