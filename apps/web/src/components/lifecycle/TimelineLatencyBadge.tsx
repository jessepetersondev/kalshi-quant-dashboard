import { Pill } from "@kalshi-quant-dashboard/ui";

export function TimelineLatencyBadge(props: { readonly timestamp: string }) {
  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(props.timestamp).valueOf()) / 60_000)
  );

  return <Pill tone={minutes > 15 ? "amber" : "teal"}>{minutes}m old</Pill>;
}
