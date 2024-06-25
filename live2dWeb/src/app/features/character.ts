import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

export interface CharacterInfo {
    name: string;
    portrait: string;
    intro: string;
}


// 定义 slice state 的类型
interface characterState {
    value: CharacterInfo;
}

// 使用该类型定义初始 state
const initialState: characterState = {
    value: {name: "Kei", portrait: "", intro: ""},
};

export const characterStateSlice = createSlice({
    name: 'character',
    // `createSlice` 将从 `initialState` 参数推断 state 类型
    initialState,
    reducers: {
        setCharacter: (state, action: PayloadAction<CharacterInfo>) => {
            state.value = action.payload;
        }
    },
});

export const { setCharacter } = characterStateSlice.actions;

// selectors 等其他代码可以使用导入的 `RootState` 类型
export const selectMode = (state: RootState) => state.mode.value;

export const characterReducer = characterStateSlice.reducer;