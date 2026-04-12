import {
  decisionDetailResponseSchema,
  decisionListQuerySchema,
  type DecisionDetailResponse,
  type DecisionListQuery,
  type DecisionListResponse,
  type EffectiveCapability
} from "@kalshi-quant-dashboard/contracts";

import {
  projectDecisionLifecycleList,
  projectDecisionSummary
} from "../../../ingest/src/projections/decision-lifecycle-projector.js";
import { projectTradeAttemptList } from "../../../ingest/src/projections/trade-attempt-projector.js";
import { DetailService } from "./detail-service.js";
import { DetailVisibilityService } from "./detail-visibility-service.js";
import { normalizePaginationQuery, shouldExpandSearchToAllTime } from "./pagination.js";

export class DecisionService {
  constructor(
    private readonly detailService = new DetailService(),
    private readonly visibilityService = new DetailVisibilityService()
  ) {}

  parseListQuery(input: unknown): DecisionListQuery {
    const parsed = normalizePaginationQuery("decisions", decisionListQuerySchema.parse(input ?? {}));

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
    readonly query: DecisionListQuery;
  }): Promise<DecisionListResponse> {
    return projectDecisionLifecycleList(args);
  }

  async getDetail(args: {
    readonly correlationId: string;
    readonly effectiveCapability: EffectiveCapability;
    readonly detailLevel: "standard" | "debug";
  }): Promise<DecisionDetailResponse | null> {
    const summary = await projectDecisionSummary(
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
    const [timeline, relatedTradeList, rawPayloads, debugMetadata] = await Promise.all([
      this.detailService.getTimeline(args.correlationId),
      projectTradeAttemptList({
        strategyScope: args.effectiveCapability.strategyScope,
        query: {
          page: 1,
          pageSize: 25,
          sort: "newest",
          search: args.correlationId,
          timezone: "utc",
          range: "all-time",
          detailLevel: "standard"
        }
      }),
      visibility.includeRawPayloads
        ? this.detailService.getRawPayloadEntries(args.correlationId)
        : Promise.resolve(undefined),
      visibility.includeDebugMetadata
        ? this.detailService.getDebugMetadata(args.correlationId)
        : Promise.resolve(undefined)
    ]);

    return decisionDetailResponseSchema.parse({
      summary,
      timeline,
      relatedTrades: relatedTradeList.items,
      rawPayloadAvailable: visibility.rawPayloadAvailable,
      rawPayloads,
      debugMetadata
    });
  }
}
