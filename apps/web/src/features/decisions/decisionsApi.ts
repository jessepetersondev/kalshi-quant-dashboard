import type {
  DecisionDetailResponse,
  DecisionListQuery,
  DecisionListResponse
} from "@kalshi-quant-dashboard/contracts";

import { baseApi } from "../api/baseApi.js";

export const decisionsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDecisionList: build.query<DecisionListResponse, DecisionListQuery>({
      query: (params) => ({
        url: "/decisions",
        params
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((row) => ({ type: "Decision" as const, id: row.correlationId })),
              "Decision"
            ]
          : ["Decision"]
    }),
    getDecisionDetail: build.query<
      DecisionDetailResponse,
      { correlationId: string; detailLevel: "standard" | "debug"; timezone: "utc" | "local" }
    >({
      query: ({ correlationId, detailLevel, timezone }) => ({
        url: `/decisions/${encodeURIComponent(correlationId)}`,
        params: { detailLevel, timezone }
      }),
      providesTags: (_result, _error, args) => [{ type: "Decision", id: args.correlationId }]
    })
  })
});

export const { useGetDecisionListQuery, useGetDecisionDetailQuery } = decisionsApi;
