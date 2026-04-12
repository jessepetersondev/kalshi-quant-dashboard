import { ConvergenceService } from "./convergence-service.js";

export class TerminalGapJob {
  constructor(private readonly convergenceService = new ConvergenceService()) {}

  async run(maxAgeMinutes?: number): Promise<number> {
    return this.convergenceService.reconcileMissingTerminalEvents(maxAgeMinutes);
  }
}
