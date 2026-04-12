import {
  tradeDetailResponseSchema,
  tradeListQuerySchema,
  type EffectiveCapability,
  type TradeDetailResponse,
  type TradeListQuery,
  type TradeListResponse
} from "@kalshi-quant-dashboard/contracts";

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
    private readonly visibilityService = new DetailVisibilityService()
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
    const [timeline, fills, rawPayloads, debugMetadata] = await Promise.all([
      this.detailService.getTimeline(args.correlationId),
      projectFillFacts(args.correlationId),
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
      rawPayloadAvailable: visibility.rawPayloadAvailable,
      rawPayloads,
      debugMetadata
    });
  }
}
