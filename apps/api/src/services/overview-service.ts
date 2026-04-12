import {
  projectLatestProjectionChangeId,
  projectOverviewSnapshot
} from "../../../ingest/src/projections/overview-projector.js";

export class OverviewService {
  async getOverview(args: { readonly strategyScope: readonly string[] }) {
    return projectOverviewSnapshot(args);
  }

  async getLatestProjectionChangeId(): Promise<number> {
    return projectLatestProjectionChangeId();
  }
}
