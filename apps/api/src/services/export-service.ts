import {
  alertExportQuerySchema,
  decisionExportQuerySchema,
  exportQuerySchema,
  pnlExportQuerySchema,
  skipExportQuerySchema,
  tradeExportQuerySchema,
  type AlertListQuery,
  type AlertListResponse,
  type CsvExportResource,
  type DecisionListResponse,
  type DecisionListQuery,
  type EffectiveCapability,
  type ExportQuery,
  type PnlSummaryQuery,
  type PnlSummaryResponse,
  type PnlTimeseriesQuery,
  type PnlTimeseriesResponse,
  type SkipListQuery,
  type SkipListResponse,
  type TradeListQuery,
  type TradeListResponse
} from "@kalshi-quant-dashboard/contracts";

import { AlertService } from "./alert-service.js";
import { DecisionService } from "./decision-service.js";
import { ExportAuditService } from "./export-audit-service.js";
import { PnlService } from "./pnl-service.js";
import { SkipService } from "./skip-service.js";
import { TradeService } from "./trade-service.js";
import { getPaginationLimits } from "./pagination.js";

function csvEscape(value: string | number | boolean | null | undefined): string {
  const normalized = value === null || value === undefined ? "" : String(value);
  if (normalized.includes(",") || normalized.includes("\"") || normalized.includes("\n")) {
    return `"${normalized.replaceAll("\"", "\"\"")}"`;
  }

  return normalized;
}

function serializeMetadata(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return JSON.stringify(value);
}

function queryWithDefaults(input: unknown): Record<string, unknown> {
  return typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
}

export class ExportService {
  constructor(
    private readonly alertService = new AlertService(),
    private readonly decisionService = new DecisionService(),
    private readonly pnlService = new PnlService(),
    private readonly skipService = new SkipService(),
    private readonly tradeService = new TradeService(),
    private readonly auditService = new ExportAuditService()
  ) {}

  parseRoute(resource: string, query: unknown): ExportQuery {
    return exportQuerySchema.parse({
      resource,
      ...(typeof query === "object" && query ? query : {})
    });
  }

  async exportCsv(args: {
    readonly actorUserId: string;
    readonly effectiveCapability: EffectiveCapability;
    readonly resource: CsvExportResource;
    readonly query: unknown;
    readonly strategyScopeOverride?: readonly string[];
  }): Promise<string> {
    const strategyScope =
      args.strategyScopeOverride ?? args.effectiveCapability.strategyScope;

    switch (args.resource) {
      case "decisions":
        return this.exportDecisionsCsv({
          actorUserId: args.actorUserId,
          strategyScope,
          query: decisionExportQuerySchema.parse(queryWithDefaults(args.query))
        });
      case "trades":
        return this.exportTradesCsv({
          actorUserId: args.actorUserId,
          strategyScope,
          query: tradeExportQuerySchema.parse(queryWithDefaults(args.query))
        });
      case "skips":
        return this.exportSkipsCsv({
          actorUserId: args.actorUserId,
          strategyScope,
          query: skipExportQuerySchema.parse(queryWithDefaults(args.query))
        });
      case "alerts":
        return this.exportAlertsCsv({
          actorUserId: args.actorUserId,
          strategyScope,
          query: alertExportQuerySchema.parse(queryWithDefaults(args.query))
        });
      case "pnl":
        return this.exportPnlCsv({
          actorUserId: args.actorUserId,
          strategyScope,
          query: pnlExportQuerySchema.parse(queryWithDefaults(args.query))
        });
    }
  }

  private async exportDecisionsCsv(args: {
    readonly actorUserId: string;
    readonly strategyScope: readonly string[];
    readonly query: Omit<DecisionListQuery, "page" | "pageSize" | "detailLevel">;
  }): Promise<string> {
    const rows = await this.collectDecisionRows(args);
    const header = [
      "correlationId",
      "strategyId",
      "symbol",
      "marketTicker",
      "decisionAction",
      "currentLifecycleStage",
      "currentOutcomeStatus",
      "latestEventAt",
      "sourcePathMode",
      "degraded"
    ];
    const lines = rows.map((row) =>
      [
        row.correlationId,
        row.strategyId,
        row.symbol,
        row.marketTicker,
        row.decisionAction,
        row.currentLifecycleStage,
        row.currentOutcomeStatus,
        row.latestEventAt,
        row.sourcePathMode,
        row.degraded
      ]
        .map(csvEscape)
        .join(",")
    );

    await this.auditService.recordAccepted({
      actorUserId: args.actorUserId,
      query: { resource: "decisions", timezone: args.query.timezone, format: "csv" },
      rowCount: rows.length
    });

    return [header.join(","), ...lines].join("\n");
  }

  private async exportTradesCsv(args: {
    readonly actorUserId: string;
    readonly strategyScope: readonly string[];
    readonly query: Omit<TradeListQuery, "page" | "pageSize" | "detailLevel">;
  }): Promise<string> {
    const rows = await this.collectTradeRows(args);
    const header = [
      "correlationId",
      "tradeAttemptKey",
      "strategyId",
      "symbol",
      "marketTicker",
      "status",
      "publishStatus",
      "lastResultStatus",
      "latestSeenAt",
      "sourcePathMode",
      "degraded"
    ];
    const lines = rows.map((row) =>
      [
        row.correlationId,
        row.tradeAttemptKey,
        row.strategyId,
        row.symbol,
        row.marketTicker,
        row.status,
        row.publishStatus,
        row.lastResultStatus,
        row.latestSeenAt,
        row.sourcePathMode,
        row.degraded
      ]
        .map(csvEscape)
        .join(",")
    );

    await this.auditService.recordAccepted({
      actorUserId: args.actorUserId,
      query: { resource: "trades", timezone: args.query.timezone, format: "csv" },
      rowCount: rows.length
    });

    return [header.join(","), ...lines].join("\n");
  }

  private async exportSkipsCsv(args: {
    readonly actorUserId: string;
    readonly strategyScope: readonly string[];
    readonly query: Omit<SkipListQuery, "page" | "pageSize">;
  }): Promise<string> {
    const rows = await this.collectSkipRows(args);
    const header = [
      "correlationId",
      "strategyId",
      "symbol",
      "marketTicker",
      "skipCategory",
      "skipCode",
      "reasonRaw",
      "occurredAt"
    ];
    const lines = rows.map((row) =>
      [
        row.correlationId,
        row.strategyId,
        row.symbol,
        row.marketTicker,
        row.skipCategory,
        row.skipCode,
        row.reasonRaw,
        row.occurredAt
      ]
        .map(csvEscape)
        .join(",")
    );

    await this.auditService.recordAccepted({
      actorUserId: args.actorUserId,
      query: { resource: "skips", timezone: args.query.timezone, format: "csv" },
      rowCount: rows.length
    });

    return [header.join(","), ...lines].join("\n");
  }

  private async exportAlertsCsv(args: {
    readonly actorUserId: string;
    readonly strategyScope: readonly string[];
    readonly query: Omit<AlertListQuery, "page" | "pageSize" | "detailLevel">;
  }): Promise<string> {
    const rows = await this.collectAlertRows(args);
    const header = [
      "alertId",
      "alertType",
      "severity",
      "status",
      "summary",
      "componentType",
      "componentKey",
      "latestSeenAt",
      "detailPath"
    ];
    const lines = rows.map((row) =>
      [
        row.alertId,
        row.alertType,
        row.severity,
        row.status,
        row.summary,
        row.componentType,
        row.componentKey,
        row.latestSeenAt,
        row.detailPath
      ]
        .map(csvEscape)
        .join(",")
    );

    await this.auditService.recordAccepted({
      actorUserId: args.actorUserId,
      query: { resource: "alerts", timezone: args.query.timezone, format: "csv" },
      rowCount: rows.length
    });

    return [header.join(","), ...lines].join("\n");
  }

  private async exportPnlCsv(args: {
    readonly actorUserId: string;
    readonly strategyScope: readonly string[];
    readonly query: PnlSummaryQuery;
  }): Promise<string> {
    const granularity = args.query.bucket === "24h" ? "hour" : "day";
    const [summary, timeseries] = await Promise.all([
      this.pnlService.getSummary({
        strategyScope: args.strategyScope,
        query: args.query
      }),
      this.pnlService.getTimeseries({
        strategyScope: args.strategyScope,
        query: {
          ...args.query,
          granularity
        } satisfies PnlTimeseriesQuery
      })
    ]);

    const header = [
      "recordType",
      "scopeType",
      "scopeKey",
      "label",
      "bucket",
      "rangeStartUtc",
      "rangeEndUtc",
      "bucketStart",
      "bucketEnd",
      "strategyId",
      "realizedPnlNet",
      "unrealizedPnlNet",
      "feesTotal",
      "totalPnlNet",
      "stale",
      "partial",
      "disagreement",
      "freshnessTimestamp",
      "wins",
      "losses",
      "winRate",
      "metadata"
    ];
    const lines = this.buildPnlRows(summary, timeseries).map((row) =>
      row.map(csvEscape).join(",")
    );

    await this.auditService.recordAccepted({
      actorUserId: args.actorUserId,
      query: { resource: "pnl", timezone: args.query.timezone, format: "csv" },
      rowCount: lines.length
    });

    return [header.join(","), ...lines].join("\n");
  }

  private async collectDecisionRows(args: {
    readonly strategyScope: readonly string[];
    readonly query: Omit<DecisionListQuery, "page" | "pageSize" | "detailLevel">;
  }) {
    const exportPageSize = getPaginationLimits("exports").maxPageSize;
    const rows: DecisionListResponse["items"] = [];
    let page = 1;

    while (true) {
      const response = await this.decisionService.list({
        strategyScope: args.strategyScope,
        query: {
          ...args.query,
          page,
          pageSize: exportPageSize,
          detailLevel: "standard"
        } satisfies DecisionListQuery
      });
      rows.push(...response.items);

      if (page >= response.pageInfo.totalPages) {
        return rows;
      }
      page += 1;
    }
  }

  private async collectTradeRows(args: {
    readonly strategyScope: readonly string[];
    readonly query: Omit<TradeListQuery, "page" | "pageSize" | "detailLevel">;
  }) {
    const exportPageSize = getPaginationLimits("exports").maxPageSize;
    const rows: TradeListResponse["items"] = [];
    let page = 1;

    while (true) {
      const response = await this.tradeService.list({
        strategyScope: args.strategyScope,
        query: {
          ...args.query,
          page,
          pageSize: exportPageSize,
          detailLevel: "standard"
        } satisfies TradeListQuery
      });
      rows.push(...response.items);

      if (page >= response.pageInfo.totalPages) {
        return rows;
      }
      page += 1;
    }
  }

  private async collectSkipRows(args: {
    readonly strategyScope: readonly string[];
    readonly query: Omit<SkipListQuery, "page" | "pageSize">;
  }): Promise<SkipListResponse["items"]> {
    const exportPageSize = getPaginationLimits("exports").maxPageSize;
    const rows: SkipListResponse["items"] = [];
    let page = 1;

    while (true) {
      const response = await this.skipService.list({
        strategyScope: args.strategyScope,
        query: {
          ...args.query,
          page,
          pageSize: exportPageSize
        } satisfies SkipListQuery
      });
      rows.push(...response.items);

      if (page >= response.pageInfo.totalPages) {
        return rows;
      }
      page += 1;
    }
  }

  private async collectAlertRows(args: {
    readonly strategyScope: readonly string[];
    readonly query: Omit<AlertListQuery, "page" | "pageSize" | "detailLevel">;
  }): Promise<AlertListResponse["items"]> {
    const exportPageSize = getPaginationLimits("exports").maxPageSize;
    const rows: AlertListResponse["items"] = [];
    let page = 1;

    while (true) {
      const response = await this.alertService.list({
        strategyScope: args.strategyScope,
        query: {
          ...args.query,
          page,
          pageSize: exportPageSize,
          detailLevel: "standard"
        } satisfies AlertListQuery
      });
      rows.push(...response.items);

      if (page >= response.pageInfo.totalPages) {
        return rows;
      }
      page += 1;
    }
  }

  private buildPnlRows(
    summary: PnlSummaryResponse,
    timeseries: PnlTimeseriesResponse
  ): string[][] {
    const rows: string[][] = [];

    rows.push([
      "portfolio_summary",
      summary.portfolioSummary.scopeType,
      summary.portfolioSummary.scopeKey,
      "Portfolio",
      summary.bucket,
      summary.rangeStartUtc ?? "",
      summary.rangeEndUtc ?? "",
      "",
      "",
      "",
      String(summary.portfolioSummary.realizedPnlNet),
      String(summary.portfolioSummary.unrealizedPnlNet),
      String(summary.portfolioSummary.feesTotal),
      String(
        summary.portfolioSummary.realizedPnlNet +
          summary.portfolioSummary.unrealizedPnlNet
      ),
      String(summary.portfolioSummary.stale),
      String(summary.portfolioSummary.partial),
      String(summary.portfolioSummary.disagreementCount > 0),
      summary.portfolioSummary.freshnessTimestamp ?? "",
      "",
      "",
      "",
      ""
    ]);

    for (const row of summary.strategyBreakdown) {
      rows.push(this.pnlAttributionToCsvRow("strategy_breakdown", summary, row));
    }
    for (const row of summary.symbolBreakdown) {
      rows.push(this.pnlAttributionToCsvRow("symbol_breakdown", summary, row));
    }
    for (const row of summary.marketBreakdown) {
      rows.push(this.pnlAttributionToCsvRow("market_breakdown", summary, row));
    }
    for (const item of summary.compare) {
      rows.push([
        "compare_summary",
        item.summary.scopeType,
        item.summary.scopeKey,
        item.label,
        summary.bucket,
        summary.rangeStartUtc ?? "",
        summary.rangeEndUtc ?? "",
        "",
        "",
        item.strategyId,
        String(item.summary.realizedPnlNet),
        String(item.summary.unrealizedPnlNet),
        String(item.summary.feesTotal),
        String(item.summary.totalPnlNet),
        String(item.summary.stale),
        String(item.summary.partial),
        String(item.summary.disagreement),
        item.summary.freshnessTimestamp ?? "",
        "",
        "",
        "",
        serializeMetadata(item.summary.metadata)
      ]);
    }
    for (const point of timeseries.series) {
      rows.push([
        "timeseries",
        "portfolio",
        "portfolio",
        "Portfolio",
        timeseries.bucket,
        timeseries.rangeStartUtc,
        timeseries.rangeEndUtc,
        point.bucketStart,
        point.bucketEnd,
        "",
        String(point.realizedPnlNet),
        String(point.unrealizedPnlNet),
        String(point.feesTotal),
        String(point.totalPnlNet),
        String(point.stale),
        String(point.partial),
        "",
        "",
        "",
        "",
        "",
        ""
      ]);
    }
    for (const row of timeseries.attribution) {
      rows.push(this.pnlAttributionToCsvRow("timeseries_attribution", timeseries, row));
    }

    rows.push([
      "win_loss",
      "",
      "",
      "Win/Loss Summary",
      timeseries.bucket,
      timeseries.rangeStartUtc,
      timeseries.rangeEndUtc,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      String(timeseries.winLossSummary.wins),
      String(timeseries.winLossSummary.losses),
      String(timeseries.winLossSummary.winRate),
      ""
    ]);

    return rows;
  }

  private pnlAttributionToCsvRow(
    recordType: string,
    response: Pick<PnlSummaryResponse, "bucket" | "rangeStartUtc" | "rangeEndUtc"> | Pick<PnlTimeseriesResponse, "bucket" | "rangeStartUtc" | "rangeEndUtc">,
    row: PnlSummaryResponse["strategyBreakdown"][number] | PnlTimeseriesResponse["attribution"][number]
  ): string[] {
    return [
      recordType,
      row.scopeType,
      row.scopeKey,
      row.label,
      response.bucket,
      response.rangeStartUtc ?? "",
      response.rangeEndUtc ?? "",
      "",
      "",
      row.scopeType === "strategy" ? row.scopeKey : "",
      String(row.realizedPnlNet),
      String(row.unrealizedPnlNet),
      String(row.feesTotal),
      String(row.totalPnlNet),
      String(row.stale),
      String(row.partial),
      String(row.disagreement),
      row.freshnessTimestamp ?? "",
      "",
      "",
      "",
      serializeMetadata(row.metadata)
    ];
  }
}
