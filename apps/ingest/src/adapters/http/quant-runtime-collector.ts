import type { CollectorHandle } from "../../collectors/collector-runner.js";
import { HttpSourceCollector } from "../../runtime/http-source-collector.js";
import type { SourceIngestService } from "../../services/source-ingest-service.js";
import { sourceProfiles, type StrategyDefinition } from "@kalshi-quant-dashboard/source-adapters";

function joinUrl(baseUrl: string, path: string): string {
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

export function buildQuantRuntimeCollectors(
  strategy: StrategyDefinition,
  sourceIngestService: SourceIngestService
): CollectorHandle[] {
  const collectors: CollectorHandle[] = [
    new HttpSourceCollector({
      name: `${strategy.strategyId}-status`,
      url: joinUrl(strategy.baseUrl, strategy.statusPath),
      sourceProfile: sourceProfiles.quantStatusV1,
      sourceRepo: strategy.repoName,
      strategyId: strategy.strategyId,
      sourceIngestService
    }),
    new HttpSourceCollector({
      name: `${strategy.strategyId}-positions`,
      url: joinUrl(strategy.baseUrl, strategy.positionsPath),
      sourceProfile: sourceProfiles.quantPositionsV1,
      sourceRepo: strategy.repoName,
      strategyId: strategy.strategyId,
      sourceIngestService
    }),
    new HttpSourceCollector({
      name: `${strategy.strategyId}-trades`,
      url: joinUrl(strategy.baseUrl, strategy.tradesPath),
      sourceProfile: sourceProfiles.quantTradesV1,
      sourceRepo: strategy.repoName,
      strategyId: strategy.strategyId,
      sourceIngestService
    }),
    new HttpSourceCollector({
      name: `${strategy.strategyId}-orders`,
      url: joinUrl(strategy.baseUrl, strategy.ordersPath),
      sourceProfile: sourceProfiles.quantOrdersV1,
      sourceRepo: strategy.repoName,
      strategyId: strategy.strategyId,
      sourceIngestService
    }),
    new HttpSourceCollector({
      name: `${strategy.strategyId}-pnl`,
      url: joinUrl(strategy.baseUrl, strategy.pnlPath),
      sourceProfile: sourceProfiles.quantPnlV1,
      sourceRepo: strategy.repoName,
      strategyId: strategy.strategyId,
      sourceIngestService
    }),
    new HttpSourceCollector({
      name: `${strategy.strategyId}-realized-pnl`,
      url: joinUrl(strategy.baseUrl, strategy.realizedPnlPath),
      sourceProfile: sourceProfiles.quantRealizedPnlV1,
      sourceRepo: strategy.repoName,
      strategyId: strategy.strategyId,
      sourceIngestService
    })
  ];

  if (strategy.dashboardLivePath) {
    collectors.push(
      new HttpSourceCollector({
        name: `${strategy.strategyId}-dashboard-live`,
        url: joinUrl(strategy.baseUrl, strategy.dashboardLivePath),
        sourceProfile: sourceProfiles.quantDashboardLiveV1,
        sourceRepo: strategy.repoName,
        strategyId: strategy.strategyId,
        sourceIngestService
      })
    );
  }

  if (strategy.skipDiagnosticsPath) {
    collectors.push(
      new HttpSourceCollector({
        name: `${strategy.strategyId}-skip-diagnostics`,
        url: joinUrl(strategy.baseUrl, strategy.skipDiagnosticsPath),
        sourceProfile: sourceProfiles.quantNoTradeDiagnosticsV1,
        sourceRepo: strategy.repoName,
        strategyId: strategy.strategyId,
        sourceIngestService
      })
    );
  }

  return collectors;
}
