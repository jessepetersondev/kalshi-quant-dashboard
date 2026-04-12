export function EmptyState(props: { readonly title: string; readonly message: string }) {
  return (
    <section className="state-panel">
      <p className="eyebrow">Empty</p>
      <h1>{props.title}</h1>
      <p className="muted">{props.message}</p>
    </section>
  );
}
