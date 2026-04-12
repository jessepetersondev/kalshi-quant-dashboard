import { NavLink, useLocation } from "react-router-dom";

import type { SessionResponse } from "@kalshi-quant-dashboard/contracts";

import {
  canManageAccessPolicies,
  canManageAlertRules,
  canManageFeatureFlags,
  canViewPrivilegedAudit
} from "../../features/admin/adminSelectors.js";

export function AdminNav(props: { readonly session: SessionResponse }) {
  const location = useLocation();
  const links = [
    canManageAccessPolicies(props.session)
      ? { to: "/admin/access-policies", label: "Access Policies" }
      : null,
    canManageFeatureFlags(props.session)
      ? { to: "/admin/feature-flags", label: "Feature Flags" }
      : null,
    canManageAlertRules(props.session)
      ? { to: "/admin/alert-rules", label: "Alert Rules" }
      : null,
    canViewPrivilegedAudit(props.session)
      ? { to: "/admin/audit-logs", label: "Audit Logs" }
      : null
  ].filter(Boolean) as { to: string; label: string }[];

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="admin-nav">
      <p className="eyebrow">Admin</p>
      <nav className="nav-list" aria-label="Admin navigation">
        {links.map((link) => (
          <NavLink
            key={link.to}
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            to={`${link.to}${location.search}`}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
