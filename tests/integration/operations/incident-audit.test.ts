import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import {
  bootstrapTestDatabase,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";

import { buildApp } from "../../../apps/api/src/app.js";
import { upsertProjectedAlert } from "../../../apps/ingest/src/projections/alert-projector.js";

describe.sequential("incident audit", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    await bootstrapTestDatabase();
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
    await shutdownTestDatabase();
  });

  beforeEach(async () => {
    await resetFoundationalState();
    app.capabilityCache.invalidate();
  });

  test("returns alert detail audit entries for alert create and update mutations", async () => {
    await upsertProjectedAlert({
      alertId: "alert-incident-audit",
      alertType: "ingest_failure",
      severity: "critical",
      status: "open",
      summary: "Ingest failure detected",
      detail: "The ingest loop failed to parse a payload.",
      affectedComponent: "kalshi-integration-event-publisher",
      metadata: { error: "schema mismatch" },
      seenAt: "2026-04-11T12:30:00Z"
    });
    await upsertProjectedAlert({
      alertId: "alert-incident-audit",
      alertType: "ingest_failure",
      severity: "critical",
      status: "resolved",
      summary: "Ingest failure recovered",
      detail: "The ingest loop recovered after replay.",
      affectedComponent: "kalshi-integration-event-publisher",
      metadata: { error: "resolved" },
      seenAt: "2026-04-11T12:35:00Z"
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/alerts/alert-incident-audit?detailLevel=debug&timezone=utc",
      headers: { "x-dashboard-user": "developer@example.internal" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().auditEntries.length).toBeGreaterThanOrEqual(2);
  });
});
