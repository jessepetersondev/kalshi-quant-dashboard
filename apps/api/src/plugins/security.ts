import cookie from "@fastify/cookie";
import type { FastifyInstance } from "fastify";

import { getServerSecrets, createRuntimeConfig } from "@kalshi-quant-dashboard/config";

export async function registerSecurityPlugin(app: FastifyInstance): Promise<void> {
  const runtimeConfig = createRuntimeConfig();
  const secrets = getServerSecrets();

  await app.register(cookie, {
    hook: "onRequest",
    parseOptions: {},
    secret: secrets.secrets.sessionCookieSecret
  });

  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("cache-control", "no-store");
    reply.header("referrer-policy", "same-origin");
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    reply.header("x-kqd-auth-mode", runtimeConfig.authMode);
    return payload;
  });
}
