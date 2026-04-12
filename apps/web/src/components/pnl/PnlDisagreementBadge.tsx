import { Pill } from "@kalshi-quant-dashboard/ui";

export function PnlDisagreementBadge(props: {
  readonly disagreement: boolean;
  readonly label?: string;
}) {
  if (!props.disagreement) {
    return null;
  }

  return <Pill tone="red">{props.label ?? "snapshot mismatch"}</Pill>;
}
