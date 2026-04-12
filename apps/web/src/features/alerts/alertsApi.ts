import type {
  AlertDetailResponse,
  AlertListQuery,
  AlertListResponse
} from "@kalshi-quant-dashboard/contracts";

import { baseApi } from "../api/baseApi.js";

export const alertsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAlertList: build.query<AlertListResponse, AlertListQuery>({
      query: (params) => ({
        url: "/alerts",
        params
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((row) => ({ type: "Alert" as const, id: row.alertId })),
              "Alert"
            ]
          : ["Alert"]
    }),
    getAlertDetail: build.query<
      AlertDetailResponse,
      { alertId: string; detailLevel: "standard" | "debug"; timezone: "utc" | "local" }
    >({
      query: ({ alertId, detailLevel, timezone }) => ({
        url: `/alerts/${encodeURIComponent(alertId)}`,
        params: { detailLevel, timezone }
      }),
      providesTags: (_result, _error, args) => [{ type: "Alert", id: args.alertId }]
    })
  })
});

export const { useGetAlertListQuery, useGetAlertDetailQuery } = alertsApi;
