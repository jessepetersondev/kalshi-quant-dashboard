import type {
  SkipListQuery,
  SkipListResponse
} from "@kalshi-quant-dashboard/contracts";

import { baseApi } from "../api/baseApi.js";

export const skipsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSkipList: build.query<SkipListResponse, SkipListQuery>({
      query: (params) => ({
        url: "/skips",
        params
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((row) => ({ type: "Skip" as const, id: row.correlationId })),
              "Skip"
            ]
          : ["Skip"]
    })
  })
});

export const { useGetSkipListQuery } = skipsApi;
