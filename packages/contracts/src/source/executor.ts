import { z } from "zod";

import { isoDatetimeString } from "../shared.js";
import { publisherEnvelopeSchema } from "./publisher.js";

export const executorEnvelopeSchema = publisherEnvelopeSchema;

export const executionRecordSchema = z.object({
  externalOrderId: z.string().min(1),
  clientOrderId: z.string().min(1),
  resourceId: z.string().nullable().optional(),
  correlationId: z.string().nullable().optional(),
  commandEventId: z.string().nullable().optional(),
  actionType: z.string().nullable().optional(),
  tradeIntentId: z.string().nullable().optional(),
  publisherOrderId: z.string().nullable().optional(),
  ticker: z.string().nullable().optional(),
  side: z.string().nullable().optional(),
  action: z.string().nullable().optional(),
  targetPublisherOrderId: z.string().nullable().optional(),
  targetClientOrderId: z.string().nullable().optional(),
  targetExternalOrderId: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  quantity: z.number().int().nullable().optional(),
  limitPriceDollars: z.number().nullable().optional(),
  notionalDollars: z.number().nullable().optional(),
  rawResponse: z.string(),
  recordedAtUtc: isoDatetimeString
});
