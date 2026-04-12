import {
  Navigate,
  Outlet,
  createBrowserRouter,
  useLocation,
  useNavigate
} from "react-router-dom";

import { useGetSessionQuery } from "../features/session/sessionApi.js";
import { OverviewPage } from "../pages/OverviewPage.js";
import { StrategiesPage } from "../pages/StrategiesPage.js";
import { StrategyDetailPage } from "../pages/StrategyDetailPage.js";
import { DecisionsPage } from "../pages/DecisionsPage.js";
import { TradesPage } from "../pages/TradesPage.js";
import { DecisionDetailPage } from "../pages/DecisionDetailPage.js";
import { TradeDetailPage } from "../pages/TradeDetailPage.js";
import { SkipsPage } from "../pages/SkipsPage.js";
import { PnlPage } from "../pages/PnlPage.js";
import { OperationsPage } from "../pages/OperationsPage.js";
import { AlertsPage } from "../pages/AlertsPage.js";
import { AlertDetailPage } from "../pages/AlertDetailPage.js";
import { SystemHealthPage } from "../pages/SystemHealthPage.js";
import { LoadingState } from "../components/state/LoadingState.js";
import { ErrorState } from "../components/state/ErrorState.js";
import { UnauthorizedState } from "../components/state/UnauthorizedState.js";
import { AppShell } from "./AppShell.js";
import { AppErrorBoundary } from "./AppErrorBoundary.js";
import { RequireCapability } from "../routes/RequireCapability.js";
import { AdminAccessPoliciesPage } from "../pages/AdminAccessPoliciesPage.js";
import { AdminFeatureFlagsPage } from "../pages/AdminFeatureFlagsPage.js";
import { AdminAuditLogsPage } from "../pages/AdminAuditLogsPage.js";
import { AdminAlertRulesPage } from "../pages/AdminAlertRulesPage.js";

function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    new URLSearchParams(location.search).get("redirectTo") ?? "/overview";
  const accounts = [
    {
      label: "Operator",
      description: "Monitor authorized strategies, exports, and live health surfaces.",
      value: "operator@example.internal"
    },
    {
      label: "Developer",
      description: "Includes raw payload visibility and debug stream detail.",
      value: "developer@example.internal"
    },
    {
      label: "Admin",
      description: "Reserved for later policy and flag controls.",
      value: "admin@example.internal"
    }
  ];

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Internal Access</p>
        <h1>Kalshi Quant Dashboard</h1>
        <p className="muted">
          Select a seeded local user to establish the development session cookie used by
          the API.
        </p>
        <div className="auth-list">
          {accounts.map((account) => (
            <button
              key={account.value}
              className="auth-option"
              onClick={() => {
                document.cookie = `kqd_session=${account.value}; path=/; SameSite=Lax`;
                navigate(redirectTo, { replace: true });
              }}
              type="button"
            >
              <strong>{account.label}</strong>
              <span>{account.description}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function AuthenticatedLayout() {
  const location = useLocation();
  const { data, error, isLoading, isFetching } = useGetSessionQuery();

  if (isLoading || isFetching) {
    return <LoadingState title="Loading session" message="Resolving effective capabilities." />;
  }

  if (error) {
    const status = "status" in error ? error.status : undefined;
    if (status === 401) {
      return (
        <Navigate
          replace
          to={`/sign-in?redirectTo=${encodeURIComponent(
            `${location.pathname}${location.search}`
          )}`}
        />
      );
    }

    return (
      <ErrorState
        title="Session failed to load"
        message="The web shell could not bootstrap the authenticated session."
      />
    );
  }

  if (!data) {
    return (
      <UnauthorizedState
        title="Session unavailable"
        message="No authenticated session is available for this route."
      />
    );
  }

  return (
    <AppShell session={data}>
      <Outlet />
    </AppShell>
  );
}

function NotFoundPage() {
  return (
    <ErrorState
      title="Route not found"
      message="This route is not part of the current implementation slice."
    />
  );
}

export const router = createBrowserRouter([
  {
    path: "/sign-in",
    element: <SignInPage />,
    errorElement: <AppErrorBoundary />
  },
  {
    path: "/",
    element: <AuthenticatedLayout />,
    errorElement: <AppErrorBoundary />,
    children: [
      {
        index: true,
        element: <Navigate replace to="/overview" />
      },
      {
        path: "overview",
        element: <OverviewPage />
      },
      {
        path: "strategies",
        element: <StrategiesPage />
      },
      {
        path: "strategies/:strategyId",
        element: <StrategyDetailPage />
      },
      {
        path: "decisions",
        element: <DecisionsPage />
      },
      {
        path: "decisions/:correlationId",
        element: <DecisionDetailPage />
      },
      {
        path: "trades",
        element: <TradesPage />
      },
      {
        path: "trades/:correlationId",
        element: <TradeDetailPage />
      },
      {
        path: "skips",
        element: <SkipsPage />
      },
      {
        path: "pnl",
        element: <PnlPage />
      },
      {
        path: "operations",
        element: <OperationsPage />
      },
      {
        path: "alerts",
        element: <AlertsPage />
      },
      {
        path: "alerts/:alertId",
        element: <AlertDetailPage />
      },
      {
        path: "system-health",
        element: <SystemHealthPage />
      },
      {
        path: "admin/access-policies",
        element: (
          <RequireCapability
            title="Access policy administration is restricted"
            when={(session) => session.effectiveCapability.canManageAccessPolicies}
          >
            <AdminAccessPoliciesPage />
          </RequireCapability>
        )
      },
      {
        path: "admin/feature-flags",
        element: (
          <RequireCapability
            title="Feature-flag administration is restricted"
            when={(session) => session.effectiveCapability.canManageFeatureFlags}
          >
            <AdminFeatureFlagsPage />
          </RequireCapability>
        )
      },
      {
        path: "admin/alert-rules",
        element: (
          <RequireCapability
            title="Alert-rule administration is restricted"
            when={(session) => session.effectiveCapability.canManageAlertRules}
          >
            <AdminAlertRulesPage />
          </RequireCapability>
        )
      },
      {
        path: "admin/audit-logs",
        element: (
          <RequireCapability
            title="Privileged audit visibility is restricted"
            when={(session) => session.effectiveCapability.canViewPrivilegedAuditLogs}
          >
            <AdminAuditLogsPage />
          </RequireCapability>
        )
      },
      {
        path: "*",
        element: <NotFoundPage />
      }
    ]
  }
]);
