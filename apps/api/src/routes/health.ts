import type { FastifyInstance } from "fastify";

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_request, reply) => {
    const probe = await app.buildHealthProbe("liveness");
    return reply.code(probe.statusCode).send(probe.body);
  });

  app.get("/health/live", async (_request, reply) => {
    const probe = await app.buildHealthProbe("liveness");
    return reply.code(probe.statusCode).send(probe.body);
  });

  app.get("/health/ready", async (_request, reply) => {
    const probe = await app.buildHealthProbe("readiness");
    return reply.code(probe.statusCode).send(probe.body);
  });

  app.get("/api/health/liveness", async (_request, reply) => {
    const probe = await app.buildHealthProbe("liveness");
    return reply.code(probe.statusCode).send(probe.body);
  });

  app.get("/api/health/readiness", async (_request, reply) => {
    const probe = await app.buildHealthProbe("readiness");
    return reply.code(probe.statusCode).send(probe.body);
  });
}
