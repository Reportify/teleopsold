import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { AuthService } from "../services/authService";

// Base query with authentication
const baseQuery = fetchBaseQuery({
  baseUrl: process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api/v1",
  prepareHeaders: (headers) => {
    const token = AuthService.getAccessToken();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    // Add tenant context headers
    const tenantContext = AuthService.getTenantContext();
    if (tenantContext?.currentTenant?.id) {
      headers.set("X-Tenant-ID", tenantContext.currentTenant.id);
    }
    if (tenantContext?.primaryCircle?.id) {
      headers.set("X-Circle-ID", tenantContext.primaryCircle.id);
    }

    return headers;
  },
});

// Create the main API
export const api = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: ["Project", "Site", "Task", "Equipment", "EquipmentCategory", "EquipmentModel", "Team", "User", "Tenant", "Dashboard", "Analytics"],
  endpoints: () => ({}),
});

// Export hooks for usage in functional components
export const {
  // Will be populated by injected endpoints
} = api;
