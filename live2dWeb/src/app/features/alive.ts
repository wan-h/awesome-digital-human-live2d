import { createSlice } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// 定义 slice state 的类型
interface liveState {
    value: Boolean;
}

// 使用该类型定义初始 state
const initialState: liveState = {
    value: false,
};

export const liveStateSlice = createSlice({
    name: 'isAlive',
    // `createSlice` 将从 `initialState` 参数推断 state 类型
    initialState,
    reducers: {
        activate: (state) => {
            state.value = true;
        },
        deactivate: (state) => {
            state.value = false;
        }
    },
});

export const { activate, deactivate } = liveStateSlice.actions;

// selectors 等其他代码可以使用导入的 `RootState` 类型
export const selectLiveState = (state: RootState) => state.liveState.value;

export const liveStateReducer = liveStateSlice.reducer;