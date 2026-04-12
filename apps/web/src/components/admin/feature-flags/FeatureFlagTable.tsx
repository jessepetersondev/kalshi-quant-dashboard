import type { FeatureFlagState } from "@kalshi-quant-dashboard/contracts";

export function FeatureFlagTable(props: {
  readonly items: readonly FeatureFlagState[];
  readonly selectedKey: string | null;
  readonly onSelect: (featureFlagKey: string) => void;
}) {
  return (
    <section className="admin-panel">
      <h3>Feature flags</h3>
      <div className="timeline-list">
        {props.items.map((flag) => (
          <button
            key={flag.featureFlagKey}
            className={`admin-list-item${props.selectedKey === flag.featureFlagKey ? " active" : ""}`}
            onClick={() => props.onSelect(flag.featureFlagKey)}
            type="button"
          >
            <strong>{flag.featureFlagKey}</strong>
            <span className="muted">{flag.enabled ? "enabled" : "disabled"}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
