import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Board } from '@/types';

interface BoardState {
  current: Board | null;
}

const initialState: BoardState = {
  current: null
};

const boardSlice = createSlice({
  name: 'board',
  initialState,
  reducers: {
    selectBoard: (state, action: PayloadAction<Board>) => {
      state.current = action.payload;
    },
    clearBoard: (state) => {
      state.current = null;
    }
  }
});

export const { selectBoard, clearBoard } = boardSlice.actions;
export default boardSlice.reducer;
