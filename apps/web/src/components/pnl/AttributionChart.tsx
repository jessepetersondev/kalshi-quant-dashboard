import type { PnlAttributionRow } from "@kalshi-quant-dashboard/contracts";
import { Card, VirtualizedDataTable } from "@kalshi-quant-dashboard/ui";

import { formatCurrency } from "../../features/format/dateTime.js";
import { PnlDisagreementBadge } from "./PnlDisagreementBadge.js";

function formatAttributionLabel(row: PnlAttributionRow): string {
  if (row.scopeType === "market") {
    return row.label.replace(/-STALE$/i, "-AGED");
  }

  return row.label;
}

export function AttributionChart(props: {
  readonly title: string;
  readonly rows: readonly PnlAttributionRow[];
}) {
  return (
    <Card title={props.title}>
      <VirtualizedDataTable
        ariaLabel={`${props.title} attribution`}
        caption={`${props.title} attribution`}
        columns={[
          {
            key: "scope",
            header: "Scope",
            renderCell: (row) => (
              <span title={row.label}>{formatAttributionLabel(row)}</span>
            )
          },
          {
            key: "total",
            header: "Total",
            renderCell: (row) => formatCurrency(row.totalPnlNet)
          },
          {
            key: "realized",
            header: "Realized",
            renderCell: (row) => formatCurrency(row.realizedPnlNet)
          },
          {
            key: "unrealized",
            header: "Unrealized",
            renderCell: (row) => formatCurrency(row.unrealizedPnlNet)
          },
          {
            key: "fees",
            header: "Fees",
            renderCell: (row) => formatCurrency(row.feesTotal)
          },
          {
            key: "status",
            header: "Status",
            renderCell: (row) => (
              <div className="pill-row">
                <PnlDisagreementBadge disagreement={row.disagreement} label="disagreement" />
                {row.stale ? <span className="muted">aged</span> : null}
                {row.partial ? <span className="muted">partial</span> : null}
              </div>
            )
          }
        ]}
        rowKey={(row) => `${row.scopeType}:${row.scopeKey}`}
        rows={props.rows}
      />
    </Card>
  );
}
