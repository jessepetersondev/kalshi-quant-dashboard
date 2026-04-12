import type { AccessPolicyDetail } from "@kalshi-quant-dashboard/contracts";

export function PolicyAuditPanel(props: { readonly policy: AccessPolicyDetail | null }) {
  if (!props.policy) {
    return null;
  }

  return (
    <section className="admin-panel">
      <h3>Recent audit</h3>
      <div className="timeline-list">
        {props.policy.auditTrail.length === 0 ? (
          <span className="muted">No audit entries yet.</span>
        ) : (
          props.policy.auditTrail.map((entry) => (
            <div className="timeline-item" key={entry.auditLogId}>
              <div className="detail-header">
                <strong>{entry.action}</strong>
                <span className="muted">{entry.result}</span>
              </div>
              <div className="muted">{entry.actorUserId}</div>
              <div className="muted">{entry.occurredAt}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
