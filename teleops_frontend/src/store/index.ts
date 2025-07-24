import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { api } from "./api";
import authSlice from "./slices/authSlice";
import projectsSlice from "./slices/projectsSlice";
import sitesSlice from "./slices/sitesSlice";
import tasksSlice from "./slices/tasksSlice";
import equipmentSlice from "./slices/equipmentSlice";
import teamsSlice from "./slices/teamsSlice";
import uiSlice from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    // RTK Query API
    api: api.reducer,

    // Business slices
    auth: authSlice,
    projects: projectsSlice,
    sites: sitesSlice,
    tasks: tasksSlice,
    equipment: equipmentSlice,
    teams: teamsSlice,

    // UI state
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    }).concat(api.middleware),
});

// Enable listener behavior for the store
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export { useAppDispatch, useAppSelector } from "./hooks";
