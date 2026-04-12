import { PnlReconciliationService } from "../services/pnl-reconciliation-service.js";

export class PnlResyncJob {
  constructor(private readonly reconciliationService = new PnlReconciliationService()) {}

  async run(strategyIds: readonly string[]): Promise<number> {
    return this.reconciliationService.reconcileStrategies(strategyIds);
  }
}
