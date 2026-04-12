import { Pill } from "@kalshi-quant-dashboard/ui";

export function StalePnlBadge(props: {
  readonly stale: boolean;
  readonly partial: boolean;
}) {
  if (!props.stale && !props.partial) {
    return <Pill tone="teal">fresh</Pill>;
  }

  if (props.stale && props.partial) {
    return <Pill tone="amber">aged + partial</Pill>;
  }

  return <Pill tone="amber">{props.stale ? "aged" : "partial"}</Pill>;
}
