import { useEffect, useState } from "react";

import type { FeatureFlagState } from "@kalshi-quant-dashboard/contracts";
import { FormField } from "@kalshi-quant-dashboard/ui";

export function FeatureFlagEditor(props: {
  readonly flag: FeatureFlagState | null;
  readonly onSave: (body: {
    featureFlagKey: string;
    version: number;
    enabled: boolean;
    reason: string;
  }) => Promise<void>;
}) {
  const [enabled, setEnabled] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    setEnabled(Boolean(props.flag?.enabled));
    setReason("");
  }, [props.flag]);

  if (!props.flag) {
    return null;
  }

  return (
    <section className="admin-panel">
      <div className="detail-header">
        <h3>{props.flag.featureFlagKey}</h3>
        <button
          className="primary-button"
          onClick={() =>
            void props.onSave({
              featureFlagKey: props.flag!.featureFlagKey,
              version: props.flag!.version,
              enabled,
              reason
            })
          }
          type="button"
        >
          Save
        </button>
      </div>
      <p className="muted">{props.flag.description}</p>
      <FormField htmlFor="feature-flag-enabled" label="Enabled">
        <input
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          type="checkbox"
        />
      </FormField>
      <FormField
        hint="Required for auditability and release review."
        htmlFor="feature-flag-reason"
        label="Reason"
      >
        <input value={reason} onChange={(event) => setReason(event.target.value)} type="text" />
      </FormField>
    </section>
  );
}
