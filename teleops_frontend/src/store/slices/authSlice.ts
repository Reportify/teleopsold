import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User, UserProfile } from "../../types/user";
import { TenantContext } from "../../types/tenant";

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  userProfile: UserProfile | null;
  tenantContext: TenantContext | null;
  loading: boolean;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  userProfile: null,
  tenantContext: null,
  loading: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth: (
      state,
      action: PayloadAction<{
        user: User;
        userProfile: UserProfile;
        tenantContext: TenantContext;
      }>
    ) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.userProfile = action.payload.userProfile;
      state.tenantContext = action.payload.tenantContext;
    },
    clearAuth: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.userProfile = null;
      state.tenantContext = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setAuth, clearAuth, setLoading } = authSlice.actions;
export default authSlice.reducer;
