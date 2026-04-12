import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import {
  alertExportQuerySchema,
  csvExportResourceValues,
  csvExportAuditSchema,
  decisionExportQuerySchema,
  pnlExportQuerySchema,
  skipExportQuerySchema,
  tradeExportQuerySchema
} from "@kalshi-quant-dashboard/contracts";

function readArtifact(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("lifecycle export contracts", () => {
  test("parse decision, trade, skip, alert, and pnl export queries", () => {
    const decisionQuery = decisionExportQuerySchema.parse({
      search: "corr-btc-1",
      timezone: "utc",
      range: "24h",
      strategy: "btc,eth",
      sort: "newest"
    });
    const tradeQuery = tradeExportQuerySchema.parse({
      search: "publisher-order-1",
      timezone: "local",
      range: "custom",
      strategy: ["btc"],
      status: "accepted",
      sort: "oldest"
    });
    const skipQuery = skipExportQuerySchema.parse({
      search: "cooldown",
      timezone: "utc",
      range: "all-time",
      strategy: "btc",
      skipCategory: "cooldown"
    });
    const alertQuery = alertExportQuerySchema.parse({
      search: "queue backlog",
      timezone: "local",
      severity: "warning,critical",
      strategy: "btc"
    });
    const pnlQuery = pnlExportQuerySchema.parse({
      timezone: "utc",
      bucket: "all-time",
      compare: "btc,eth",
      rangeStartUtc: "2026-04-01T00:00:00Z",
      rangeEndUtc: "2026-04-12T00:00:00Z"
    });

    expect(decisionQuery.strategy).toEqual(["btc", "eth"]);
    expect(tradeQuery.status).toEqual(["accepted"]);
    expect(skipQuery.skipCategory).toEqual(["cooldown"]);
    expect(alertQuery.severity).toEqual(["warning", "critical"]);
    expect(pnlQuery.compare).toEqual(["btc", "eth"]);
  });

  test("parse export audit summaries", () => {
    const audit = csvExportAuditSchema.parse({
      resource: "trades",
      columnProfile: "detailed",
      rowCount: 2
    });

    expect(audit.resource).toBe("trades");
  });

  test("keep shared export resources, OpenAPI, route handling, and web client aligned", () => {
    const openApi = readArtifact(
      "specs/001-quant-ops-dashboard/contracts/rest-api.openapi.yaml"
    );
    const routeSource = readArtifact("apps/api/src/routes/exports.ts");
    const clientSource = readArtifact("apps/web/src/features/exports/exportClient.ts");
    const enumMatch = openApi.match(
      /\/api\/exports\/\{resource\}\.csv:[\s\S]*?enum: \[([^\]]+)\]/
    );

    expect(enumMatch?.[1]?.split(",").map((value) => value.trim())).toEqual([
      ...csvExportResourceValues
    ]);
    expect(routeSource).toContain("csvExportResourceSchema.safeParse");
    expect(clientSource).toContain("CsvExportResource");
    expect(routeSource).toContain("requestedStrategies");
  });
});
