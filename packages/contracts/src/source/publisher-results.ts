import { z } from "zod";

import { publisherEnvelopeSchema } from "./publisher.js";

export const publisherResultEnvelopeSchema = publisherEnvelopeSchema.extend({
  category: z.literal("trading")
});
