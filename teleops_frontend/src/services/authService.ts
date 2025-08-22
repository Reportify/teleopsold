// Authentication Service for Circle-Based Multi-Tenant Platform
import { api, API_ENDPOINTS } from "./api";
import { LoginCredentials, LoginResponse, User, UserProfile } from "../types/user";
import { TenantContext } from "../types/tenant";
import { internalApi } from "./internalApi";

// Token management
const TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const TENANT_CONTEXT_KEY = "tenant_context";
const REMEMBER_ME_KEY = "rememberMe";

const INTERNAL_TOKEN_KEY = "internal_access_token";
const INTERNAL_REFRESH_TOKEN_KEY = "internal_refresh_token";
const INTERNAL_USER_KEY = "internal_user";

export class AuthService {
  // Login user
  static async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await api.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, credentials);

      // Store tokens and context
      this.storeTokens(response.data.access, response.data.refresh);
      this.storeTenantContext(response.data.tenant_context);

      // Ensure both tokens are present
      if (!this.getAccessToken() || !this.getRefreshToken()) {
        throw new Error("Authentication tokens not properly stored.");
      }

      return response.data;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }

  // Logout user
  static async logout(): Promise<void> {
    try {
      // Call logout endpoint if user is authenticated
      const token = this.getAccessToken();
      if (token) {
        await api.post(API_ENDPOINTS.AUTH.LOGOUT);
      }
    } catch (error) {
      console.error("Logout API call failed:", error);
    } finally {
      // Clear local storage regardless of API call success
      this.clearTokens();
      this.clearTenantContext();
    }
  }

  // Refresh access token
  static async refreshToken(): Promise<string> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await api.post<{ access: string }>(API_ENDPOINTS.AUTH.REFRESH, {
        refresh: refreshToken,
      });

      // Update stored access token only (do not clear refresh token)
      this.storeAccessToken(response.data.access);

      return response.data.access;
    } catch (error) {
      console.error("Token refresh failed:", error);
      // Only clear tokens if both access and refresh are invalid
      this.clearTokens();
      this.clearTenantContext();
      throw error;
    }
  }

  // Verify token and get user data
  static async verifyToken(): Promise<LoginResponse> {
    try {
      const response = await api.get<LoginResponse>(API_ENDPOINTS.AUTH.VERIFY);

      // Update stored context if needed
      this.storeTenantContext(response.data.tenant_context);

      return response.data;
    } catch (error) {
      console.error("Token verification failed:", error);
      throw error;
    }
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    const token = this.getAccessToken();
    return !!token && !this.isTokenExpired(token);
  }

  // Get current access token
  static getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  // Get current refresh token
  static getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  // Get stored tenant context
  static getTenantContext(): TenantContext | null {
    const context = localStorage.getItem(TENANT_CONTEXT_KEY);
    return context ? JSON.parse(context) : null;
  }

  // Check if remember me is enabled
  static isRememberMeEnabled(): boolean {
    return localStorage.getItem(REMEMBER_ME_KEY) === "true";
  }

  // Store tokens
  private static storeTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  // Store access token only
  private static storeAccessToken(accessToken: string): void {
    localStorage.setItem(TOKEN_KEY, accessToken);
  }

  // Store tenant context
  private static storeTenantContext(context: TenantContext): void {
    localStorage.setItem(TENANT_CONTEXT_KEY, JSON.stringify(context));
  }

  // Clear all tokens
  private static clearTokens(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    // Clear user-specific data including flow templates
    localStorage.removeItem("flowTemplates");
    // Clear all user-specific application data
    this.clearProjectDesignData();
  }

  // Clear tenant context
  private static clearTenantContext(): void {
    localStorage.removeItem(TENANT_CONTEXT_KEY);
  }

  // Clear all user-specific application data
  private static clearProjectDesignData(): void {
    const keysToRemove: string[] = [];
    // Iterate through all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith("project_design_") || // Project design data
          key === "mock_inventory" || // Inventory data
          key === "rememberMe") // Remember me preference
      ) {
        keysToRemove.push(key);
      }
    }
    // Remove all user-specific data keys
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  // Check if token is expired (basic check)
  private static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      console.error("Error parsing token:", error);
      return true; // Assume expired if we can't parse
    }
  }

  // Get user type from tenant context
  static getUserType(): "teleops" | "corporate" | "circle" | "vendor" | null {
    const context = this.getTenantContext();
    if (!context?.currentTenant) return null;

    switch (context.currentTenant.tenant_type) {
      case "Corporate":
        return "corporate";
      case "Circle":
        return "circle";
      case "Vendor":
        return "vendor";
      default:
        return null;
    }
  }

  // Get primary circle for corporate users
  static getPrimaryCircle() {
    const context = this.getTenantContext();
    return context?.primaryCircle || null;
  }

  // Get accessible circles for corporate users
  static getAccessibleCircles() {
    const context = this.getTenantContext();
    return context?.accessibleCircles || [];
  }

  // Check if user has specific permission
  static hasPermission(permission: string): boolean {
    const context = this.getTenantContext();
    return context?.userPermissions?.includes(permission) || false;
  }

  // Get user permissions
  static getUserPermissions(): string[] {
    const context = this.getTenantContext();
    return context?.userPermissions || [];
  }

  // Check if user has corporate access (can see multiple circles)
  static hasCorporateAccess(): boolean {
    const context = this.getTenantContext();
    return context?.corporateAccess || false;
  }

  // Get cross-circle permissions
  static getCrossCirclePermissions(): string[] {
    const context = this.getTenantContext();
    return context?.crossCirclePermissions || [];
  }

  // Get current tenant
  static getCurrentTenant() {
    const context = this.getTenantContext();
    return context?.currentTenant || null;
  }

  // Get user profile
  static getUserProfile() {
    const context = this.getTenantContext();
    return context?.userProfile || null;
  }

  // Set remember me preference
  static setRememberMe(enabled: boolean): void {
    if (enabled) {
      localStorage.setItem(REMEMBER_ME_KEY, "true");
    } else {
      localStorage.removeItem(REMEMBER_ME_KEY);
    }
  }

  // Clear remember me preference
  static clearRememberMe(): void {
    localStorage.removeItem(REMEMBER_ME_KEY);
  }

  // Get user display name
  static getUserDisplayName(): string {
    const context = this.getTenantContext();
    const user = context?.user;
    if (user) {
      return `${user.first_name} ${user.last_name}`.trim();
    }
    return "User";
  }

  // Get tenant display name
  static getTenantDisplayName(): string {
    const context = this.getTenantContext();
    const tenant = context?.currentTenant;
    if (tenant) {
      return tenant.organization_name;
    }
    return "Organization";
  }

  // Get circle display name (for circle users)
  static getCircleDisplayName(): string {
    const context = this.getTenantContext();
    const circle = context?.primaryCircle;
    if (circle) {
      return circle.circle_name || circle.organization_name;
    }
    return "";
  }

  // Check if user is teleops admin
  static isTeleopsAdmin(): boolean {
    const context = this.getTenantContext();
    const user = context?.user;
    return user?.is_superuser || false;
  }

  // Check if user is corporate user
  static isCorporateUser(): boolean {
    return this.getUserType() === "corporate";
  }

  // Check if user is circle user
  static isCircleUser(): boolean {
    return this.getUserType() === "circle";
  }

  // Check if user is vendor user
  static isVendorUser(): boolean {
    return this.getUserType() === "vendor";
  }

  // Get user's employee ID
  static getEmployeeId(): string {
    const context = this.getTenantContext();
    const profile = context?.userProfile;
    return profile?.employee_id || "";
  }

  // Get user's designation
  static getUserDesignation(): string {
    const context = this.getTenantContext();
    const profile = context?.userProfile;
    return profile?.designation?.designation_name || "";
  }

  // Get user's phone number
  static getUserPhone(): string {
    const context = this.getTenantContext();
    const profile = context?.userProfile;
    return profile?.phone_number || "";
  }

  // Get user's circle employee code
  static getCircleEmployeeCode(): string {
    const context = this.getTenantContext();
    const profile = context?.userProfile;
    return profile?.circle_employee_code || "";
  }

  // Internal user login
  static async loginInternal(email: string, password: string): Promise<any> {
    try {
      const response = await internalApi.post("/auth/login/", { email, password });

      // The backend wraps response in a data object, so we need response.data.data
      const data = response.data.data || response.data;

      if (!data.access || !data.refresh) {
        console.error("AuthService.loginInternal - Missing tokens in response!", data);
        throw new Error("Invalid login response: missing tokens");
      }

      this.storeInternalTokens(data.access, data.refresh);
      this.storeInternalUser(data.user);

      return data;
    } catch (error) {
      console.error("Internal login failed:", error);
      throw error;
    }
  }

  static async logoutInternal(): Promise<void> {
    try {
      const refresh = this.getInternalRefreshToken();
      if (refresh) {
        await internalApi.post("/auth/logout/", { refresh });
      }
    } catch (error) {
      console.error("Internal logout API call failed:", error);
    } finally {
      this.clearInternalTokens();
      this.clearInternalUser();
    }
  }

  static isInternalAuthenticated(): boolean {
    const token = this.getInternalAccessToken();
    return !!token && !this.isTokenExpired(token);
  }

  static getInternalAccessToken(): string | null {
    return localStorage.getItem(INTERNAL_TOKEN_KEY);
  }

  static getInternalRefreshToken(): string | null {
    return localStorage.getItem(INTERNAL_REFRESH_TOKEN_KEY);
  }

  static getInternalUser(): any {
    const user = localStorage.getItem(INTERNAL_USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  private static storeInternalTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(INTERNAL_TOKEN_KEY, accessToken);
    localStorage.setItem(INTERNAL_REFRESH_TOKEN_KEY, refreshToken);
  }

  static clearInternalTokens(): void {
    localStorage.removeItem(INTERNAL_TOKEN_KEY);
    localStorage.removeItem(INTERNAL_REFRESH_TOKEN_KEY);
    // Clear user-specific data including flow templates
    localStorage.removeItem("flowTemplates");
    // Clear all user-specific application data
    this.clearProjectDesignData();
  }

  private static storeInternalUser(user: any): void {
    localStorage.setItem(INTERNAL_USER_KEY, JSON.stringify(user));
  }

  static clearInternalUser(): void {
    localStorage.removeItem(INTERNAL_USER_KEY);
  }
}

export default AuthService;
