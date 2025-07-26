// Internal API Service for Teleops Internal Portal
import axios, { AxiosInstance, AxiosResponse } from "axios";
import { setGlobalThrottleHandler, setGlobalNotificationHandler } from "./api";

// Global throttle handler references (same as main api.ts)
let globalThrottleHandler: ((waitSeconds: number) => void) | null = null;
let globalNotificationHandler: ((message: string, severity: "error" | "warning" | "info" | "success") => void) | null = null;

// Functions to set the global handlers (called from App.tsx)
export const setInternalThrottleHandler = (handler: (waitSeconds: number) => void) => {
  globalThrottleHandler = handler;
};

export const setInternalNotificationHandler = (handler: (message: string, severity: "error" | "warning" | "info" | "success") => void) => {
  globalNotificationHandler = handler;
};

// API Configuration
const INTERNAL_API_BASE_URL = process.env.REACT_APP_INTERNAL_API_BASE_URL || "http://localhost:8000/internal";

// Token management constants (to avoid circular dependency)
const INTERNAL_TOKEN_KEY = "internal_access_token";
const INTERNAL_REFRESH_TOKEN_KEY = "internal_refresh_token";
const INTERNAL_USER_KEY = "internal_user";

// Helper functions for token management (to avoid circular dependency)
const getInternalAccessToken = (): string | null => {
  return localStorage.getItem(INTERNAL_TOKEN_KEY);
};

const clearInternalTokens = (): void => {
  localStorage.removeItem(INTERNAL_TOKEN_KEY);
  localStorage.removeItem(INTERNAL_REFRESH_TOKEN_KEY);
};

const clearInternalUser = (): void => {
  localStorage.removeItem(INTERNAL_USER_KEY);
};

// Create axios instance for internal API
const internalApi: AxiosInstance = axios.create({
  baseURL: INTERNAL_API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add authentication token
internalApi.interceptors.request.use(
  (config) => {
    const token = getInternalAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
internalApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.log("Internal API Interceptor - Error caught:", {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });

    // Handle 429 Throttle errors FIRST (before 401 handling)
    if (error.response?.status === 429) {
      // Try multiple ways to extract the throttle information
      const errorData = error.response.data;

      const detail = errorData?.detail || errorData?.message || "";
      const match = detail.match(/available in (\d+) seconds/);
      let waitMsg = "You have made too many requests. Please wait and try again.";
      let waitSeconds = null;

      if (match) {
        waitSeconds = parseInt(match[1], 10);
        const minutes = Math.ceil(waitSeconds / 60);
        waitMsg = `You have made too many requests. Please wait ${minutes} minute(s) and try again.`;
      } else {
        // Fallback: use a default wait time if we can't parse the exact time
        waitSeconds = 300; // 5 minutes default
        waitMsg = "You have made too many requests. Please wait 5 minutes and try again.";
      }

      // Call global handlers if available
      console.log("Internal API Global handlers status:", {
        hasNotificationHandler: !!globalNotificationHandler,
        hasThrottleHandler: !!globalThrottleHandler,
        waitSeconds,
      });

      if (globalNotificationHandler) {
        globalNotificationHandler(waitMsg, "warning");
      }
      if (globalThrottleHandler && waitSeconds) {
        globalThrottleHandler(waitSeconds);
      }

      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      // Handle token expiration
      clearInternalTokens();
      clearInternalUser();
      window.location.href = "/internal/login";
    }
    return Promise.reject(error);
  }
);

// API Response Types
interface APIResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: any;
}

interface PaginatedResponse<T = any> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
  page_count: number;
  current_page: number;
}

// Tenant Management Types
export interface TenantData {
  id: string;
  organization_name: string;
  tenant_type: "Corporate" | "Circle" | "Vendor";
  status: "active" | "suspended" | "pending" | "cancelled";
  registration_status: "Approved" | "Pending" | "Rejected";
  activation_status: "Active" | "Suspended" | "Inactive";
  rejection_reason?: string;
  primary_contact_name: string;
  primary_contact_email: string;
  primary_contact_phone?: string;
  subscription_plan: string;
  last_login?: string;
  support_tickets: number;
  users: number;
  usage_metrics: {
    projects: number;
    sites: number;
    equipment?: number;
    storage_gb?: number;
    api_calls?: number;
  };
  payment_status: "paid" | "pending" | "overdue" | "failed";
  monthly_revenue: number;
  overage_charges: number;
  is_trial: boolean;
  trial_end?: string;
  created_at: string;
  updated_at: string;
  parent?: string;
  children?: string[];
  // Vendor-specific fields
  coverage_areas?: string[];
  service_capabilities?: string[];
  certifications?: string[];

  // Timestamp fields
  registered_at?: string;
  activated_at?: string;
  deactivated_at?: string;

  // Backend-specific fields for tenant details
  user_count?: number;
  usage_statistics?: {
    projects_count?: number;
    sites_count?: number;
    equipment_count?: number;
    tasks_count?: number;
  };
}

// TenantFilters interface removed - now using client-side filtering

export interface TenantUpdateData {
  organization_name?: string;
  primary_contact_name?: string;
  primary_contact_email?: string;
  primary_contact_phone?: string;
  subscription_plan?: string;
}

export interface TenantSuspensionData {
  reason: string;
}

// Internal API Service Class
export class InternalAPIService {
  // Dashboard
  static async getDashboard(): Promise<APIResponse> {
    const response: AxiosResponse<APIResponse> = await internalApi.get("/dashboard/");
    return response.data;
  }

  // Tenant Management (simplified for client-side filtering)
  static async getTenants(filters?: Record<string, any>): Promise<APIResponse<any>> {
    // Filters parameter kept for compatibility but ignored - all filtering is now client-side
    const response: AxiosResponse<APIResponse<any>> = await internalApi.get("/tenants/");
    return response.data;
  }

  static async getTenantDetail(tenantId: string): Promise<APIResponse<TenantData>> {
    const response: AxiosResponse<APIResponse<TenantData>> = await internalApi.get(`/tenants/${tenantId}/`);
    return response.data;
  }

  static async updateTenant(tenantId: string, data: TenantUpdateData): Promise<APIResponse<TenantData>> {
    const response: AxiosResponse<APIResponse<TenantData>> = await internalApi.put(`/tenants/${tenantId}/update/`, data);
    return response.data;
  }

  static async suspendTenant(tenantId: string, reason: string): Promise<APIResponse> {
    const response: AxiosResponse<APIResponse> = await internalApi.post(`/tenants/${tenantId}/suspend/`, { reason });
    return response.data;
  }

  static async reactivateTenant(tenantId: string): Promise<APIResponse> {
    const response: AxiosResponse<APIResponse> = await internalApi.post(`/tenants/${tenantId}/reactivate/`);
    return response.data;
  }

  static async getTenantUsers(tenantId: string): Promise<APIResponse> {
    const response: AxiosResponse<APIResponse> = await internalApi.get(`/tenants/${tenantId}/users/`);
    return response.data;
  }

  // Analytics
  static async getAnalytics(timeRange?: string): Promise<APIResponse> {
    const params = timeRange ? `?time_range=${timeRange}` : "";
    const response: AxiosResponse<APIResponse> = await internalApi.get(`/analytics/${params}`);
    return response.data;
  }

  // Subscription Plans
  static async getSubscriptionPlans(): Promise<APIResponse> {
    const response: AxiosResponse<APIResponse> = await internalApi.get("/plans/");
    return response.data;
  }

  static async createSubscriptionPlan(data: any): Promise<APIResponse> {
    const response: AxiosResponse<APIResponse> = await internalApi.post("/plans/", data);
    return response.data;
  }

  static async updateSubscriptionPlan(planId: string, data: any): Promise<APIResponse> {
    const response: AxiosResponse<APIResponse> = await internalApi.put(`/plans/${planId}/`, data);
    return response.data;
  }

  // Billing
  static async getInvoices(filters?: any): Promise<APIResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString());
        }
      });
    }
    const response: AxiosResponse<APIResponse> = await internalApi.get(`/invoices/?${params.toString()}`);
    return response.data;
  }

  static async markInvoiceAsPaid(invoiceId: string): Promise<APIResponse> {
    const response: AxiosResponse<APIResponse> = await internalApi.post(`/invoices/${invoiceId}/mark-paid/`);
    return response.data;
  }

  // Support Tickets
  static async getSupportTickets(filters?: any): Promise<APIResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString());
        }
      });
    }
    const response: AxiosResponse<APIResponse> = await internalApi.get(`/support/tickets/?${params.toString()}`);
    return response.data;
  }

  static async assignTicket(ticketId: string, userId: string): Promise<APIResponse> {
    const response: AxiosResponse<APIResponse> = await internalApi.post(`/support/tickets/${ticketId}/assign/`, { user_id: userId });
    return response.data;
  }

  static async resolveTicket(ticketId: string, resolution: string): Promise<APIResponse> {
    const response: AxiosResponse<APIResponse> = await internalApi.post(`/support/tickets/${ticketId}/resolve/`, { resolution });
    return response.data;
  }

  // Vendor Management
  static async getVendorRelationships(filters?: any): Promise<APIResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString());
        }
      });
    }
    const response: AxiosResponse<APIResponse> = await internalApi.get(`/vendors/relationships/?${params.toString()}`);
    return response.data;
  }

  static async createVendorRelationship(data: any): Promise<APIResponse> {
    const response: AxiosResponse<APIResponse> = await internalApi.post("/vendors/relationships/", data);
    return response.data;
  }

  static async approveVendorRelationship(relationshipId: string): Promise<APIResponse> {
    const response: AxiosResponse<APIResponse> = await internalApi.post(`/vendors/relationships/${relationshipId}/approve/`);
    return response.data;
  }

  // Invitations
  static async createTenantInvitation(data: any): Promise<APIResponse> {
    const response: AxiosResponse<APIResponse> = await internalApi.post("/invitations/", data);
    return response.data;
  }

  static async getInvitations(filters?: any): Promise<APIResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString());
        }
      });
    }
    const response: AxiosResponse<APIResponse> = await internalApi.get(`/invitations/?${params.toString()}`);
    return response.data;
  }

  static async resendInvitation(invitationId: string, expiresAt?: string): Promise<APIResponse> {
    const requestData = expiresAt ? { expires_at: expiresAt } : {};
    const response: AxiosResponse<APIResponse> = await internalApi.post(`/invitations/${invitationId}/`, requestData);
    return response.data;
  }

  // Email Verification
  static async getEmailVerificationTokens(filters?: any): Promise<APIResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString());
        }
      });
    }
    const response: AxiosResponse<APIResponse> = await internalApi.get(`/email-verification/?${params.toString()}`);
    return response.data;
  }

  static async cancelInvitation(invitationId: string): Promise<APIResponse> {
    const response: AxiosResponse<APIResponse> = await internalApi.patch(`/invitations/${invitationId}/`);
    return response.data;
  }

  static async deleteInvitation(invitationId: string): Promise<APIResponse> {
    const response: AxiosResponse<APIResponse> = await internalApi.delete(`/invitations/${invitationId}/`);
    return response.data;
  }

  // Resend email verification for accepted invitations
  static async resendEmailVerification(invitationId: string): Promise<APIResponse> {
    const response: AxiosResponse<APIResponse> = await internalApi.post(`/invitations/${invitationId}/resend-verification/`);
    return response.data;
  }

  // Get email verification token for a specific invitation
  static async getEmailVerificationToken(invitationId: string): Promise<APIResponse> {
    const response: AxiosResponse<APIResponse> = await internalApi.get(`/invitations/${invitationId}/verification-token/`);
    return response.data;
  }

  // Approve a pending tenant
  static async approveTenant(tenantId: string): Promise<APIResponse> {
    try {
      const updateData = {
        registration_status: "Approved",
        activation_status: "Active",
        is_active: true,
        activated_at: new Date().toISOString(),
      };

      const response: AxiosResponse<APIResponse> = await internalApi.put(`/tenants/${tenantId}/update/`, updateData);

      return response.data;
    } catch (error: any) {
      console.error("Error approving tenant:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || error.message || "Failed to approve tenant",
        errors: error.response?.data?.errors || { general: "APPROVAL_FAILED" },
      };
    }
  }

  // Reject a pending tenant
  static async rejectTenant(tenantId: string, reason?: string): Promise<APIResponse> {
    try {
      const response: AxiosResponse<APIResponse> = await internalApi.put(`/tenants/${tenantId}/update/`, {
        registration_status: "Rejected",
        activation_status: "Inactive",
        is_active: false,
        rejection_reason: reason || "Rejected via internal portal",
      });
      return response.data;
    } catch (error: any) {
      console.error("Error rejecting tenant:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || error.message || "Failed to reject tenant",
        errors: error.response?.data?.errors || { general: "REJECTION_FAILED" },
      };
    }
  }

  // Cancel rejection for a rejected tenant
  static async cancelRejection(tenantId: string): Promise<APIResponse> {
    try {
      const response: AxiosResponse<APIResponse> = await internalApi.post(`/tenants/${tenantId}/cancel-rejection/`);
      return response.data;
    } catch (error: any) {
      console.error("Error cancelling tenant rejection:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || error.message || "Failed to cancel rejection",
        errors: error.response?.data?.errors || { general: "CANCEL_REJECTION_FAILED" },
      };
    }
  }

  // Revoke cancellation for a cancelled invitation
  static async revokeCancellation(invitationId: string): Promise<APIResponse> {
    try {
      const response: AxiosResponse<APIResponse> = await internalApi.post(`/invitations/${invitationId}/revoke-cancellation/`);
      return response.data;
    } catch (error: any) {
      console.error("Error revoking invitation cancellation:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || error.message || "Failed to revoke cancellation",
        errors: error.response?.data?.errors || { general: "REVOKE_CANCELLATION_FAILED" },
      };
    }
  }

  // Resend an expired invitation
  static async resendExpiredInvitation(invitationId: string, expiresAt?: string): Promise<APIResponse> {
    try {
      const requestData = expiresAt ? { expires_at: expiresAt } : {};
      const response: AxiosResponse<APIResponse> = await internalApi.post(`/invitations/${invitationId}/resend-expired/`, requestData);
      return response.data;
    } catch (error: any) {
      console.error("Error resending expired invitation:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || error.message || "Failed to resend expired invitation",
        errors: error.response?.data?.errors || { general: "RESEND_EXPIRED_FAILED" },
      };
    }
  }

  // Expire overdue invitations manually
  static async expireOverdueInvitations(): Promise<APIResponse> {
    try {
      const response: AxiosResponse<APIResponse> = await internalApi.post(`/invitations/expire-overdue/`);
      return response.data;
    } catch (error: any) {
      console.error("Error expiring overdue invitations:", error);
      return {
        success: false,
        data: null,
        message: error.response?.data?.message || error.message || "Failed to expire overdue invitations",
        errors: error.response?.data?.errors || { general: "EXPIRE_OVERDUE_FAILED" },
      };
    }
  }
}

export default InternalAPIService;
export { internalApi };

// Circle Management APIs
export const circleApi = {
  // Get all corporates with circle counts
  getCorporates: () => internalApi.get("/circles/"),

  // Get circles for a specific corporate tenant
  getCorporateCircles: (corporateId: string) => internalApi.get(`/circles/corporate/${corporateId}/`),

  // Send circle invitation
  inviteCircle: (invitationData: { circle_name: string; circle_code: string; primary_contact_name: string; contact_email: string; contact_phone: string }) =>
    internalApi.post("/circles/invite/", invitationData),
};

// Dashboard APIs
export const dashboardApi = {
  // Get platform metrics for dashboard
  getMetrics: () => internalApi.get("/dashboard/"),
};
