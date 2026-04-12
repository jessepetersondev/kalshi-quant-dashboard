import type {
  StrategyDetailResponse,
  StrategyListResponse
} from "@kalshi-quant-dashboard/contracts";

import { baseApi } from "../api/baseApi.js";

export const strategiesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getStrategies: build.query<StrategyListResponse, void>({
      query: () => "/strategies",
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((strategy) => ({
                type: "Strategy" as const,
                id: strategy.strategyId
              })),
              "Strategy"
            ]
          : ["Strategy"]
    }),
    getStrategyDetail: build.query<StrategyDetailResponse, string>({
      query: (strategyId) => `/strategies/${strategyId}`,
      providesTags: (_result, _error, strategyId) => [{ type: "Strategy", id: strategyId }]
    })
  })
});

export const { useGetStrategiesQuery, useGetStrategyDetailQuery } = strategiesApi;
