import type { AlertRuleConfig } from "@kalshi-quant-dashboard/contracts";

export interface AlertEvaluationInput {
  readonly value: number;
}

export interface AlertEvaluationResult {
  readonly triggered: boolean;
  readonly severity: AlertRuleConfig["severity"];
}

export class AlertEvaluator {
  evaluate(rule: AlertRuleConfig, input: AlertEvaluationInput): AlertEvaluationResult {
    const triggered =
      rule.comparisonOperator === "lte" || rule.comparisonOperator === "lt"
        ? input.value <= rule.thresholdValue
        : input.value >= rule.thresholdValue;

    return {
      triggered,
      severity: rule.severity
    };
  }
}
