import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    credentials: "same-origin"
  }),
  tagTypes: [
    "Session",
    "Overview",
    "Strategy",
    "Decision",
    "Trade",
    "Skip",
    "Pnl",
    "Operations",
    "Alert",
    "SystemHealth",
    "AccessPolicy",
    "FeatureFlag",
    "AlertRule",
    "AuditLog"
  ],
  endpoints: () => ({})
});
