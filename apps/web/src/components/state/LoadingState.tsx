export function LoadingState(props: { readonly title: string; readonly message: string }) {
  return (
    <section className="state-panel" role="status" aria-live="polite">
      <p className="eyebrow">Loading</p>
      <h1>{props.title}</h1>
      <p className="muted">{props.message}</p>
    </section>
  );
}
