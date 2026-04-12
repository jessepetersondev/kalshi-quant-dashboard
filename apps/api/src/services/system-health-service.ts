import { projectSystemHealth } from "../../../ingest/src/projections/system-health-projector.js";

export class SystemHealthService {
  async getSnapshot(args: {
    readonly strategyScope: readonly string[];
  }) {
    return projectSystemHealth(args);
  }
}
