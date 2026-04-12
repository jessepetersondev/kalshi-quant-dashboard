import type { ExportScopeGrant } from "@kalshi-quant-dashboard/contracts";

const emptyGrant = (): Omit<ExportScopeGrant, "accessPolicyId" | "exportScopeGrantId"> => ({
  resource: "decisions",
  strategyScope: ["btc"],
  columnProfile: "summary",
  enabled: true
});

export function ExportScopeEditor(props: {
  readonly grants: readonly Omit<ExportScopeGrant, "accessPolicyId" | "exportScopeGrantId">[];
  readonly onChange: (
    grants: readonly Omit<ExportScopeGrant, "accessPolicyId" | "exportScopeGrantId">[]
  ) => void;
}) {
  const grants = props.grants.length > 0 ? props.grants : [emptyGrant()];

  return (
    <div className="admin-subsection">
      <div className="detail-header">
        <strong>Export grants</strong>
        <button
          className="secondary-button"
          onClick={() => props.onChange([...grants, emptyGrant()])}
          type="button"
        >
          Add grant
        </button>
      </div>
      {grants.map((grant, index) => (
        <div className="admin-form-grid" key={`grant-${index}`}>
          <label className="field">
            <span>Resource</span>
            <select
              value={grant.resource}
              onChange={(event) => {
                const next = [...grants];
                next[index] = {
                  ...grant,
                  resource: event.target.value as ExportScopeGrant["resource"]
                };
                props.onChange(next);
              }}
            >
              <option value="decisions">Decisions</option>
              <option value="trades">Trades</option>
              <option value="skips">Skips</option>
              <option value="alerts">Alerts</option>
              <option value="pnl">PnL</option>
              <option value="operations">Operations</option>
              <option value="audit_logs">Audit logs</option>
            </select>
          </label>
          <label className="field">
            <span>Column profile</span>
            <select
              value={grant.columnProfile}
              onChange={(event) => {
                const next = [...grants];
                next[index] = {
                  ...grant,
                  columnProfile: event.target.value as ExportScopeGrant["columnProfile"]
                };
                props.onChange(next);
              }}
            >
              <option value="summary">Summary</option>
              <option value="detailed">Detailed</option>
              <option value="raw_payload">Raw payload</option>
            </select>
          </label>
          <label className="field">
            <span>Strategy scope</span>
            <input
              value={grant.strategyScope.join(",")}
              onChange={(event) => {
                const next = [...grants];
                next[index] = {
                  ...grant,
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
          <button
            className="icon-button"
            onClick={() => props.onChange(grants.filter((_, grantIndex) => grantIndex !== index))}
            type="button"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
