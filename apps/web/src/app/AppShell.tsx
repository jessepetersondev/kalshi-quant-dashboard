import type { ReactNode } from "react";

import { NavLink, useLocation, useNavigate } from "react-router-dom";

import type { SessionResponse } from "@kalshi-quant-dashboard/contracts";
import { Card, Pill } from "@kalshi-quant-dashboard/ui";

import { AdminNav } from "../components/nav/AdminNav.js";
import { ScreenReaderStatus } from "../components/state/ScreenReaderStatus.js";
import { DISPLAY_TIMEZONE_LABEL } from "../features/format/dateTime.js";

interface AppShellProps {
  readonly session: SessionResponse;
  readonly children: ReactNode;
}

const navigationItems = [
  { to: "/overview", label: "Overview" },
  { to: "/strategies", label: "Strategies" },
  { to: "/decisions", label: "Decisions" },
  { to: "/trades", label: "Trades" },
  { to: "/skips", label: "Skips" },
  { to: "/pnl", label: "PnL" },
  { to: "/operations", label: "Operations" },
  { to: "/alerts", label: "Alerts" },
  { to: "/system-health", label: "Health" }
] as const;

export function AppShell({ session, children }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const pageTitle =
    navigationItems.find((item) => location.pathname.startsWith(item.to))?.label ?? "Dashboard";

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <p className="eyebrow">Kalshi Quant Dashboard</p>
          <h1>Control Plane</h1>
          <p className="muted">
            Mixed-source lifecycle visibility across seeded quant systems.
          </p>
        </div>
        <nav className="nav-list" aria-label="Primary navigation">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
              to={`${item.to}${location.search}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <Card title="Session" accent="teal">
          <div className="session-card">
            <div>
              <strong>{session.session.principal.displayName}</strong>
              <div className="muted">{session.session.principal.email}</div>
            </div>
            <Pill tone={session.effectiveCapability.resolvedRole}>
              {session.effectiveCapability.resolvedRole}
            </Pill>
          </div>
          <div className="session-meta">
            <span>
              Detail level: <strong>{session.effectiveCapability.detailLevelMax}</strong>
            </span>
            <span>
              Export grants:{" "}
              <strong>{session.effectiveCapability.allowedExportResources.length}</strong>
            </span>
          </div>
        </Card>
        <AdminNav session={session} />
      </aside>
      <main className="main-shell" id="main-content" tabIndex={-1}>
        <ScreenReaderStatus pageTitle={pageTitle} />
        <header className="topbar">
          <div>
            <p className="eyebrow">Authenticated Surface</p>
            <h2>{pageTitle}</h2>
          </div>
          <div className="topbar-actions">
            <Pill tone="neutral">{DISPLAY_TIMEZONE_LABEL}</Pill>
            <button
              className="secondary-button"
              onClick={() => {
                document.cookie =
                  "kqd_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
                navigate("/sign-in", { replace: true });
              }}
              type="button"
            >
              Sign out
            </button>
          </div>
        </header>
        <section className="page-content">{children}</section>
      </main>
    </div>
  );
}
