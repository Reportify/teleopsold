// API Service for Circle-Based Multi-Tenant Platform
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { AuthService } from "./authService";
import { internalApi } from "./internalApi";

// Global throttle handler - will be set by ThrottleProvider
let globalThrottleHandler: ((waitSeconds: number) => void) | null = null;
let globalNotificationHandler: ((message: string, severity: "error" | "warning" | "info" | "success") => void) | null = null;

// Function to set the global throttle handler
export const setGlobalThrottleHandler = (handler: (waitSeconds: number) => void) => {
  globalThrottleHandler = handler;
};

// Function to set the global notification handler
export const setGlobalNotificationHandler = (handler: (message: string, severity: "error" | "warning" | "info" | "success") => void) => {
  globalNotificationHandler = handler;
};

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api/v1";

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login/",
    LOGOUT: "/auth/logout/",
    REFRESH: "/auth/refresh/",
    VERIFY: "/auth/verify/",
    FORGOT_PASSWORD: "/auth/forgot-password/",
    RESET_PASSWORD: "/auth/reset-password/",
  },
  USERS: {
    PROFILE: "/auth/profile/",
    UPDATE_PROFILE: "/auth/profile/",
    CHANGE_PASSWORD: "/auth/change-password/",
  },
  TENANTS: {
    LIST: "/tenants/",
    DETAIL: (id: string) => `/tenants/${id}/`,
    UPDATE: (id: string) => `/tenants/${id}/`,
    DELETE: (id: string) => `/tenants/${id}/`,
  },
  TELECOM_CIRCLES: {
    LIST: "/circles/", // Geographic telecom circles (from telecom_circle table)
  },
  CORPORATE_CIRCLES: {
    LIST: "/corporate/circles/", // Circle tenants associated with corporate
    INVITE: "/corporate/circles/invite/", // Invite new circle tenant
    PENDING_INVITATIONS: "/corporate/circles/invitations/", // Pending circle invitations
  },
  PROJECTS: {
    LIST: "/projects/",
    CREATE: "/projects/",
    DETAIL: (id: string) => `/projects/${id}/`,
    UPDATE: (id: string) => `/projects/${id}/`,
    DELETE: (id: string) => `/projects/${id}/`,
  },
  SITES: {
    LIST: "/sites/",
    CREATE: "/sites/",
    DETAIL: (id: string) => `/sites/${id}/`,
    UPDATE: (id: string) => `/sites/${id}/`,
    DELETE: (id: string) => `/sites/${id}/`,
  },
  TASKS: {
    LIST: "/tasks/",
    CREATE: "/tasks/",
    DETAIL: (id: string) => `/tasks/${id}/`,
    UPDATE: (id: string) => `/tasks/${id}/`,
    DELETE: (id: string) => `/tasks/${id}/`,
    EQUIPMENT_VERIFICATION: (id: string) => `/tasks/${id}/equipment-verification/`,
  },
  EQUIPMENT: {
    CATEGORIES: {
      LIST: "/equipment/categories/",
      CREATE: "/equipment/categories/",
      DETAIL: (id: string) => `/equipment/categories/${id}/`,
      UPDATE: (id: string) => `/equipment/categories/${id}/`,
      DELETE: (id: string) => `/equipment/categories/${id}/`,
    },
    MODELS: {
      LIST: "/equipment/models/",
      CREATE: "/equipment/models/",
      DETAIL: (id: string) => `/equipment/models/${id}/`,
      UPDATE: (id: string) => `/equipment/models/${id}/`,
      DELETE: (id: string) => `/equipment/models/${id}/`,
    },
  },
  TEAMS: {
    LIST: "/teams/",
    CREATE: "/teams/",
    DETAIL: (id: string) => `/teams/${id}/`,
    UPDATE: (id: string) => `/teams/${id}/`,
    DELETE: (id: string) => `/teams/${id}/`,
  },
  ANALYTICS: {
    DASHBOARD: "/analytics/dashboard/",
    REPORTS: "/analytics/reports/",
    EXPORT: "/analytics/export/",
  },
  NOTIFICATIONS: {
    LIST: "/notifications/",
    MARK_READ: (id: string) => `/notifications/${id}/mark-read/`,
    MARK_ALL_READ: "/notifications/mark-all-read/",
  },
  RELATIONSHIPS: {
    LIST: "/client-vendor-relationships/",
    DETAIL: (id: number | string) => `/client-vendor-relationships/${id}/`,
    UPDATE: (id: number | string) => `/client-vendor-relationships/${id}/`,
    PATCH: (id: number | string) => `/client-vendor-relationships/${id}/`,
  },
} as const;

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add authentication token
    const token = AuthService.getAccessToken();
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }

    // Only add X-Tenant-ID if not calling auth endpoints
    const isAuthEndpoint =
      config.url?.includes("/auth/login") ||
      config.url?.includes("/auth/refresh") ||
      config.url?.includes("/auth/verify") ||
      config.url?.includes("/auth/forgot-password") ||
      config.url?.includes("/auth/reset-password");
    const tenantContext = AuthService.getTenantContext();
    if (tenantContext?.currentTenant && !isAuthEndpoint) {
      config.headers.set("X-Tenant-ID", tenantContext.currentTenant.id);
    }

    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Debug logging for errors
    if (process.env.NODE_ENV === "development") {
      console.error("API Response Error:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        data: error.response?.data,
        headers: error.response?.headers,
      });
    }

    // Handle 429 Throttle errors FIRST (before 401 handling)
    if (error.response?.status === 429) {
      const detail = error.response.data?.detail || "";
      const match = detail.match(/available in (\d+) seconds/);
      let waitMsg = "You have made too many requests. Please wait and try again.";
      let waitSeconds = null;

      if (match) {
        waitSeconds = parseInt(match[1], 10);
        const minutes = Math.ceil(waitSeconds / 60);
        waitMsg = `You have made too many requests. Please wait ${minutes} minute(s) and try again.`;
      }

      // Call global handlers if available

      if (globalNotificationHandler) {
        globalNotificationHandler(waitMsg, "warning");
      }
      if (globalThrottleHandler && waitSeconds) {
        globalThrottleHandler(waitSeconds);
      }

      return Promise.reject(error);
    }

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token
        await AuthService.refreshToken();

        // Retry the original request with new token
        const newToken = AuthService.getAccessToken();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        // Clear auth state and redirect to login
        AuthService.logout();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    if (error.response?.status === 403) {
      console.error("Access forbidden:", error.response.data);
    } else if (error.response?.status === 404) {
      console.error("Resource not found:", error.response.data);
    } else if (error.response?.status >= 500) {
      console.error("Server error:", error.response.data);
    }

    return Promise.reject(error);
  }
);

// API helper functions
export const apiHelpers = {
  // Generic GET request
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return api.get<T>(url, config).then((response) => response.data);
  },

  // Generic POST request
  post: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return api.post<T>(url, data, config).then((response) => response.data);
  },

  // Generic PUT request
  put: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return api.put<T>(url, data, config).then((response) => response.data);
  },

  // Generic PATCH request
  patch: <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return api.patch<T>(url, data, config).then((response) => response.data);
  },

  // Generic DELETE request
  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return api.delete<T>(url, config).then((response) => response.data);
  },

  // File upload
  upload: <T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> => {
    return api
      .put<T>(url, formData, {
        ...config,
        headers: {
          ...config?.headers,
          "Content-Type": "multipart/form-data",
        },
      })
      .then((response) => response.data);
  },

  // Download file
  download: (url: string, filename?: string): Promise<void> => {
    return api
      .get(url, {
        responseType: "blob",
      })
      .then((response) => {
        const blob = new Blob([response.data]);
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = filename || "download";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      });
  },
};

// Error handling utilities
export const errorHandler = {
  // Extract error message from API response
  getErrorMessage: (error: any): string => {
    if (error.response?.data?.detail) {
      return error.response.data.detail;
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.message) {
      return error.message;
    }
    return "An unexpected error occurred";
  },

  // Check if error is network related
  isNetworkError: (error: any): boolean => {
    return !error.response && error.message === "Network Error";
  },

  // Check if error is authentication related
  isAuthError: (error: any): boolean => {
    return error.response?.status === 401 || error.response?.status === 403;
  },

  // Check if error is server related
  isServerError: (error: any): boolean => {
    return error.response?.status >= 500;
  },

  // Check if error is client related
  isClientError: (error: any): boolean => {
    return error.response?.status >= 400 && error.response?.status < 500;
  },
};

// Request/Response logging (development only)
if (process.env.NODE_ENV === "development") {
  api.interceptors.request.use(
    (config) => {
      return config;
    },
    (error) => {
      console.error("API Request Error:", error);
      return Promise.reject(error);
    }
  );

  api.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      console.error("API Response Error:", {
        status: error.response?.status,
        url: error.config?.url,
        data: error.response?.data,
      });
      return Promise.reject(error);
    }
  );
}

export { api };
export default api;

export const relationshipApi = {
  list: (params?: any) => apiHelpers.get(API_ENDPOINTS.RELATIONSHIPS.LIST, { params }),
  retrieve: (id: number | string) => apiHelpers.get(API_ENDPOINTS.RELATIONSHIPS.DETAIL(id)),
  update: (id: number | string, data: any) => apiHelpers.put(API_ENDPOINTS.RELATIONSHIPS.UPDATE(id), data),
  patch: (id: number | string, data: any) => apiHelpers.patch(API_ENDPOINTS.RELATIONSHIPS.PATCH(id), data),
};

// Telecom circles API (geographic regions)
export const telecomCircleApi = {
  // Get all available telecom circles (geographic regions)
  list: () => apiHelpers.get(API_ENDPOINTS.TELECOM_CIRCLES.LIST),
};

// Corporate circle management API (circle tenants)
export const corporateCircleApi = {
  // Get circle tenants managed by current corporate tenant
  getCircleTenants: () => apiHelpers.get(API_ENDPOINTS.CORPORATE_CIRCLES.LIST),

  // Test endpoint connectivity
  testInviteEndpoint: () => apiHelpers.get(API_ENDPOINTS.CORPORATE_CIRCLES.INVITE),

  // Send invitation to create a new circle tenant
  inviteCircleTenant: (invitationData: { selected_circle_id: string; primary_contact_name: string; contact_email: string; contact_phone: string; expiry_date: string }) =>
    apiHelpers.post(API_ENDPOINTS.CORPORATE_CIRCLES.INVITE, invitationData),

  // Get pending circle invitations
  getPendingInvitations: () => apiHelpers.get(API_ENDPOINTS.CORPORATE_CIRCLES.PENDING_INVITATIONS),
};

// Legacy API for backward compatibility
export const circleApi = corporateCircleApi;

// Internal user profile API
export const getInternalProfile = () => internalApi.get("/auth/profile/").then((res) => res.data);
export const updateInternalProfile = (data: any) => internalApi.put("/auth/profile/", data).then((res) => res.data);

// Tenant user profile API
export const getTenantProfile = () => apiHelpers.get(API_ENDPOINTS.USERS.PROFILE);
export const updateTenantProfile = (data: any) => {
  // Check if data is FormData (file upload) or regular object
  if (data instanceof FormData) {
    return apiHelpers.upload(API_ENDPOINTS.USERS.UPDATE_PROFILE, data);
  } else {
    return apiHelpers.put(API_ENDPOINTS.USERS.UPDATE_PROFILE, data);
  }
};
