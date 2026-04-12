import { useEffect, useState } from "react";

import type { AlertRuleConfig } from "@kalshi-quant-dashboard/contracts";
import { FormField } from "@kalshi-quant-dashboard/ui";

export function AlertRuleForm(props: {
  readonly rule: AlertRuleConfig | null;
  readonly onSave: (body: {
    alertRuleId: string;
    version: number;
    severity: AlertRuleConfig["severity"];
    thresholdValue: number;
    thresholdUnit: string;
    enabled: boolean;
    reason: string;
  }) => Promise<void>;
}) {
  const [severity, setSeverity] = useState<AlertRuleConfig["severity"]>("warning");
  const [thresholdValue, setThresholdValue] = useState(0);
  const [thresholdUnit, setThresholdUnit] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [reason, setReason] = useState("");

  useEffect(() => {
    setSeverity(props.rule?.severity ?? "warning");
    setThresholdValue(props.rule?.thresholdValue ?? 0);
    setThresholdUnit(props.rule?.thresholdUnit ?? "");
    setEnabled(props.rule?.enabled ?? true);
    setReason("");
  }, [props.rule]);

  if (!props.rule) {
    return null;
  }

  return (
    <section className="admin-panel">
      <div className="detail-header">
        <h3>{props.rule.ruleKey}</h3>
        <button
          className="primary-button"
          onClick={() =>
            void props.onSave({
              alertRuleId: props.rule!.alertRuleId,
              version: props.rule!.version,
              severity,
              thresholdValue,
              thresholdUnit,
              enabled,
              reason
            })
          }
          type="button"
        >
          Save
        </button>
      </div>
      <div className="admin-form-grid">
        <FormField htmlFor="alert-rule-severity" label="Severity">
          <select
            value={severity}
            onChange={(event) => setSeverity(event.target.value as AlertRuleConfig["severity"])}
          >
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </FormField>
        <FormField htmlFor="alert-rule-threshold-value" label="Threshold value">
          <input
            value={thresholdValue}
            onChange={(event) => setThresholdValue(Number(event.target.value || 0))}
            type="number"
          />
        </FormField>
        <FormField htmlFor="alert-rule-threshold-unit" label="Threshold unit">
          <input
            value={thresholdUnit}
            onChange={(event) => setThresholdUnit(event.target.value)}
            type="text"
          />
        </FormField>
        <FormField htmlFor="alert-rule-enabled" label="Enabled">
          <input
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            type="checkbox"
          />
        </FormField>
      </div>
      <FormField
        hint="Explain the operational reason for this threshold change."
        htmlFor="alert-rule-reason"
        label="Reason"
      >
        <input value={reason} onChange={(event) => setReason(event.target.value)} type="text" />
      </FormField>
    </section>
  );
}
