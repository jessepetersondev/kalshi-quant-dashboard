import { z } from "zod";

import { isoDatetimeString, jsonRecordSchema } from "./shared.js";
import { sourceSystemSchema } from "./normalized-events.js";

export const replayKindSchema = z.enum([
  "live",
  "redelivery",
  "replay",
  "backfill",
  "resync"
]);

export const normalizedEventObservationSchema = z.object({
  eventObservationId: z.string().min(1),
  canonicalEventId: z.string().optional(),
  sourceSystem: sourceSystemSchema,
  sourceVariant: z.string().min(1),
  sourceRepo: z.string().min(1),
  sourceEventName: z.string().min(1),
  sourceEventId: z.string().optional(),
  sourceEnvelopeId: z.string().optional(),
  replayKind: replayKindSchema,
  isRedelivered: z.boolean(),
  isBackfill: z.boolean(),
  correlationIdCandidate: z.string().optional(),
  dedupKeyCandidate: z.string().min(1),
  publishedAt: isoDatetimeString.optional(),
  receivedAt: isoDatetimeString,
  sourceSequence: z.union([z.number(), z.string()]).optional(),
  sourceDeliveryOrdinal: z.number().int().nonnegative().optional(),
  brokerExchange: z.string().optional(),
  brokerQueue: z.string().optional(),
  brokerRoutingKey: z.string().optional(),
  brokerDeliveryTag: z.union([z.number(), z.string()]).optional(),
  adapterVersion: z.string().min(1),
  acceptedAsNewFact: z.boolean(),
  schemaValidationError: z.string().optional(),
  rawPayload: jsonRecordSchema
});

export type NormalizedEventObservation = z.infer<
  typeof normalizedEventObservationSchema
>;
