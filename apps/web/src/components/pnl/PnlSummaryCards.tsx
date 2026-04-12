import type { PnlSummaryResponse } from "@kalshi-quant-dashboard/contracts";
import { Card } from "@kalshi-quant-dashboard/ui";

import { formatCurrency, formatTimestamp } from "../../features/format/dateTime.js";
import { PnlDisagreementBadge } from "./PnlDisagreementBadge.js";
import { StalePnlBadge } from "./StalePnlBadge.js";

export function PnlSummaryCards(props: {
  readonly summary: PnlSummaryResponse;
  readonly timezone: "utc" | "local";
}) {
  const portfolio = props.summary.portfolioSummary;

  return (
    <div className="metric-grid">
      <Card title="Portfolio PnL" accent="teal">
        <div className="detail-header">
          <strong>{formatCurrency(portfolio.realizedPnlNet + portfolio.unrealizedPnlNet)}</strong>
          <StalePnlBadge stale={portfolio.stale} partial={portfolio.partial} />
        </div>
        <div className="session-meta">
          <span>Realized {formatCurrency(portfolio.realizedPnlNet)}</span>
          <span>Unrealized {formatCurrency(portfolio.unrealizedPnlNet)}</span>
          <span>Fees {formatCurrency(portfolio.feesTotal)}</span>
          <span>
            Freshness {formatTimestamp(portfolio.freshnessTimestamp, props.timezone)}
          </span>
        </div>
      </Card>
      {props.summary.strategyBreakdown.slice(0, 3).map((row) => (
        <Card key={row.scopeKey} title={row.label} accent="neutral">
          <div className="detail-header">
            <strong>{formatCurrency(row.totalPnlNet)}</strong>
            <PnlDisagreementBadge disagreement={row.disagreement} label="disagreement" />
          </div>
          <div className="session-meta">
            <span>Realized {formatCurrency(row.realizedPnlNet)}</span>
            <span>Unrealized {formatCurrency(row.unrealizedPnlNet)}</span>
            <span>Fees {formatCurrency(row.feesTotal)}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
