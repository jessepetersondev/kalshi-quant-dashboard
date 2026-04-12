import type { CollectorHandle } from "../../collectors/collector-runner.js";
import { HttpSourceCollector } from "../../runtime/http-source-collector.js";
import type { SourceIngestService } from "../../services/source-ingest-service.js";
import { sourceProfiles, type StrategyDefinition } from "@kalshi-quant-dashboard/source-adapters";

function joinUrl(baseUrl: string, path: string): string {
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

export function buildStrategyHealthCollector(
  strategy: StrategyDefinition,
  sourceIngestService: SourceIngestService
): CollectorHandle {
  return new HttpSourceCollector({
    name: `${strategy.strategyId}-health`,
    url: joinUrl(strategy.baseUrl, strategy.healthPath),
    sourceProfile: sourceProfiles.quantHealthV1,
    sourceRepo: strategy.repoName,
    strategyId: strategy.strategyId,
    sourceIngestService
  });
}
