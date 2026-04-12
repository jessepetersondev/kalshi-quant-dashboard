import { sourceProfiles } from "@kalshi-quant-dashboard/source-adapters";

import type { CollectorHandle } from "../../collectors/collector-runner.js";
import { HttpSourceCollector } from "../../runtime/http-source-collector.js";
import type { SourceIngestService } from "../../services/source-ingest-service.js";

function joinUrl(baseUrl: string, path: string): string {
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

export function buildExecutorHealthCollector(args: {
  readonly baseUrl: string;
  readonly sourceIngestService: SourceIngestService;
}): CollectorHandle {
  return new HttpSourceCollector({
    name: "executor-health",
    url: joinUrl(args.baseUrl, "/health"),
    sourceProfile: sourceProfiles.quantHealthV1,
    sourceRepo: "kalshi-integration-executor",
    sourceIngestService: args.sourceIngestService
  });
}
