import { createSlice } from "@reduxjs/toolkit";

export const sessionSlice = createSlice({
  name: "session",
  initialState: {
    bootstrappedAt: null as string | null
  },
  reducers: {
    markBootstrapped(state, action: { payload: string }) {
      state.bootstrappedAt = action.payload;
    }
  }
});

export const { markBootstrapped } = sessionSlice.actions;
