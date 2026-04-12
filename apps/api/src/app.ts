import Fastify, { type FastifyInstance } from "fastify";

import { createRuntimeConfig } from "@kalshi-quant-dashboard/config";
import { closePool } from "@kalshi-quant-dashboard/db";

import { DenialAuditService } from "./services/denial-audit-service.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerOverviewRoutes } from "./routes/overview.js";
import { registerStrategyRoutes } from "./routes/strategies.js";
import { registerDecisionRoutes } from "./routes/decisions.js";
import { registerTradeRoutes } from "./routes/trades.js";
import { registerSkipRoutes } from "./routes/skips.js";
import { registerPnlRoutes } from "./routes/pnl.js";
import { registerOperationsRoutes } from "./routes/operations.js";
import { registerAlertRoutes } from "./routes/alerts.js";
import { registerSystemHealthRoutes } from "./routes/system-health.js";
import { registerExportRoutes } from "./routes/exports.js";
import { registerAdminAccessPolicyRoutes } from "./routes/admin/access-policies.js";
import { registerAdminFeatureFlagRoutes } from "./routes/admin/feature-flags.js";
import { registerAdminAlertRuleRoutes } from "./routes/admin/alert-rules.js";
import { registerAdminAuditLogRoutes } from "./routes/admin/audit-logs.js";
import { registerAuthPlugin } from "./plugins/auth.js";
import { registerHealthPlugin } from "./plugins/health.js";
import { registerRouteCapabilitiesPlugin } from "./plugins/route-capabilities.js";
import { registerSecurityPlugin } from "./plugins/security.js";
import { registerSsePlugin } from "./plugins/sse.js";

declare module "fastify" {
  interface FastifyInstance {
    denialAuditService: DenialAuditService;
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  const runtimeConfig = createRuntimeConfig();
  const app = Fastify({
    logger: false
  });

  app.addHook("onClose", async () => {
    await closePool();
  });

  app.decorate("denialAuditService", new DenialAuditService());

  await registerSecurityPlugin(app);
  await registerAuthPlugin(app);
  await registerHealthPlugin(app);
  await registerRouteCapabilitiesPlugin(app);

  app.get("/", async () => {
    return {
      service: "api",
      status: "bootstrapped",
      authMode: runtimeConfig.authMode
    };
  });

  await registerAuthRoutes(app);
  await registerHealthRoutes(app);
  await registerOverviewRoutes(app);
  await registerStrategyRoutes(app);
  await registerDecisionRoutes(app);
  await registerTradeRoutes(app);
  await registerSkipRoutes(app);
  await registerPnlRoutes(app);
  await registerOperationsRoutes(app);
  await registerAlertRoutes(app);
  await registerSystemHealthRoutes(app);
  await registerExportRoutes(app);
  await registerAdminAccessPolicyRoutes(app);
  await registerAdminFeatureFlagRoutes(app);
  await registerAdminAlertRuleRoutes(app);
  await registerAdminAuditLogRoutes(app);
  await registerSsePlugin(app);

  return app;
}
