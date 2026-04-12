import type {
  PnlSummaryQuery,
  PnlSummaryResponse,
  PnlTimeseriesQuery,
  PnlTimeseriesResponse
} from "@kalshi-quant-dashboard/contracts";

import { baseApi } from "../api/baseApi.js";

export const pnlApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPnlSummary: build.query<PnlSummaryResponse, PnlSummaryQuery>({
      query: (params) => ({
        url: "/pnl/summary",
        params
      }),
      providesTags: ["Pnl"]
    }),
    getPnlTimeseries: build.query<PnlTimeseriesResponse, PnlTimeseriesQuery>({
      query: (params) => ({
        url: "/pnl/timeseries",
        params
      }),
      providesTags: ["Pnl"]
    })
  })
});

export const { useGetPnlSummaryQuery, useGetPnlTimeseriesQuery } = pnlApi;
