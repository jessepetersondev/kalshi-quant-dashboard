import { useNavigate } from "react-router-dom";

import { Drawer } from "@kalshi-quant-dashboard/ui";

import { ErrorState } from "../state/ErrorState.js";
import { LoadingState } from "../state/LoadingState.js";
import { useGetSessionQuery } from "../../features/session/sessionApi.js";
import { useGetTradeDetailQuery } from "../../features/trades/tradesApi.js";
import { TradeDetailPanel } from "./TradeDetailPanel.js";

export function TradeDrawer(props: {
  readonly correlationId: string | null;
  readonly timezone: "utc" | "local";
  readonly onClose: () => void;
}) {
  const navigate = useNavigate();
  const { data: session } = useGetSessionQuery();
  const detailLevel =
    session?.effectiveCapability.detailLevelMax === "debug" ? "debug" : "standard";
  const { data, error, isLoading } = useGetTradeDetailQuery(
    {
      correlationId: props.correlationId ?? "",
      detailLevel,
      timezone: props.timezone
    },
    { skip: !props.correlationId }
  );

  return (
    <Drawer onClose={props.onClose} open={Boolean(props.correlationId)} title="Trade detail">
      {isLoading ? (
        <LoadingState title="Loading trade detail" message="Querying trade lifecycle detail." />
      ) : error || !data ? (
        <ErrorState title="Trade detail unavailable" message="The selected trade could not be loaded." />
      ) : (
        <>
          <div className="drawer-actions" style={{ marginBottom: "1rem" }}>
            <a
              className="secondary-button"
              href={`/trades/${encodeURIComponent(data.summary.correlationId)}?timezone=${props.timezone}`}
              onClick={(event) => {
                event.preventDefault();
                navigate(
                  `/trades/${encodeURIComponent(data.summary.correlationId)}?timezone=${props.timezone}`
                );
              }}
            >
              Open dedicated page
            </a>
          </div>
          <TradeDetailPanel detail={data} timezone={props.timezone} />
        </>
      )}
    </Drawer>
  );
}
