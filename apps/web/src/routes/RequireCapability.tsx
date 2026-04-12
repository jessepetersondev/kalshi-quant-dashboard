import type { ReactNode } from "react";

import { LoadingState } from "../components/state/LoadingState.js";
import { UnauthorizedState } from "../components/state/UnauthorizedState.js";
import { ErrorState } from "../components/state/ErrorState.js";
import { useGetSessionQuery } from "../features/session/sessionApi.js";

export function RequireCapability(props: {
  readonly when: (session: NonNullable<ReturnType<typeof useGetSessionQuery>["data"]>) => boolean;
  readonly title: string;
  readonly children: ReactNode;
}) {
  const { data, error, isLoading, isFetching } = useGetSessionQuery();

  if (isLoading || isFetching) {
    return <LoadingState title="Authorizing route" message="Loading effective capabilities." />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Authorization failed"
        message="The route could not verify the current session."
      />
    );
  }

  if (!props.when(data)) {
    return (
      <UnauthorizedState
        title={props.title}
        message="This surface is not allowed for the current session."
      />
    );
  }

  return <>{props.children}</>;
}
