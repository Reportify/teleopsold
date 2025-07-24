import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Types
interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  timestamp: string;
}

interface Modal {
  id: string;
  type: string;
  props?: any;
  size?: "sm" | "md" | "lg" | "xl";
}

interface UIState {
  // Loading states
  globalLoading: boolean;
  pageLoading: string | null; // page name that's loading

  // Notifications
  notifications: Notification[];

  // Modals
  modals: Modal[];

  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;

  // Theme
  darkMode: boolean;

  // Circle context
  currentCircle: string | null;
  circleContextOpen: boolean;

  // Mobile responsive
  isMobile: boolean;

  // Errors
  globalError: string | null;
}

const initialState: UIState = {
  globalLoading: false,
  pageLoading: null,
  notifications: [],
  modals: [],
  sidebarOpen: true,
  sidebarCollapsed: false,
  darkMode: false,
  currentCircle: null,
  circleContextOpen: false,
  isMobile: false,
  globalError: null,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    // Loading states
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.globalLoading = action.payload;
    },

    setPageLoading: (state, action: PayloadAction<string | null>) => {
      state.pageLoading = action.payload;
    },

    // Notifications
    addNotification: (state, action: PayloadAction<Omit<Notification, "id" | "timestamp">>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
      };
      state.notifications.unshift(notification);

      // Keep only last 10 notifications
      if (state.notifications.length > 10) {
        state.notifications = state.notifications.slice(0, 10);
      }
    },

    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },

    clearNotifications: (state) => {
      state.notifications = [];
    },

    // Modals
    openModal: (state, action: PayloadAction<Omit<Modal, "id">>) => {
      const modal: Modal = {
        ...action.payload,
        id: Date.now().toString(),
      };
      state.modals.push(modal);
    },

    closeModal: (state, action: PayloadAction<string>) => {
      state.modals = state.modals.filter((m) => m.id !== action.payload);
    },

    closeAllModals: (state) => {
      state.modals = [];
    },

    // Sidebar
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },

    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },

    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },

    // Theme
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.darkMode = action.payload;
    },

    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
    },

    // Circle context
    setCurrentCircle: (state, action: PayloadAction<string | null>) => {
      state.currentCircle = action.payload;
    },

    setCircleContextOpen: (state, action: PayloadAction<boolean>) => {
      state.circleContextOpen = action.payload;
    },

    // Mobile responsive
    setIsMobile: (state, action: PayloadAction<boolean>) => {
      state.isMobile = action.payload;
    },

    // Global error
    setGlobalError: (state, action: PayloadAction<string | null>) => {
      state.globalError = action.payload;
    },

    clearGlobalError: (state) => {
      state.globalError = null;
    },
  },
});

export const {
  setGlobalLoading,
  setPageLoading,
  addNotification,
  removeNotification,
  clearNotifications,
  openModal,
  closeModal,
  closeAllModals,
  setSidebarOpen,
  setSidebarCollapsed,
  toggleSidebar,
  setDarkMode,
  toggleDarkMode,
  setCurrentCircle,
  setCircleContextOpen,
  setIsMobile,
  setGlobalError,
  clearGlobalError,
} = uiSlice.actions;

export default uiSlice.reducer;
