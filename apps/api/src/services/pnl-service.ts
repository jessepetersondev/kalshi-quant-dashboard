import {
  pnlSummaryQuerySchema,
  pnlTimeseriesQuerySchema,
  type PnlSummaryQuery,
  type PnlTimeseriesQuery
} from "@kalshi-quant-dashboard/contracts";

import {
  projectPnlSummary,
  projectPnlTimeseries
} from "../../../ingest/src/projections/pnl-snapshot-projector.js";

export class PnlService {
  parseSummaryQuery(input: unknown): PnlSummaryQuery {
    return pnlSummaryQuerySchema.parse(input ?? {});
  }

  parseTimeseriesQuery(input: unknown): PnlTimeseriesQuery {
    return pnlTimeseriesQuerySchema.parse(input ?? {});
  }

  async getSummary(args: {
    readonly strategyScope: readonly string[];
    readonly query: PnlSummaryQuery;
  }) {
    return projectPnlSummary(args);
  }

  async getTimeseries(args: {
    readonly strategyScope: readonly string[];
    readonly query: PnlTimeseriesQuery;
  }) {
    return projectPnlTimeseries(args);
  }
}
