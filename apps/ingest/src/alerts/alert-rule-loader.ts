import { AlertRuleConfigRepo } from "@kalshi-quant-dashboard/db";

export class AlertRuleLoader {
  constructor(private readonly repo = new AlertRuleConfigRepo()) {}

  async load() {
    return this.repo.list();
  }
}
