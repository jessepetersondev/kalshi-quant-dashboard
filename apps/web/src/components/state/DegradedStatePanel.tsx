export function DegradedStatePanel(props: {
  readonly title?: string;
  readonly message: string;
}) {
  return (
    <section className="state-panel" role="status" aria-live="polite">
      <p className="eyebrow">Degraded</p>
      <h1>{props.title ?? "Upstream data is degraded"}</h1>
      <p className="muted">{props.message}</p>
    </section>
  );
}
