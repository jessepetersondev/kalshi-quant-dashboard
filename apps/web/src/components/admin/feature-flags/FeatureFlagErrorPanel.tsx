export function FeatureFlagErrorPanel(props: { readonly message: string | null }) {
  if (!props.message) {
    return null;
  }

  return <div className="state-panel"><strong>Mutation status</strong><p>{props.message}</p></div>;
}
