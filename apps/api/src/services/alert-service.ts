import {
  type AlertDetailResponse,
  alertListQuerySchema,
  type AlertListQuery,
  type EffectiveCapability
} from "@kalshi-quant-dashboard/contracts";

import {
  projectAlertDetail,
  projectAlertList
} from "../../../ingest/src/projections/alert-projector.js";
import { DetailVisibilityService } from "./detail-visibility-service.js";
import { normalizePaginationQuery } from "./pagination.js";

export class AlertService {
  constructor(private readonly visibilityService = new DetailVisibilityService()) {}

  parseListQuery(input: unknown): AlertListQuery {
    return normalizePaginationQuery("alerts", alertListQuerySchema.parse(input ?? {}));
  }

  async list(args: {
    readonly strategyScope: readonly string[];
    readonly query: AlertListQuery;
  }) {
    return projectAlertList(args);
  }

  async getDetail(args: {
    readonly alertId: string;
    readonly effectiveCapability: EffectiveCapability;
    readonly detailLevel: "standard" | "debug";
  }): Promise<AlertDetailResponse | null> {
    const visibility = this.visibilityService.resolve({
      effectiveCapability: args.effectiveCapability,
      detailLevel: args.detailLevel
    });

    return projectAlertDetail({
      alertId: args.alertId,
      strategyScope: args.effectiveCapability.strategyScope,
      includeRawPayloads: visibility.includeRawPayloads
    });
  }
}
