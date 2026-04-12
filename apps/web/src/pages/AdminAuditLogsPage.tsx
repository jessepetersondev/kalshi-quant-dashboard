import { AuditLogTable } from "../components/admin/AuditLogTable.js";
import { ErrorState } from "../components/state/ErrorState.js";
import { LoadingState } from "../components/state/LoadingState.js";
import { useGetAuditLogsQuery } from "../features/admin/adminApi.js";

export function AdminAuditLogsPage() {
  const { data, error, isLoading } = useGetAuditLogsQuery({
    page: 1,
    pageSize: 50
  });

  if (isLoading) {
    return <LoadingState title="Loading audit logs" message="Querying privileged audit entries." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Audit logs failed to load"
        message="The privileged audit surface did not load."
      />
    );
  }

  return <AuditLogTable items={data.items} />;
}
