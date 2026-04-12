import { useMemo, useState } from "react";

import { EmptyState } from "../components/state/EmptyState.js";
import { ErrorState } from "../components/state/ErrorState.js";
import { LoadingState } from "../components/state/LoadingState.js";
import { AlertRuleForm } from "../components/admin/AlertRuleForm.js";
import { AlertRuleTable } from "../components/admin/AlertRuleTable.js";
import { useGetAlertRulesQuery, useUpdateAlertRuleMutation } from "../features/admin/adminApi.js";

export function AdminAlertRulesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data, error, isLoading } = useGetAlertRulesQuery();
  const [updateAlertRule] = useUpdateAlertRuleMutation();

  const selectedRule = useMemo(
    () => data?.items.find((rule) => rule.alertRuleId === selectedId) ?? data?.items[0] ?? null,
    [data?.items, selectedId]
  );

  if (isLoading) {
    return <LoadingState title="Loading alert rules" message="Querying alert thresholds." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Alert rules failed to load"
        message="The admin alert-rule surface did not load."
      />
    );
  }

  if (data.items.length === 0) {
    return (
      <EmptyState
        title="No alert rules"
        message="Alert-rule configuration is not available in this environment."
      />
    );
  }

  return (
    <div className="admin-grid">
      <AlertRuleTable
        items={data.items}
        selectedId={selectedRule?.alertRuleId ?? null}
        onSelect={setSelectedId}
      />
      <AlertRuleForm
        rule={selectedRule}
        onSave={async (body) => {
          const result = await updateAlertRule({
            alertRuleId: body.alertRuleId,
            body: {
              version: body.version,
              severity: body.severity,
              thresholdValue: body.thresholdValue,
              thresholdUnit: body.thresholdUnit,
              enabled: body.enabled,
              reason: body.reason
            }
          });

          if ("error" in result) {
            throw new Error(JSON.stringify(result.error));
          }
        }}
      />
    </div>
  );
}
