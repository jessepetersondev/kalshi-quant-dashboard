import type { PnlSummaryCard } from "@kalshi-quant-dashboard/contracts";
import { Card, Pill } from "@kalshi-quant-dashboard/ui";

import { formatCurrency } from "../../features/format/dateTime.js";

export function AggregatePnlCard(props: { readonly pnl: PnlSummaryCard }) {
  return (
    <Card accent={props.pnl.partial || props.pnl.stale ? "amber" : "blue"} title="Aggregate PnL">
      <div className="kv-list">
        <div className="kv-item">
          <strong>Realized net</strong>
          <span>{formatCurrency(props.pnl.realizedPnlNet)}</span>
        </div>
        <div className="kv-item">
          <strong>Unrealized net</strong>
          <span>{formatCurrency(props.pnl.unrealizedPnlNet)}</span>
        </div>
        <div className="kv-item">
          <strong>Fees</strong>
          <span>{formatCurrency(props.pnl.feesTotal)}</span>
        </div>
      </div>
      <div className="pill-row" style={{ marginTop: "0.85rem" }}>
        {props.pnl.stale ? <Pill tone="amber">stale</Pill> : null}
        {props.pnl.partial ? <Pill tone="amber">partial</Pill> : null}
        <Pill tone="blue">disagreements {props.pnl.disagreementCount}</Pill>
      </div>
    </Card>
  );
}
