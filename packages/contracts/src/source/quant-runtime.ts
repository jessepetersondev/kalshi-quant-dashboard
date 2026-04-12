import { z } from "zod";

import { isoDatetimeString } from "../shared.js";

export const quantDecisionActionSchema = z.enum([
  "buy_yes",
  "buy_no",
  "sell_exit",
  "hold",
  "skip"
]);

export const quantTradeDecisionSchema = z
  .object({
    action: quantDecisionActionSchema,
    ticker: z.string().min(1),
    title: z.string().default(""),
    side: z.enum(["yes", "no"]).nullable().optional(),
    contracts: z.number().int().nonnegative().default(0),
    price: z.number().default(0),
    edge: z.number().default(0),
    reason: z.string().default(""),
    timestamp: isoDatetimeString
  })
  .passthrough();

export const quantPositionRecordSchema = z
  .object({
    ticker: z.string().min(1),
    title: z.string().min(1),
    side: z.enum(["yes", "no"]),
    contracts: z.number().int().nonnegative(),
    average_entry_price: z.number(),
    last_marked_price: z.number(),
    opened_at: isoDatetimeString,
    updated_at: isoDatetimeString
  })
  .passthrough();

export const quantTradeRecordSchema = z
  .object({
    id: z.string().min(1),
    ticker: z.string().min(1),
    title: z.string().min(1),
    side: z.enum(["yes", "no"]),
    mode: z.string().min(1),
    trade_type: z.enum(["OPEN", "CLOSE", "SETTLE"]),
    contracts: z.number().int().nonnegative(),
    price: z.number(),
    cash_impact: z.number(),
    realized_pnl: z.number(),
    reason: z.string().default(""),
    timestamp: isoDatetimeString
  })
  .passthrough();

export const quantLiveOrderRecordSchema = z
  .object({
    order_id: z.string().min(1),
    client_order_id: z.string().min(1),
    ticker: z.string().min(1),
    side: z.enum(["yes", "no"]),
    action: z.string().min(1),
    status: z.string().min(1),
    order_type: z.string().default("limit"),
    mode: z.string().min(1),
    limit_price: z.number(),
    contracts: z.number().int().nonnegative(),
    filled_contracts: z.number().int().nonnegative().default(0),
    remaining_contracts: z.number().int().nonnegative().default(0),
    reason: z.string().default("")
  })
  .passthrough();

export const quantTradesEnvelopeSchema = z.object({
  count: z.number().int().nonnegative(),
  trades: z.array(quantTradeRecordSchema)
});

export const quantPositionsEnvelopeSchema = z.array(quantPositionRecordSchema);

export const quantOrdersEnvelopeSchema = z.object({
  count: z.number().int().nonnegative(),
  orders: z.array(quantLiveOrderRecordSchema)
});

export const quantPnlSchema = z.object({
  realized_today: z.number(),
  unrealized: z.number(),
  total: z.number(),
  open_positions: z.number().int().nonnegative()
});

export const quantRealizedPnlSchema = z.object({
  total_realized_pnl: z.number(),
  realized_outcomes: z.number().int().nonnegative().optional(),
  ignored_outcomes: z.number().int().nonnegative().optional(),
  open_positions: z.number().int().nonnegative()
});

export const quantHealthSchema = z
  .object({
    status: z.string().min(1),
    asset: z.string().optional(),
    mode: z.string().min(1),
    halted: z.boolean(),
    halt_reason: z.string().nullable().optional(),
    last_scan_at: isoDatetimeString.nullable().optional(),
    spot: z.number().optional(),
    spot_source: z.string().optional(),
    btc_spot: z.number().optional(),
    eth_spot: z.number().optional(),
    sol_spot: z.number().optional(),
    live_execution_configured: z.boolean(),
    auto_start_worker: z.boolean().optional(),
    force_hourly_trade: z.boolean().optional(),
    config_warnings: z.array(z.string()).default([])
  })
  .passthrough();

export const quantStatusSchema = z
  .object({
    mode: z.string().min(1),
    halted: z.boolean(),
    halt_reason: z.string().nullable().optional(),
    last_scan_at: isoDatetimeString.nullable().optional(),
    latest_decisions: z.array(quantTradeDecisionSchema).default([]),
    latest_evaluations: z.array(z.record(z.unknown())).default([]),
    performance: z.record(z.unknown()).optional(),
    momentum: z.record(z.unknown()).optional()
  })
  .passthrough();

export const quantDashboardLiveSchema = z
  .object({
    buyOrderIntent: z.array(z.record(z.unknown())).optional(),
    skippedTrades: z.array(z.record(z.unknown())).optional(),
    recentScans: z.array(z.record(z.unknown())).optional(),
    executionSets: z.array(z.record(z.unknown())).optional(),
    activeOrders: z.array(z.record(z.unknown())).optional(),
    activePositions: z.array(z.record(z.unknown())).optional()
  })
  .passthrough();
