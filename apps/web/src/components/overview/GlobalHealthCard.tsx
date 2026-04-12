import { Card, Pill } from "@kalshi-quant-dashboard/ui";

interface GlobalHealthCardProps {
  readonly status: string;
  readonly freshnessTimestamp: string;
  readonly degraded: boolean;
}

export function GlobalHealthCard(props: GlobalHealthCardProps) {
  return (
    <Card accent={props.degraded ? "amber" : "teal"} title="Global Health">
      <div className="detail-header">
        <div>
          <strong style={{ fontSize: "1.4rem", textTransform: "capitalize" }}>
            {props.status}
          </strong>
          <div className="muted">Freshness: {props.freshnessTimestamp}</div>
        </div>
        <Pill tone={props.degraded ? "amber" : "teal"}>
          {props.degraded ? "degraded" : "healthy"}
        </Pill>
      </div>
    </Card>
  );
}
