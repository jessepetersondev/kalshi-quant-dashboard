import type { AccessPolicyListItem } from "@kalshi-quant-dashboard/contracts";

export function PolicyList(props: {
  readonly items: readonly AccessPolicyListItem[];
  readonly selectedPolicyId: string | null;
  readonly onSelect: (accessPolicyId: string) => void;
  readonly onCreateNew: () => void;
}) {
  return (
    <section className="admin-panel">
      <div className="detail-header">
        <h3>Policies</h3>
        <button className="primary-button" onClick={props.onCreateNew} type="button">
          New policy
        </button>
      </div>
      <div className="timeline-list">
        {props.items.map((policy) => (
          <button
            key={policy.accessPolicyId}
            className={`admin-list-item${
              props.selectedPolicyId === policy.accessPolicyId ? " active" : ""
            }`}
            onClick={() => props.onSelect(policy.accessPolicyId)}
            type="button"
          >
            <strong>{policy.name}</strong>
            <span className="muted">
              {policy.subjectType}:{policy.subjectKey}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
