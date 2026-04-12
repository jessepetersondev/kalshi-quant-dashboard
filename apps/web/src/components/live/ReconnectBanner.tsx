export function ReconnectBanner(props: {
  readonly visible: boolean;
  readonly message: string;
}) {
  if (!props.visible) {
    return null;
  }

  return (
    <div className="state-panel" style={{ margin: 0, maxWidth: "none" }} role="status">
      <p className="eyebrow">Reconnect</p>
      <h1 style={{ fontSize: "1.05rem" }}>Stream degraded</h1>
      <p className="muted">{props.message}</p>
    </div>
  );
}
