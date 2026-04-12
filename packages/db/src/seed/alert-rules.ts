import type { PoolClient } from "pg";

export async function seedAlertRulesTable(client: PoolClient): Promise<void> {
  const rules = [
    {
      alertRuleId: "alert-rule-backlog-age",
      ruleKey: "queue_backlog_age_default",
      alertType: "queue_backlog_age",
      scopeType: "queue",
      scopeKey: "kalshi.integration.executor",
      threshold: { warningMs: 30_000, criticalMs: 300_000 }
    },
    {
      alertRuleId: "alert-rule-missing-heartbeat",
      ruleKey: "missing_heartbeat_default",
      alertType: "missing_heartbeat",
      scopeType: "strategy",
      scopeKey: "*",
      threshold: { warningSeconds: 30, criticalSeconds: 120 }
    },
    {
      alertRuleId: "alert-rule-dlq-growth",
      ruleKey: "dlq_growth_default",
      alertType: "dlq_growth",
      scopeType: "queue",
      scopeKey: "kalshi.integration.executor.dlq",
      threshold: { growthCount: 1 }
    }
  ] as const;

  for (const rule of rules) {
    await client.query(
      `
        insert into alert_rules (
          alert_rule_id,
          rule_key,
          alert_type,
          scope_type,
          scope_key,
          threshold,
          enabled,
          version,
          updated_by_user_id
        )
        values ($1, $2, $3, $4, $5, $6::jsonb, true, 0, 'user-admin')
        on conflict (alert_rule_id) do update
        set rule_key = excluded.rule_key,
            alert_type = excluded.alert_type,
            scope_type = excluded.scope_type,
            scope_key = excluded.scope_key,
            threshold = excluded.threshold,
            enabled = excluded.enabled,
            updated_at = now()
      `,
      [
        rule.alertRuleId,
        rule.ruleKey,
        rule.alertType,
        rule.scopeType,
        rule.scopeKey,
        JSON.stringify(rule.threshold)
      ]
    );
  }
}
