import type { RawPayloadEntry } from "@kalshi-quant-dashboard/contracts";

import { Card } from "@kalshi-quant-dashboard/ui";

export function RawPayloadPanel(props: { readonly rows: readonly RawPayloadEntry[] }) {
  return (
    <Card title="Raw payloads">
      <div className="timeline-list">
        {props.rows.map((row) => (
          <div className="timeline-item" key={row.canonicalEventId}>
            <strong>{row.sourceEventName}</strong>
            <pre
              style={{
                margin: "0.75rem 0 0",
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere"
              }}
            >
              {JSON.stringify(row.rawPayload, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </Card>
  );
}
