import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export function ScreenReaderStatus(props: {
  readonly pageTitle: string;
  readonly timezoneMode: "utc" | "local";
}) {
  const location = useLocation();
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMessage(`${props.pageTitle} loaded. Timezone ${props.timezoneMode}.`);
  }, [location.key, props.pageTitle, props.timezoneMode]);

  return (
    <div aria-atomic="true" aria-live="polite" className="sr-only">
      {message}
    </div>
  );
}
