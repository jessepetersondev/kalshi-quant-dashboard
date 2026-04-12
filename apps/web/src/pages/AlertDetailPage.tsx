import { Link, useLocation, useParams } from "react-router-dom";

import { ErrorState } from "../components/state/ErrorState.js";
import { LoadingState } from "../components/state/LoadingState.js";
import { AlertDetailPanel } from "../components/alerts/AlertDetailPanel.js";
import { useGetAlertDetailQuery } from "../features/alerts/alertsApi.js";
import { useTimezoneQueryState } from "../features/router/queryState.js";

export function AlertDetailPage() {
  const { alertId = "" } = useParams();
  const location = useLocation();
  const timezone = useTimezoneQueryState();
  const { data, error, isLoading, isFetching } = useGetAlertDetailQuery(
    {
      alertId,
      detailLevel: "standard",
      timezone: timezone.mode
    },
    {
      skip: alertId.length === 0
    }
  );

  if (!data && (isLoading || isFetching)) {
    return <LoadingState title="Loading alert detail" message="Querying the selected incident timeline." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Alert detail failed to load"
        message={`The alert '${alertId}' is unavailable for this session.`}
      />
    );
  }

  return (
    <div className="page-stack">
      <div>
        <Link className="linkish" to={`/alerts${location.search}`}>
          Back to alerts
        </Link>
      </div>
      <AlertDetailPanel detail={data} timezone={timezone.mode} />
    </div>
  );
}
