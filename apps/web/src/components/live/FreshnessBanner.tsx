export function FreshnessBanner(props: {
  readonly connectionState: "connected" | "reconnecting" | "paused" | "degraded";
  readonly freshnessTimestamp: string | null;
  readonly degraded: boolean;
}) {
  return (
    <div className="state-panel" style={{ margin: 0, maxWidth: "none" }}>
      <p className="eyebrow">Live Stream</p>
      <h1 style={{ fontSize: "1.2rem" }}>{props.connectionState}</h1>
      <p className="muted">
        Freshness: {props.freshnessTimestamp ?? "unknown"}
        {props.degraded ? " · degraded" : ""}
      </p>
    </div>
  );
}
