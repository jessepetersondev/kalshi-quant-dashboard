import { operationsQuerySchema, type OperationsQuery } from "@kalshi-quant-dashboard/contracts";

import { projectOperationsSnapshot } from "../../../ingest/src/projections/system-health-projector.js";

export class OperationsService {
  parseQuery(input: unknown): OperationsQuery {
    return operationsQuerySchema.parse(input ?? {});
  }

  async getSnapshot(args: {
    readonly strategyScope: readonly string[];
  }) {
    return projectOperationsSnapshot(args);
  }
}
