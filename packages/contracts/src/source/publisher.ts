import { z } from "zod";

import { isoDatetimeString } from "../shared.js";

export const publisherEnvelopeSchema = z.object({
  id: z.string().uuid().or(z.string().min(1)),
  category: z.string().min(1),
  name: z.string().min(1),
  resourceId: z.string().nullable().optional(),
  correlationId: z.string().nullable().optional(),
  idempotencyKey: z.string().nullable().optional(),
  attributes: z.record(z.string().nullable()).default({}),
  occurredAt: isoDatetimeString
});

export const publisherDeliveryMetadataSchema = z.object({
  exchange: z.string().min(1),
  queue: z.string().min(1),
  routingKey: z.string().min(1),
  deliveryTag: z.union([z.number(), z.string()]),
  redelivered: z.boolean(),
  sourceDeliveryOrdinal: z.number().int().nonnegative().optional()
});
