import { createSlice } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// 定义 slice state 的类型
interface modeState {
    value: string;
}

// 使用该类型定义初始 state
const initialState: modeState = {
    value: "Repeater",
};

export const modeStateSlice = createSlice({
    name: 'mode',
    // `createSlice` 将从 `initialState` 参数推断 state 类型
    initialState,
    reducers: {
        setRepeater: (state) => {
            state.value = "Repeater";
        },
        setDialogue: (state) => {
            state.value = "Dialogue";
        }
    },
});

export const { setRepeater, setDialogue } = modeStateSlice.actions;

// selectors 等其他代码可以使用导入的 `RootState` 类型
export const selectMode = (state: RootState) => state.mode.value;

export const modeReducer = modeStateSlice.reducer;