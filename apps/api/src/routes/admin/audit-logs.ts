import type { FastifyInstance } from "fastify";

import { AdminAuditService } from "../../services/admin-audit-service.js";

export async function registerAdminAuditLogRoutes(app: FastifyInstance): Promise<void> {
  const service = new AdminAuditService();

  app.get(
    "/api/admin/audit-logs",
    {
      preHandler: app.requireCapability({ requiresPrivilegedAudit: true })
    },
    async (request) => service.list(service.parseListQuery(request.query))
  );
}
