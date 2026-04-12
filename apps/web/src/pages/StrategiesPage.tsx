import { EmptyState } from "../components/state/EmptyState.js";
import { ErrorState } from "../components/state/ErrorState.js";
import { LoadingState } from "../components/state/LoadingState.js";
import { StrategyList } from "../components/strategies/StrategyList.js";
import { useTimezoneQueryState } from "../features/router/queryState.js";
import { useGetStrategiesQuery } from "../features/strategies/strategiesApi.js";

export function StrategiesPage() {
  const timezone = useTimezoneQueryState();
  const { data, error, isLoading, isFetching } = useGetStrategiesQuery();

  if (isLoading || isFetching) {
    return <LoadingState title="Loading strategies" message="Resolving strategy visibility and health summaries." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Strategies failed to load"
        message="The API did not return a strategy list for this session."
      />
    );
  }

  if (data.items.length === 0) {
    return (
      <EmptyState
        title="No visible strategies"
        message="The current effective capability does not include any active strategies."
      />
    );
  }

  return <StrategyList items={data.items} timezone={timezone.mode} />;
}
