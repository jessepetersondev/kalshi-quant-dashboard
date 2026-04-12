import type { OverviewResponse } from "@kalshi-quant-dashboard/contracts";

import { baseApi } from "../api/baseApi.js";

export const overviewApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOverview: build.query<OverviewResponse, { timezone: "utc" | "local" }>({
      query: ({ timezone }) => ({
        url: "/overview",
        params: { timezone }
      }),
      providesTags: ["Overview"]
    })
  })
});

export const { useGetOverviewQuery } = overviewApi;
