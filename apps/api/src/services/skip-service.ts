import {
  skipListQuerySchema,
  type SkipListQuery
} from "@kalshi-quant-dashboard/contracts";

import { projectSkipList } from "../../../ingest/src/projections/skip-event-projector.js";
import { normalizePaginationQuery } from "./pagination.js";

export class SkipService {
  parseListQuery(input: unknown): SkipListQuery {
    return normalizePaginationQuery("skips", skipListQuerySchema.parse(input ?? {}));
  }

  async list(args: {
    readonly strategyScope: readonly string[];
    readonly query: SkipListQuery;
  }) {
    return projectSkipList(args);
  }
}
