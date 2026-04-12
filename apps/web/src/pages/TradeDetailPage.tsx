import { Link, useLocation, useParams } from "react-router-dom";

import { ErrorState } from "../components/state/ErrorState.js";
import { LoadingState } from "../components/state/LoadingState.js";
import { TradeDetailPanel } from "../components/lifecycle/TradeDetailPanel.js";
import { useTimezoneQueryState } from "../features/router/queryState.js";
import { useGetSessionQuery } from "../features/session/sessionApi.js";
import { useGetTradeDetailQuery } from "../features/trades/tradesApi.js";

export function TradeDetailPage() {
  const { correlationId = "" } = useParams();
  const location = useLocation();
  const timezone = useTimezoneQueryState();
  const { data: session } = useGetSessionQuery();
  const detailLevel =
    session?.effectiveCapability.detailLevelMax === "debug" ? "debug" : "standard";
  const { data, error, isLoading } = useGetTradeDetailQuery(
    {
      correlationId,
      detailLevel,
      timezone: timezone.mode
    },
    { skip: correlationId.length === 0 }
  );

  if (isLoading) {
    return <LoadingState title="Loading trade detail" message="Querying trade lifecycle detail." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Trade detail failed to load"
        message="The requested trade lifecycle is unavailable."
      />
    );
  }

  return (
    <div className="page-stack">
      <div>
        <Link className="linkish" to={`/trades${location.search}`}>
          Back to trades
        </Link>
      </div>
      <TradeDetailPanel detail={data} timezone={timezone.mode} />
    </div>
  );
}
