import type {
  OperationsResponse,
  SystemHealthResponse
} from "@kalshi-quant-dashboard/contracts";

import { baseApi } from "../api/baseApi.js";

export const operationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOperationsSnapshot: build.query<OperationsResponse, { detailLevel: "standard" | "debug" }>({
      query: (params) => ({
        url: "/operations/queues",
        params
      }),
      providesTags: ["Operations"]
    }),
    getSystemHealth: build.query<SystemHealthResponse, void>({
      query: () => "/system-health",
      providesTags: ["SystemHealth"]
    })
  })
});

export const { useGetOperationsSnapshotQuery, useGetSystemHealthQuery } = operationsApi;
