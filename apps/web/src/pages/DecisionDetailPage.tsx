import { Link, useLocation, useParams } from "react-router-dom";

import { ErrorState } from "../components/state/ErrorState.js";
import { LoadingState } from "../components/state/LoadingState.js";
import { useGetSessionQuery } from "../features/session/sessionApi.js";
import { useGetDecisionDetailQuery } from "../features/decisions/decisionsApi.js";
import { useTimezoneQueryState } from "../features/router/queryState.js";
import { DecisionDetailPanel } from "../components/lifecycle/DecisionDetailPanel.js";

export function DecisionDetailPage() {
  const { correlationId = "" } = useParams();
  const location = useLocation();
  const timezone = useTimezoneQueryState();
  const { data: session } = useGetSessionQuery();
  const detailLevel =
    session?.effectiveCapability.detailLevelMax === "debug" ? "debug" : "standard";
  const { data, error, isLoading } = useGetDecisionDetailQuery(
    {
      correlationId,
      detailLevel,
      timezone: timezone.mode
    },
    { skip: correlationId.length === 0 }
  );

  if (isLoading) {
    return <LoadingState title="Loading decision detail" message="Querying decision lifecycle detail." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Decision detail failed to load"
        message="The requested decision lifecycle is unavailable."
      />
    );
  }

  return (
    <div className="page-stack">
      <div>
        <Link className="linkish" to={`/decisions${location.search}`}>
          Back to decisions
        </Link>
      </div>
      <DecisionDetailPanel detail={data} timezone={timezone.mode} />
    </div>
  );
}
