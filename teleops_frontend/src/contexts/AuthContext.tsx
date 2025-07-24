// Authentication Context for Circle-Based Multi-Tenant Platform
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AuthService } from "../services/authService";
import { LoginCredentials, LoginResponse, User, UserProfile } from "../types/user";
import { TenantContext } from "../types/tenant";

// Auth context interface
interface AuthContextType {
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthChecking: boolean; // Add this line
  user: User | null;
  userProfile: UserProfile | null;
  profile: any | null; // Add profile state for full profile data
  tenantContext: TenantContext | null;

  // Internal user state
  isInternalAuthenticated: boolean;
  internalUser: any | null;

  // Authentication methods
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;

  // Internal authentication methods
  loginInternal: (email: string, password: string) => Promise<void>;
  logoutInternal: () => Promise<void>;

  // User type helpers
  getUserType: () => "teleops" | "corporate" | "circle" | "vendor" | null;
  isTeleopsAdmin: () => boolean;
  isCorporateUser: () => boolean;
  isCircleUser: () => boolean;
  isVendorUser: () => boolean;

  // Tenant helpers
  getCurrentTenant: () => any;
  getTenantDisplayName: () => string;
  getCircleDisplayName: () => string;
  getUserDisplayName: () => string;

  // Permission helpers
  hasPermission: (permission: string) => boolean;
  getUserPermissions: () => string[];
  hasCorporateAccess: () => boolean;
  getAccessibleCircles: () => any[];

  // Profile helpers
  getEmployeeId: () => string;
  getUserDesignation: () => string;
  getUserPhone: () => string;
  getCircleEmployeeCode: () => string;

  // Add a method to refresh internal auth state from localStorage
  loginInternalUser: () => void;
  refreshProfile: () => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthChecking, setIsAuthChecking] = useState(true); // Add this line
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profile, setProfile] = useState<any | null>(null); // Add profile state
  const [tenantContext, setTenantContext] = useState<TenantContext | null>(null);
  const [isInternalAuthenticated, setIsInternalAuthenticated] = useState(false);
  const [internalUser, setInternalUser] = useState<any | null>(null);

  // Initialize authentication on mount
  useEffect(() => {
    initializeAuth();
    initializeInternalAuth();
  }, []);

  // Initialize authentication
  const initializeAuth = async () => {
    try {
      setIsAuthChecking(true); // Set auth checking to true
      setIsLoading(true);

      // Check if user is authenticated
      if (AuthService.isAuthenticated()) {
        // Verify token and get fresh data
        const response = await AuthService.verifyToken();
        setAuthState(response);
      } else {
        // Clear any stale data
        clearAuthState();
      }
    } catch (error) {
      console.error("Auth initialization failed:", error);
      clearAuthState();
    } finally {
      setIsAuthChecking(false); // Set auth checking to false
      setIsLoading(false);
    }
  };

  // Initialize internal authentication
  const initializeInternalAuth = async () => {
    try {
      setIsLoading(true);
      if (AuthService.isInternalAuthenticated()) {
        const user = AuthService.getInternalUser();
        setInternalUser(user);
        setIsInternalAuthenticated(true);
      } else {
        setInternalUser(null);
        setIsInternalAuthenticated(false);
      }
    } catch (error) {
      setInternalUser(null);
      setIsInternalAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Set authentication state
  const setAuthState = (response: LoginResponse) => {
    setUser(response.user);
    setUserProfile(response.user_profile);
    setTenantContext(response.tenant_context);
    setIsAuthenticated(true);
    // Fetch full profile data
    fetchProfile();
  };

  // Clear authentication state
  const clearAuthState = () => {
    setUser(null);
    setUserProfile(null);
    setProfile(null); // Clear profile state
    setTenantContext(null);
    setIsAuthenticated(false);
  };

  // Fetch profile data
  const fetchProfile = async () => {
    try {
      const { getTenantProfile, getInternalProfile } = await import("../services/api");
      const isInternalUser = AuthService.isInternalAuthenticated();
      const data = isInternalUser ? await getInternalProfile() : await getTenantProfile();
      setProfile(data);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    }
  };

  // Refresh profile data
  const refreshProfile = async () => {
    await fetchProfile();
  };

  // Login function
  const login = async (email: string, password: string) => {
    try {
      const credentials: LoginCredentials = { email, password };
      const response = await AuthService.login(credentials);
      setAuthState(response);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      clearAuthState();
    }
  };

  // Refresh authentication
  const refreshAuth = async () => {
    try {
      await AuthService.refreshToken();
      const response = await AuthService.verifyToken();
      setAuthState(response);
    } catch (error) {
      console.error("Auth refresh failed:", error);
      await logout(); // Ensures localStorage is cleared on refresh failure
      throw error;
    }
  };

  // Internal login function
  const loginInternal = async (email: string, password: string) => {
    try {
      const response = await AuthService.loginInternal(email, password);
      setInternalUser(response.user);
      setIsInternalAuthenticated(true);
    } catch (error) {
      setInternalUser(null);
      setIsInternalAuthenticated(false);
      throw error;
    }
  };

  // Internal logout function
  const logoutInternal = async () => {
    try {
      await AuthService.logoutInternal();
    } catch (error) {
      // ignore
    } finally {
      setInternalUser(null);
      setIsInternalAuthenticated(false);
    }
  };

  // Add a method to refresh internal auth state from localStorage
  const loginInternalUser = () => {
    const user = AuthService.getInternalUser();
    setInternalUser(user);
    setIsInternalAuthenticated(AuthService.isInternalAuthenticated());
  };

  // User type helpers
  const getUserType = () => AuthService.getUserType();
  const isTeleopsAdmin = () => AuthService.isTeleopsAdmin();
  const isCorporateUser = () => AuthService.isCorporateUser();
  const isCircleUser = () => AuthService.isCircleUser();
  const isVendorUser = () => AuthService.isVendorUser();

  // Tenant helpers
  const getCurrentTenant = () => AuthService.getCurrentTenant();
  const getTenantDisplayName = () => AuthService.getTenantDisplayName();
  const getCircleDisplayName = () => AuthService.getCircleDisplayName();
  const getUserDisplayName = () => AuthService.getUserDisplayName();

  // Permission helpers
  const hasPermission = (permission: string) => AuthService.hasPermission(permission);
  const getUserPermissions = () => AuthService.getUserPermissions();
  const hasCorporateAccess = () => AuthService.hasCorporateAccess();
  const getAccessibleCircles = () => AuthService.getAccessibleCircles();

  // Profile helpers
  const getEmployeeId = () => AuthService.getEmployeeId();
  const getUserDesignation = () => AuthService.getUserDesignation();
  const getUserPhone = () => AuthService.getUserPhone();
  const getCircleEmployeeCode = () => AuthService.getCircleEmployeeCode();

  // Context value
  const value: AuthContextType = {
    // Authentication state
    isAuthenticated,
    isLoading,
    isAuthChecking, // Add this line
    user,
    userProfile,
    profile, // Use actual profile state
    tenantContext,

    // Internal user state
    isInternalAuthenticated,
    internalUser,

    // Authentication methods
    login,
    logout,
    refreshAuth,

    // Internal authentication methods
    loginInternal,
    logoutInternal,

    // User type helpers
    getUserType,
    isTeleopsAdmin,
    isCorporateUser,
    isCircleUser,
    isVendorUser,

    // Tenant helpers
    getCurrentTenant,
    getTenantDisplayName,
    getCircleDisplayName,
    getUserDisplayName,

    // Permission helpers
    hasPermission,
    getUserPermissions,
    hasCorporateAccess,
    getAccessibleCircles,

    // Profile helpers
    getEmployeeId,
    getUserDesignation,
    getUserPhone,
    getCircleEmployeeCode,

    // Add a method to refresh internal auth state from localStorage
    loginInternalUser,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
