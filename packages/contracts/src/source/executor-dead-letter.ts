import { z } from "zod";

import { isoDatetimeString } from "../shared.js";

export const deadLetterRecordSchema = z.object({
  id: z.string().uuid().or(z.string().min(1)),
  sourceEventId: z.string().uuid().or(z.string().min(1)),
  sourceCategory: z.string().min(1),
  sourceEventName: z.string().min(1),
  resourceId: z.string().nullable().optional(),
  correlationId: z.string().nullable().optional(),
  idempotencyKey: z.string().nullable().optional(),
  deadLetterQueue: z.string().min(1),
  attemptCount: z.number().int().nonnegative(),
  errorType: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  originalPayload: z.string(),
  deadLetteredAtUtc: isoDatetimeString,
  lastReplayedAtUtc: isoDatetimeString.nullable().optional(),
  replayCount: z.number().int().nonnegative()
});
