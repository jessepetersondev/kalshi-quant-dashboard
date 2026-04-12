import type { DecisionRow } from "@kalshi-quant-dashboard/contracts";

import { Pill, VirtualizedDataTable } from "@kalshi-quant-dashboard/ui";

import { formatTimestamp } from "../../features/format/dateTime.js";

export function DecisionTable(props: {
  readonly rows: readonly DecisionRow[];
  readonly timezone: "utc" | "local";
  readonly onOpenDetail: (correlationId: string, triggerId: string) => void;
}) {
  return (
    <VirtualizedDataTable
      ariaLabel="Decision lifecycle rows"
      caption="Decision lifecycle rows"
      columns={[
        {
          key: "decision",
          header: "Decision",
          renderCell: (row) => (
            <>
              <button
                className="linkish"
                id={`decision-trigger-${row.correlationId}`}
                onClick={() =>
                  props.onOpenDetail(row.correlationId, `decision-trigger-${row.correlationId}`)
                }
                type="button"
              >
                {row.marketTicker}
              </button>
              <div className="muted">{row.reasonSummary ?? "no reason"}</div>
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
          key: "lifecycle",
          header: "Lifecycle",
          renderCell: (row) => row.currentLifecycleStage
        },
        {
          key: "outcome",
          header: "Outcome",
          renderCell: (row) => row.currentOutcomeStatus ?? "unknown"
        },
        {
          key: "latestEvent",
          header: "Latest event",
          renderCell: (row) => formatTimestamp(row.latestEventAt, props.timezone)
        }
      ]}
      rowKey={(row) => row.correlationId}
      rows={props.rows}
    />
  );
}
