import type { OperationsResponse } from "@kalshi-quant-dashboard/contracts";
import { Card } from "@kalshi-quant-dashboard/ui";

export function PipelineFlowDiagram(props: {
  readonly latencyRows: OperationsResponse["pipelineLatency"];
}) {
  return (
    <Card title="Pipeline Latency">
      <div className="timeline-list">
        {props.latencyRows.map((row) => (
          <div className="timeline-item" key={`${row.componentName}:${row.phase}`}>
            <div className="detail-header">
              <strong>{row.phase}</strong>
              <span>{row.latencyMs.toFixed(0)} ms</span>
            </div>
            <div className="muted">{row.componentName}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
