import type { AuditLogEntry } from "@kalshi-quant-dashboard/contracts";

export function AuditLogTable(props: { readonly items: readonly AuditLogEntry[] }) {
  return (
    <section className="admin-panel">
      <h3>Audit log</h3>
      <div className="timeline-list">
        {props.items.map((entry) => (
          <div className="timeline-item" key={entry.auditLogId}>
            <div className="detail-header">
              <strong>{entry.action}</strong>
              <span className="muted">{entry.result}</span>
            </div>
            <div className="muted">
              {entry.targetType}:{entry.targetId}
            </div>
            <div className="muted">{entry.actorUserId}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
