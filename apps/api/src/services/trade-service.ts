import {
  tradeDetailResponseSchema,
  tradeListQuerySchema,
  type EffectiveCapability,
  type TradeDetailResponse,
  type TradeListQuery,
  type TradeListResponse
} from "@kalshi-quant-dashboard/contracts";
import { createRuntimeConfig, type RuntimeConfig } from "@kalshi-quant-dashboard/config";
import { query } from "@kalshi-quant-dashboard/db";

import { projectFillFacts } from "../../../ingest/src/projections/fill-fact-projector.js";
import {
  projectTradeAttemptList,
  projectTradeAttemptSummary
} from "../../../ingest/src/projections/trade-attempt-projector.js";
import { DetailService } from "./detail-service.js";
import { DetailVisibilityService } from "./detail-visibility-service.js";
import { normalizePaginationQuery, shouldExpandSearchToAllTime } from "./pagination.js";

export class TradeService {
  constructor(
    private readonly detailService = new DetailService(),
    private readonly visibilityService = new DetailVisibilityService(),
    private readonly runtimeConfig: RuntimeConfig = createRuntimeConfig()
  ) {}

  parseListQuery(input: unknown): TradeListQuery {
    const parsed = normalizePaginationQuery("trades", tradeListQuerySchema.parse(input ?? {}));

    if (shouldExpandSearchToAllTime(input, parsed)) {
      return {
        ...parsed,
        range: "all-time"
      };
    }

    return parsed;
  }

  async list(args: {
    readonly strategyScope: readonly string[];
    readonly query: TradeListQuery;
  }): Promise<TradeListResponse> {
    return projectTradeAttemptList(args);
  }

  async getDetail(args: {
    readonly correlationId: string;
    readonly effectiveCapability: EffectiveCapability;
    readonly detailLevel: "standard" | "debug";
  }): Promise<TradeDetailResponse | null> {
    const summary = await projectTradeAttemptSummary(
      args.correlationId,
      args.effectiveCapability.strategyScope
    );
    if (!summary) {
      return null;
    }

    const visibility = this.visibilityService.resolve({
      effectiveCapability: args.effectiveCapability,
      detailLevel: args.detailLevel
    });
    const [timeline, fills, publisherDashboardLink, rawPayloads, debugMetadata] = await Promise.all([
      this.detailService.getTimeline(args.correlationId),
      projectFillFacts(args.correlationId),
      this.getPublisherDashboardLink(args.correlationId),
      visibility.includeRawPayloads
        ? this.detailService.getRawPayloadEntries(args.correlationId)
        : Promise.resolve(undefined),
      visibility.includeDebugMetadata
        ? this.detailService.getDebugMetadata(args.correlationId)
        : Promise.resolve(undefined)
    ]);

    return tradeDetailResponseSchema.parse({
      summary,
      timeline,
      fills,
      publisherDashboardLink,
      rawPayloadAvailable: visibility.rawPayloadAvailable,
      rawPayloads,
      debugMetadata
    });
  }

  private async getPublisherDashboardLink(correlationId: string): Promise<string | undefined> {
    const result = await query<{
      publisher_order_id: string | null;
      target_publisher_order_id: string | null;
    }>(
      `
        select
          t.publisher_order_id,
          t.target_publisher_order_id
        from trades t
        where t.correlation_id = $1
        order by coalesce(t.updated_at, t.occurred_at) desc, t.trade_id desc
        limit 1
      `,
      [correlationId]
    );

    const url = new URL("/dashboard/index.html", this.runtimeConfig.publisherBaseUrl);
    const row = result.rows[0];
    const orderId = row?.publisher_order_id ?? row?.target_publisher_order_id ?? null;

    if (orderId) {
      url.searchParams.set("orderId", orderId);
    }

    url.searchParams.set("correlationId", correlationId);
    url.hash = "outcomes";

    return url.toString();
  }
}
