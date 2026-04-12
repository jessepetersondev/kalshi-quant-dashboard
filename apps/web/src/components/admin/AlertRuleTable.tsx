import type { AlertRuleConfig } from "@kalshi-quant-dashboard/contracts";

export function AlertRuleTable(props: {
  readonly items: readonly AlertRuleConfig[];
  readonly selectedId: string | null;
  readonly onSelect: (alertRuleId: string) => void;
}) {
  return (
    <section className="admin-panel">
      <h3>Alert rules</h3>
      <div className="timeline-list">
        {props.items.map((rule) => (
          <button
            key={rule.alertRuleId}
            className={`admin-list-item${props.selectedId === rule.alertRuleId ? " active" : ""}`}
            onClick={() => props.onSelect(rule.alertRuleId)}
            type="button"
          >
            <strong>{rule.ruleKey}</strong>
            <span className="muted">
              {rule.thresholdValue} {rule.thresholdUnit}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
