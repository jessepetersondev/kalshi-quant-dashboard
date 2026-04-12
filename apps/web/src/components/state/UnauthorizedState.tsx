export function UnauthorizedState(props: { readonly title: string; readonly message: string }) {
  return (
    <section className="state-panel" role="alert">
      <p className="eyebrow">Unauthorized</p>
      <h1>{props.title}</h1>
      <p className="muted">{props.message}</p>
    </section>
  );
}
