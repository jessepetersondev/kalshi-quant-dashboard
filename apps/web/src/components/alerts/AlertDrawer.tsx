import { Drawer } from "@kalshi-quant-dashboard/ui";

import { ErrorState } from "../state/ErrorState.js";
import { LoadingState } from "../state/LoadingState.js";
import { useGetAlertDetailQuery } from "../../features/alerts/alertsApi.js";
import { AlertDetailPanel } from "./AlertDetailPanel.js";

export function AlertDrawer(props: {
  readonly alertId: string | null;
  readonly timezone: "utc" | "local";
  readonly onClose: () => void;
}) {
  const { data, error, isFetching, isLoading } = useGetAlertDetailQuery(
    {
      alertId: props.alertId ?? "",
      detailLevel: "standard",
      timezone: props.timezone
    },
    {
      skip: !props.alertId
    }
  );

  return (
    <Drawer
      open={Boolean(props.alertId)}
      onClose={props.onClose}
      title="Alert detail"
    >
      {!data && (isLoading || isFetching) ? (
        <LoadingState title="Loading alert" message="Querying alert detail." />
      ) : error || !data ? (
        <ErrorState
          title="Alert detail unavailable"
          message="The selected alert could not be loaded."
        />
      ) : (
        <AlertDetailPanel detail={data} timezone={props.timezone} />
      )}
    </Drawer>
  );
}
