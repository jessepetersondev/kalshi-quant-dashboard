import type { QueueRow } from "@kalshi-quant-dashboard/contracts";
import { Card, VirtualizedDataTable } from "@kalshi-quant-dashboard/ui";

export function QueueHealthTable(props: {
  readonly rows: readonly QueueRow[];
}) {
  return (
    <Card title="Queue Health">
      <VirtualizedDataTable
        ariaLabel="Queue health rows"
        caption="Queue health rows"
        columns={[
          { key: "queue", header: "Queue", renderCell: (row) => row.queueName },
          { key: "messages", header: "Messages", renderCell: (row) => row.messageCount },
          { key: "consumers", header: "Consumers", renderCell: (row) => row.consumerCount },
          {
            key: "age",
            header: "Oldest Age",
            renderCell: (row) => `${row.oldestMessageAgeSeconds ?? 0}s`
          },
          { key: "dlq", header: "DLQ", renderCell: (row) => row.dlqMessageCount ?? 0 },
          {
            key: "reconnect",
            header: "Reconnect",
            renderCell: (row) => row.reconnectStatus ?? "connected"
          }
        ]}
        rowKey={(row) => row.queueName}
        rows={props.rows}
      />
    </Card>
  );
}
