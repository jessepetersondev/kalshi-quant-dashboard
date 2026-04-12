import { z } from "zod";

import { effectiveCapabilitySchema } from "./effective-capabilities.js";
import { isoDatetimeString } from "../shared.js";

export const sessionPrincipalSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1)
});

export const sessionResponseSchema = z.object({
  session: z.object({
    principal: sessionPrincipalSchema,
    issuedAt: isoDatetimeString,
    authMode: z.enum(["dev", "oidc", "proxy"])
  }),
  effectiveCapability: effectiveCapabilitySchema
});

export type SessionResponse = z.infer<typeof sessionResponseSchema>;
