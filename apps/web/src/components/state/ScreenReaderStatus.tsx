import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { DISPLAY_TIMEZONE_LABEL } from "../../features/format/dateTime.js";

export function ScreenReaderStatus(props: {
  readonly pageTitle: string;
}) {
  const location = useLocation();
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMessage(`${props.pageTitle} loaded. Timezone ${DISPLAY_TIMEZONE_LABEL}.`);
  }, [location.key, props.pageTitle]);

  return (
    <div aria-atomic="true" aria-live="polite" className="sr-only">
      {message}
    </div>
  );
}
