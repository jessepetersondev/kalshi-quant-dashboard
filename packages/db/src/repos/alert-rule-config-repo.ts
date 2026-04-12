import type {
  AlertRuleConfig,
  AlertRuleUpdateRequest
} from "@kalshi-quant-dashboard/contracts";
import { withClient } from "../client.js";

interface AlertRuleRow {
  readonly alert_rule_id: string;
  readonly rule_key: string;
  readonly alert_type: AlertRuleConfig["alertType"];
  readonly scope_type: string;
  readonly scope_key: string;
  readonly threshold: Record<string, unknown>;
  readonly enabled: boolean;
  readonly version: number;
  readonly updated_by_user_id: string;
  readonly updated_at: Date;
}

function getThresholdValue(threshold: Record<string, unknown>): number {
  const numeric = Object.values(threshold).find((value) => typeof value === "number");
  return typeof numeric === "number" ? numeric : 0;
}

function getThresholdUnit(threshold: Record<string, unknown>): string {
  const key = Object.keys(threshold)[0];
  return key ? key.replace(/(warning|critical|growth|count|seconds|ms)/gi, "").toLowerCase() || key : "count";
}

function mapAlertRule(row: AlertRuleRow): AlertRuleConfig {
  return {
    alertRuleId: row.alert_rule_id,
    ruleKey: row.rule_key,
    alertType: row.alert_type,
    scopeType: row.scope_type,
    scopeKey: row.scope_key,
    severity: "warning",
    comparisonOperator: "gte",
    thresholdValue: getThresholdValue(row.threshold),
    thresholdUnit: getThresholdUnit(row.threshold),
    evaluationWindowSeconds: null,
    consecutiveFailuresRequired: null,
    cooldownSeconds: null,
    enabled: row.enabled,
    configSource: row.version > 0 ? "admin_override" : "seed",
    version: row.version,
    updatedByUserId: row.updated_by_user_id,
    updatedAt: row.updated_at.toISOString()
  };
}

export class AlertRuleConfigRepo {
  async list(): Promise<AlertRuleConfig[]> {
    return withClient(async (client) => {
      const result = await client.query<AlertRuleRow>(
        `
          select alert_rule_id, rule_key, alert_type, scope_type, scope_key, threshold, enabled, version, updated_by_user_id, updated_at
          from alert_rules
          order by rule_key asc
        `
      );

      return result.rows.map(mapAlertRule);
    });
  }

  async get(alertRuleId: string): Promise<AlertRuleConfig | null> {
    return withClient(async (client) => {
      const result = await client.query<AlertRuleRow>(
        `
          select alert_rule_id, rule_key, alert_type, scope_type, scope_key, threshold, enabled, version, updated_by_user_id, updated_at
          from alert_rules
          where alert_rule_id = $1
          limit 1
        `,
        [alertRuleId]
      );

      return result.rows[0] ? mapAlertRule(result.rows[0]) : null;
    });
  }

  async update(
    alertRuleId: string,
    input: AlertRuleUpdateRequest,
    actorUserId: string
  ): Promise<{ before: AlertRuleConfig; after: AlertRuleConfig }> {
    return withClient(async (client) => {
      const existing = await this.get(alertRuleId);
      if (!existing) {
        throw new Error("ALERT_RULE_NOT_FOUND");
      }

      if (existing.version !== input.version) {
        throw new Error("ALERT_RULE_VERSION_CONFLICT");
      }

      const thresholdKey =
        input.thresholdUnit && input.thresholdUnit.trim().length > 0
          ? input.thresholdUnit.trim()
          : existing.thresholdUnit;
      const thresholdValue =
        input.thresholdValue !== undefined ? input.thresholdValue : existing.thresholdValue;

      await client.query(
        `
          update alert_rules
          set threshold = $2::jsonb,
              enabled = $3,
              version = version + 1,
              updated_by_user_id = $4,
              updated_at = now()
          where alert_rule_id = $1
        `,
        [
          alertRuleId,
          JSON.stringify({ [thresholdKey]: thresholdValue }),
          input.enabled ?? existing.enabled,
          actorUserId
        ]
      );

      const updated = await this.get(alertRuleId);
      if (!updated) {
        throw new Error(`Alert rule '${alertRuleId}' could not be reloaded.`);
      }

      return {
        before: existing,
        after: {
          ...updated,
          severity: input.severity ?? existing.severity,
          comparisonOperator: input.comparisonOperator ?? existing.comparisonOperator,
          evaluationWindowSeconds:
            input.evaluationWindowSeconds ?? existing.evaluationWindowSeconds,
          consecutiveFailuresRequired:
            input.consecutiveFailuresRequired ?? existing.consecutiveFailuresRequired,
          cooldownSeconds: input.cooldownSeconds ?? existing.cooldownSeconds
        }
      };
    });
  }
}
