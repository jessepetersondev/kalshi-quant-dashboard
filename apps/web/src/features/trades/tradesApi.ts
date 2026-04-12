import type {
  TradeDetailResponse,
  TradeListQuery,
  TradeListResponse
} from "@kalshi-quant-dashboard/contracts";

import { baseApi } from "../api/baseApi.js";

export const tradesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTradeList: build.query<TradeListResponse, TradeListQuery>({
      query: (params) => ({
        url: "/trades",
        params
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((row) => ({ type: "Trade" as const, id: row.correlationId })),
              "Trade"
            ]
          : ["Trade"]
    }),
    getTradeDetail: build.query<
      TradeDetailResponse,
      { correlationId: string; detailLevel: "standard" | "debug"; timezone: "utc" | "local" }
    >({
      query: ({ correlationId, detailLevel, timezone }) => ({
        url: `/trades/${encodeURIComponent(correlationId)}`,
        params: { detailLevel, timezone }
      }),
      providesTags: (_result, _error, args) => [{ type: "Trade", id: args.correlationId }]
    })
  })
});

export const { useGetTradeListQuery, useGetTradeDetailQuery } = tradesApi;
