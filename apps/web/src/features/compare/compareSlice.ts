import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface CompareState {
  readonly selectedStrategyIds: string[];
}

const initialState: CompareState = {
  selectedStrategyIds: []
};

const compareSlice = createSlice({
  name: "compare",
  initialState,
  reducers: {
    setComparedStrategies(state, action: PayloadAction<string[]>) {
      return {
        ...state,
        selectedStrategyIds: [...new Set(action.payload)].filter(Boolean)
      };
    },
    toggleComparedStrategy(state, action: PayloadAction<string>) {
      state.selectedStrategyIds = state.selectedStrategyIds.includes(action.payload)
        ? state.selectedStrategyIds.filter((value) => value !== action.payload)
        : [...state.selectedStrategyIds, action.payload];
    }
  }
});

export const { setComparedStrategies, toggleComparedStrategy } = compareSlice.actions;
export const compareReducer = compareSlice.reducer;
