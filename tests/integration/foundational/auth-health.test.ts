import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  bootstrapTestDatabase,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";

import { buildApp } from "../../../apps/api/src/app.js";

describe.sequential("foundational auth and health endpoints", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    await bootstrapTestDatabase();
    app = await buildApp();
  });

  afterAll(async () => {
    await app?.close();
    await shutdownTestDatabase();
  });

  beforeEach(async () => {
    await resetFoundationalState();
  });

  test("expose liveness and readiness probes", async () => {
    const liveness = await app.inject({
      method: "GET",
      url: "/api/health/liveness"
    });
    const readiness = await app.inject({
      method: "GET",
      url: "/api/health/readiness"
    });

    expect(liveness.statusCode).toBe(200);
    expect(readiness.statusCode).toBe(200);
    expect(liveness.json().status).toBe("ok");
    expect(readiness.json().details.database).toBe("reachable");
  });

  test("require authentication for session and live stream endpoints", async () => {
    const sessionResponse = await app.inject({
      method: "GET",
      url: "/api/auth/session"
    });
    const streamResponse = await app.inject({
      method: "GET",
      url: "/api/live/stream?channels=overview"
    });

    expect(sessionResponse.statusCode).toBe(401);
    expect(streamResponse.statusCode).toBe(401);
  });
});
