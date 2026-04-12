import { combineReducers, configureStore } from "@reduxjs/toolkit";

import { baseApi } from "../features/api/baseApi.js";
import { compareReducer } from "../features/compare/compareSlice.js";
import { sessionSlice } from "../features/session/sessionSlice.js";

const rootReducer = combineReducers({
  [baseApi.reducerPath]: baseApi.reducer,
  compare: compareReducer,
  session: sessionSlice.reducer
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware)
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
