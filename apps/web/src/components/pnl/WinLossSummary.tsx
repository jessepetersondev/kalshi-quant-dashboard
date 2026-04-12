import type { PnlTimeseriesResponse } from "@kalshi-quant-dashboard/contracts";
import { Card } from "@kalshi-quant-dashboard/ui";

export function WinLossSummary(props: {
  readonly summary: PnlTimeseriesResponse["winLossSummary"];
}) {
  return (
    <Card title="Win / Loss">
      <div className="session-meta">
        <span>Wins {props.summary.wins}</span>
        <span>Losses {props.summary.losses}</span>
        <span>Win rate {(props.summary.winRate * 100).toFixed(1)}%</span>
      </div>
    </Card>
  );
}
