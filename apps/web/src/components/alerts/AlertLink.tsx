import { Link, useLocation } from "react-router-dom";

import { buildAlertDetailPath } from "../../features/router/alertNavigation.js";

export function AlertLink(props: {
  readonly alertId: string;
  readonly label: string;
  readonly onOpen?: (alertId: string) => void;
}) {
  const location = useLocation();

  return (
    <div className="pill-row">
      {props.onOpen ? (
        <button
          className="linkish"
          onClick={() => props.onOpen?.(props.alertId)}
          type="button"
        >
          {props.label}
        </button>
      ) : (
        <span>{props.label}</span>
      )}
      <Link className="linkish" to={buildAlertDetailPath(props.alertId, location.search)}>
        detail
      </Link>
    </div>
  );
}
