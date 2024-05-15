import { createSlice, PayloadAction  } from '@reduxjs/toolkit';
import type { RootState } from '../store';

export interface MessageInfo {
    name: string;
    message: string;
}
  
interface chatContent {
    value: MessageInfo[];
}

// 使用该类型定义初始 state
const initialState: chatContent = {
    value: [],
};

export const chatContentSlice = createSlice({
    name: 'chatContent',
    // `createSlice` 将从 `initialState` 参数推断 state 类型
    initialState,
    reducers: {
        addMessage: (state, action: PayloadAction<MessageInfo>) => {
            state.value = [...state.value, action.payload];
        },
        clear: (state) => {
            state.value = [];
        }
    },
});

export const { addMessage, clear } = chatContentSlice.actions;

// selectors 等其他代码可以使用导入的 `RootState` 类型
export const selectChatContent = (state: RootState) => state.liveState.value;

export const chatContentReducer = chatContentSlice.reducer;