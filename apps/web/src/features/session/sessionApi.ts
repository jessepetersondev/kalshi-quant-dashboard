import type { SessionResponse } from "@kalshi-quant-dashboard/contracts";

import { baseApi } from "../api/baseApi.js";

export const sessionApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSession: build.query<SessionResponse, void>({
      query: () => "/auth/session",
      providesTags: ["Session"]
    })
  })
});

export const { useGetSessionQuery } = sessionApi;
