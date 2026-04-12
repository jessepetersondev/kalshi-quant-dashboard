import type { PnlCompareSeries } from "@kalshi-quant-dashboard/contracts";
import { Card } from "@kalshi-quant-dashboard/ui";

import { formatCurrency } from "../../features/format/dateTime.js";
import { StalePnlBadge } from "./StalePnlBadge.js";

export function CompareModeGrid(props: {
  readonly items: readonly PnlCompareSeries[];
}) {
  return (
    <div className="split-grid">
      {props.items.map((item) => (
        <Card key={item.strategyId} title={item.label}>
          <div className="detail-header">
            <strong>{formatCurrency(item.summary.totalPnlNet)}</strong>
            <StalePnlBadge stale={item.summary.stale} partial={item.summary.partial} />
          </div>
          <div className="session-meta">
            <span>Realized {formatCurrency(item.summary.realizedPnlNet)}</span>
            <span>Unrealized {formatCurrency(item.summary.unrealizedPnlNet)}</span>
            <span>Fees {formatCurrency(item.summary.feesTotal)}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
