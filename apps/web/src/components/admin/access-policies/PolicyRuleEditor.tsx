import type { AccessPolicyRule } from "@kalshi-quant-dashboard/contracts";

const emptyRule = (): Omit<AccessPolicyRule, "accessPolicyId" | "accessPolicyRuleId"> => ({
  ruleType: "strategy_scope",
  effect: "allow",
  strategyScope: ["btc"],
  adminSurfaces: undefined,
  enabled: true,
  notes: null
});

export function PolicyRuleEditor(props: {
  readonly rules: readonly Omit<AccessPolicyRule, "accessPolicyId" | "accessPolicyRuleId">[];
  readonly onChange: (
    rules: readonly Omit<AccessPolicyRule, "accessPolicyId" | "accessPolicyRuleId">[]
  ) => void;
}) {
  const rules = props.rules.length > 0 ? props.rules : [emptyRule()];

  return (
    <div className="admin-subsection">
      <div className="detail-header">
        <strong>Rules</strong>
        <button
          className="secondary-button"
          onClick={() => props.onChange([...rules, emptyRule()])}
          type="button"
        >
          Add rule
        </button>
      </div>
      {rules.map((rule, index) => (
        <div className="admin-form-grid" key={`rule-${index}`}>
          <label className="field">
            <span>Rule type</span>
            <select
              value={rule.ruleType}
              onChange={(event) => {
                const next = [...rules];
                next[index] = {
                  ...rule,
                  ruleType: event.target.value as AccessPolicyRule["ruleType"],
                  adminSurfaces:
                    event.target.value === "admin_surface" ? ["feature_flags"] : undefined
                };
                props.onChange(next);
              }}
            >
              <option value="strategy_scope">Strategy scope</option>
              <option value="raw_payload">Raw payload</option>
              <option value="debug_stream">Debug stream</option>
              <option value="privileged_audit">Privileged audit</option>
              <option value="admin_surface">Admin surface</option>
            </select>
          </label>
          <label className="field">
            <span>Effect</span>
            <select
              value={rule.effect}
              onChange={(event) => {
                const next = [...rules];
                next[index] = {
                  ...rule,
                  effect: event.target.value as AccessPolicyRule["effect"]
                };
                props.onChange(next);
              }}
            >
              <option value="allow">Allow</option>
              <option value="deny">Deny</option>
            </select>
          </label>
          {rule.ruleType === "strategy_scope" ? (
            <label className="field">
              <span>Strategy scope</span>
              <input
                value={(rule.strategyScope ?? []).join(",")}
                onChange={(event) => {
                  const next = [...rules];
                  next[index] = {
                    ...rule,
                    strategyScope: event.target.value
                      .split(",")
                      .map((entry) => entry.trim())
                      .filter(Boolean)
                  };
                  props.onChange(next);
                }}
                type="text"
              />
            </label>
          ) : null}
          {rule.ruleType === "admin_surface" ? (
            <label className="field">
              <span>Admin surface</span>
              <select
                value={rule.adminSurfaces?.[0] ?? "feature_flags"}
                onChange={(event) => {
                  const next = [...rules];
                  next[index] = {
                    ...rule,
                    adminSurfaces: [event.target.value as NonNullable<AccessPolicyRule["adminSurfaces"]>[number]]
                  };
                  props.onChange(next);
                }}
              >
                <option value="access_policies">Access policies</option>
                <option value="feature_flags">Feature flags</option>
                <option value="alert_rules">Alert rules</option>
                <option value="audit_logs">Audit logs</option>
              </select>
            </label>
          ) : null}
          <button
            className="icon-button"
            onClick={() => props.onChange(rules.filter((_, ruleIndex) => ruleIndex !== index))}
            type="button"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
