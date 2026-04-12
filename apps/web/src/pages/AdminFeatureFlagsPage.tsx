import { useMemo, useState } from "react";

import { EmptyState } from "../components/state/EmptyState.js";
import { ErrorState } from "../components/state/ErrorState.js";
import { LoadingState } from "../components/state/LoadingState.js";
import { FeatureFlagEditor } from "../components/admin/feature-flags/FeatureFlagEditor.js";
import { FeatureFlagErrorPanel } from "../components/admin/feature-flags/FeatureFlagErrorPanel.js";
import { FeatureFlagTable } from "../components/admin/feature-flags/FeatureFlagTable.js";
import {
  useGetFeatureFlagsQuery,
  useUpdateFeatureFlagMutation
} from "../features/admin/adminApi.js";
import { describeMutationFailure, describeMutationSuccess } from "../features/admin/adminMutationToasts.js";

export function AdminFeatureFlagsPage() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { data, error, isLoading } = useGetFeatureFlagsQuery();
  const [updateFeatureFlag] = useUpdateFeatureFlagMutation();

  const selectedFlag = useMemo(
    () => data?.items.find((flag) => flag.featureFlagKey === selectedKey) ?? data?.items[0] ?? null,
    [data?.items, selectedKey]
  );

  if (isLoading) {
    return <LoadingState title="Loading feature flags" message="Querying runtime flags." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Feature flags failed to load"
        message="The admin feature-flag surface did not load."
      />
    );
  }

  if (data.items.length === 0) {
    return (
      <EmptyState
        title="No feature flags"
        message="Feature flag state is not available in this environment."
      />
    );
  }

  return (
    <div className="admin-grid">
      <FeatureFlagTable
        items={data.items}
        selectedKey={selectedFlag?.featureFlagKey ?? null}
        onSelect={setSelectedKey}
      />
      <FeatureFlagEditor
        flag={selectedFlag}
        onSave={async (body) => {
          const result = await updateFeatureFlag({
            featureFlagKey: body.featureFlagKey,
            body: {
              enabled: body.enabled,
              version: body.version,
              reason: body.reason
            }
          });

          if ("data" in result) {
            setFeedback(describeMutationSuccess("Feature flag"));
            return;
          }

          setFeedback(describeMutationFailure("Feature flag", JSON.stringify(result.error)));
          throw new Error(JSON.stringify(result.error));
        }}
      />
      <FeatureFlagErrorPanel message={feedback} />
    </div>
  );
}
