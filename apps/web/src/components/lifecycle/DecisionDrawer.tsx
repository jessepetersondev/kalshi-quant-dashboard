import { useNavigate } from "react-router-dom";

import { Drawer } from "@kalshi-quant-dashboard/ui";

import { ErrorState } from "../state/ErrorState.js";
import { LoadingState } from "../state/LoadingState.js";
import { useGetSessionQuery } from "../../features/session/sessionApi.js";
import { useGetDecisionDetailQuery } from "../../features/decisions/decisionsApi.js";
import { DecisionDetailPanel } from "./DecisionDetailPanel.js";

export function DecisionDrawer(props: {
  readonly correlationId: string | null;
  readonly timezone: "utc" | "local";
  readonly onClose: () => void;
}) {
  const navigate = useNavigate();
  const { data: session } = useGetSessionQuery();
  const detailLevel =
    session?.effectiveCapability.detailLevelMax === "debug" ? "debug" : "standard";
  const { data, error, isLoading } = useGetDecisionDetailQuery(
    {
      correlationId: props.correlationId ?? "",
      detailLevel,
      timezone: props.timezone
    },
    { skip: !props.correlationId }
  );

  return (
    <Drawer onClose={props.onClose} open={Boolean(props.correlationId)} title="Decision detail">
      {isLoading ? (
        <LoadingState title="Loading decision detail" message="Querying lifecycle detail." />
      ) : error || !data ? (
        <ErrorState title="Decision detail unavailable" message="The selected lifecycle could not be loaded." />
      ) : (
        <>
          <div className="drawer-actions" style={{ marginBottom: "1rem" }}>
            <a
              className="secondary-button"
              href={`/decisions/${encodeURIComponent(data.summary.correlationId)}?timezone=${props.timezone}`}
              onClick={(event) => {
                event.preventDefault();
                navigate(
                  `/decisions/${encodeURIComponent(data.summary.correlationId)}?timezone=${props.timezone}`
                );
              }}
            >
              Open dedicated page
            </a>
          </div>
          <DecisionDetailPanel detail={data} timezone={props.timezone} />
        </>
      )}
    </Drawer>
  );
}
