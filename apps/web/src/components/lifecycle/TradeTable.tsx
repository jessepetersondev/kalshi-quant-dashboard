import type { TradeRow } from "@kalshi-quant-dashboard/contracts";

import { Pill, VirtualizedDataTable } from "@kalshi-quant-dashboard/ui";

import { formatTimestamp } from "../../features/format/dateTime.js";

export function TradeTable(props: {
  readonly rows: readonly TradeRow[];
  readonly timezone: "utc" | "local";
  readonly onOpenDetail: (correlationId: string) => void;
}) {
  return (
    <VirtualizedDataTable
      ariaLabel="Trade lifecycle rows"
      caption="Trade lifecycle rows"
      columns={[
        {
          key: "trade",
          header: "Trade",
          renderCell: (row) => (
            <>
              <button
                className="linkish"
                onClick={() => props.onOpenDetail(row.correlationId)}
                type="button"
              >
                {row.tradeAttemptKey}
              </button>
              <div className="muted">{row.marketTicker}</div>
            </>
          )
        },
        {
          key: "strategy",
          header: "Strategy",
          renderCell: (row) => (
            <>
              <div>{row.strategyId.toUpperCase()}</div>
              <Pill tone={row.sourcePathMode === "hybrid" ? "blue" : "teal"}>
                {row.sourcePathMode}
              </Pill>
            </>
          )
        },
        {
          key: "status",
          header: "Status",
          renderCell: (row) => row.status
        },
        {
          key: "terminal",
          header: "Terminal result",
          renderCell: (row) => row.lastResultStatus ?? "pending"
        },
        {
          key: "latestSeen",
          header: "Latest seen",
          renderCell: (row) => formatTimestamp(row.latestSeenAt, props.timezone)
        }
      ]}
      rowKey={(row) => row.tradeAttemptKey}
      rows={props.rows}
    />
  );
}
