import { describe, expect, test } from "vitest";

import { IngestHealthState } from "../../../apps/ingest/src/health/ingest-health-state.js";

describe("ingest health state", () => {
  test("report liveness before readiness and become ready after collector success", () => {
    const health = new IngestHealthState({
      collectorsEnabled: true,
      consumersEnabled: false
    });

    const liveness = health.buildProbe("liveness");
    expect(liveness.statusCode).toBe(200);
    expect(liveness.body.details).toMatchObject({ mode: "liveness", started: false });

    const initialReadiness = health.buildProbe("readiness");
    expect(initialReadiness.statusCode).toBe(503);
    expect(initialReadiness.body.details).toMatchObject({
      collectorsEnabled: true,
      consumersEnabled: false,
      lastCollectorRunAt: null
    });

    health.markStarted();
    health.markCollectorSuccess();

    const ready = health.buildProbe("readiness");
    expect(ready.statusCode).toBe(200);
    expect(ready.body.details).toMatchObject({
      collectorsEnabled: true,
      consumersEnabled: false,
      consumerError: null
    });
  });

  test("surface collector and consumer failures", () => {
    const health = new IngestHealthState({
      collectorsEnabled: true,
      consumersEnabled: true
    });

    health.markStarted();
    health.markCollectorFailure(new Error("collector failed"));
    health.markConsumerFailure("consumer failed");

    const degraded = health.buildProbe("readiness");
    expect(degraded.statusCode).toBe(503);
    expect(degraded.body.details).toMatchObject({
      lastCollectorError: "collector failed",
      consumerError: "Unknown consumer failure"
    });

    health.markCollectorSuccess();
    health.markConsumersReady();
    const ready = health.buildProbe("readiness");
    expect(ready.statusCode).toBe(200);
  });

  test("treat disabled collectors and consumers as ready once started", () => {
    const health = new IngestHealthState({
      collectorsEnabled: false,
      consumersEnabled: false
    });

    health.markStarted();
    const ready = health.buildProbe("readiness");
    expect(ready.statusCode).toBe(200);
  });
});
