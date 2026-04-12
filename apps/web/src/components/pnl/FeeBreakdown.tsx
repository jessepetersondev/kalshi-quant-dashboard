import type { PnlAttributionRow } from "@kalshi-quant-dashboard/contracts";
import { Card } from "@kalshi-quant-dashboard/ui";

import { formatCurrency } from "../../features/format/dateTime.js";

export function FeeBreakdown(props: { readonly rows: readonly PnlAttributionRow[] }) {
  return (
    <Card title="Fee Breakdown">
      <div className="timeline-list">
        {props.rows.map((row) => (
          <div className="timeline-item" key={`${row.scopeType}:${row.scopeKey}`}>
            <div className="detail-header">
              <strong>{row.label}</strong>
              <span>{formatCurrency(row.feesTotal)}</span>
            </div>
            <div className="muted">scope {row.scopeType}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
