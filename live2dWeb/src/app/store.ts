import { configureStore } from '@reduxjs/toolkit';
import { liveStateReducer } from './features/alive';
import { chatContentReducer } from './features/chat';
import { modeReducer } from './features/mode';
import { characterReducer } from './features/character';

const store = configureStore({
    reducer: {
        liveState: liveStateReducer,
        chatContent: chatContentReducer,
        mode: modeReducer,
        character: characterReducer,
    },
})

export default store;
// 从 store 本身推断 `RootState` 和 `AppDispatch` 类型
export type RootState = ReturnType<typeof store.getState>;
// 推断类型：{posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;