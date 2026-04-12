import type { AlertRow } from "@kalshi-quant-dashboard/contracts";
import { Card, VirtualizedDataTable } from "@kalshi-quant-dashboard/ui";

import { formatTimestamp } from "../../features/format/dateTime.js";
import { AlertLink } from "./AlertLink.js";

export function AlertTable(props: {
  readonly rows: readonly AlertRow[];
  readonly timezone: "utc" | "local";
  readonly onOpenDetail: (alertId: string) => void;
}) {
  return (
    <Card title="Alerts">
      <VirtualizedDataTable
        ariaLabel="Alert rows"
        caption="Alert rows"
        columns={[
          {
            key: "alert",
            header: "Alert",
            renderCell: (row) => (
              <AlertLink
                alertId={row.alertId}
                label={row.summary}
                onOpen={props.onOpenDetail}
              />
            )
          },
          {
            key: "severity",
            header: "Severity",
            renderCell: (row) => row.severity
          },
          {
            key: "status",
            header: "Status",
            renderCell: (row) => row.status
          },
          {
            key: "component",
            header: "Component",
            renderCell: (row) => row.componentKey ?? row.componentType ?? "unknown"
          },
          {
            key: "lastSeen",
            header: "Last Seen",
            renderCell: (row) => formatTimestamp(row.latestSeenAt, props.timezone)
          }
        ]}
        rowKey={(row) => row.alertId}
        rows={props.rows}
      />
    </Card>
  );
}
