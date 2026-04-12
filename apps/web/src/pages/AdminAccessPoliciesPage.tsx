import { useMemo, useState } from "react";

import { EmptyState } from "../components/state/EmptyState.js";
import { ErrorState } from "../components/state/ErrorState.js";
import { LoadingState } from "../components/state/LoadingState.js";
import { PolicyAuditPanel } from "../components/admin/access-policies/PolicyAuditPanel.js";
import { PolicyEditor } from "../components/admin/access-policies/PolicyEditor.js";
import { PolicyList } from "../components/admin/access-policies/PolicyList.js";
import {
  useCreateAccessPolicyMutation,
  useGetAccessPoliciesQuery,
  useGetAccessPolicyDetailQuery,
  useUpdateAccessPolicyMutation
} from "../features/admin/adminApi.js";
import {
  describeMutationFailure,
  describeMutationSuccess
} from "../features/admin/adminMutationToasts.js";

export function AdminAccessPoliciesPage() {
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { data, error, isLoading } = useGetAccessPoliciesQuery({
    page: 1,
    pageSize: 50
  });
  const detailQuery = useGetAccessPolicyDetailQuery(selectedPolicyId ?? "", {
    skip: !selectedPolicyId
  });
  const [createPolicy] = useCreateAccessPolicyMutation();
  const [updatePolicy] = useUpdateAccessPolicyMutation();

  const selectedPolicy = useMemo(
    () => detailQuery.data?.policy ?? null,
    [detailQuery.data?.policy]
  );

  if (isLoading) {
    return <LoadingState title="Loading access policies" message="Querying policy records." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Access policies failed to load"
        message="The admin policy surface did not load."
      />
    );
  }

  if (data.items.length === 0) {
    return (
      <EmptyState
        title="No access policies"
        message="Create the first access policy to grant or deny admin surfaces."
      />
    );
  }

  return (
    <>
      {feedback ? <p className="muted">{feedback}</p> : null}
      <div className="admin-grid">
        <PolicyList
          items={data.items}
          selectedPolicyId={selectedPolicyId}
          onCreateNew={() => setSelectedPolicyId(null)}
          onSelect={setSelectedPolicyId}
        />
        <PolicyEditor
          policy={selectedPolicy}
          onCreate={async (body) => {
            const result = await createPolicy(body);
            if ("data" in result && result.data) {
              setSelectedPolicyId(result.data.policy.accessPolicyId);
              setFeedback(describeMutationSuccess("Access policy"));
              return;
            }

            const message = JSON.stringify(result.error);
            setFeedback(describeMutationFailure("Access policy", message));
            throw new Error(message);
          }}
          onUpdate={async ({ accessPolicyId, version, policy, rules, exportGrants }) => {
            const result = await updatePolicy({
              accessPolicyId,
              body: {
                version,
                policy,
                rules,
                exportGrants
              }
            });
            if ("data" in result && result.data) {
              setSelectedPolicyId(result.data.policy.accessPolicyId);
              setFeedback(describeMutationSuccess("Access policy"));
              return;
            }

            const message = JSON.stringify(result.error);
            setFeedback(describeMutationFailure("Access policy", message));
            throw new Error(message);
          }}
        />
        <PolicyAuditPanel policy={selectedPolicy} />
      </div>
    </>
  );
}
