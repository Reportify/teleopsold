// Flow Service - Backend API Integration for Flow Template Management
import { FlowTemplate } from "../types/flow";
import { API_ENDPOINTS, apiHelpers } from "./api";

interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// Helper function to create a properly typed error response
const createApiError = <T>(message: string): ApiResponse<T> => ({
  data: [] as T,
  success: false,
  message,
});

export class FlowService {
  static async getFlowTemplates(): Promise<ApiResponse<FlowTemplate[]>> {
    try {
      const response = await apiHelpers.get<FlowTemplate[]>(API_ENDPOINTS.TASKS.FLOWS.LIST);

      // Handle different response formats
      let data: FlowTemplate[];
      if (Array.isArray(response)) {
        data = response;
      } else if (response && typeof response === "object" && "results" in response) {
        data = (response as any).results || [];
      } else {
        data = [];
      }

      return {
        data,
        success: true,
        message: "Flow templates retrieved successfully",
      };
    } catch (error) {
      console.error("Failed to fetch flow templates:", error);
      return createApiError<FlowTemplate[]>("Failed to fetch flow templates");
    }
  }

  static async getFlowTemplate(id: string): Promise<ApiResponse<FlowTemplate | null>> {
    try {
      const response = await apiHelpers.get<FlowTemplate>(API_ENDPOINTS.TASKS.FLOWS.DETAIL(id));
      return {
        data: response,
        success: true,
        message: "Flow template retrieved successfully",
      };
    } catch (error) {
      console.error("Failed to fetch flow template:", error);
      return createApiError<FlowTemplate | null>("Failed to fetch flow template");
    }
  }

  static async createFlowTemplate(flowData: Partial<FlowTemplate>): Promise<ApiResponse<FlowTemplate>> {
    try {
      const response = await apiHelpers.post<FlowTemplate>(API_ENDPOINTS.TASKS.FLOWS.CREATE, flowData);
      return {
        data: response,
        success: true,
        message: "Flow template created successfully",
      };
    } catch (error) {
      console.error("Failed to create flow template:", error);
      return createApiError<FlowTemplate>("Failed to create flow template");
    }
  }

  static async updateFlowTemplate(id: string, flowData: Partial<FlowTemplate>): Promise<ApiResponse<FlowTemplate>> {
    try {
      const response = await apiHelpers.put<FlowTemplate>(API_ENDPOINTS.TASKS.FLOWS.UPDATE(id), flowData);
      return {
        data: response,
        success: true,
        message: "Flow template updated successfully",
      };
    } catch (error) {
      console.error("Failed to update flow template:", error);
      return createApiError<FlowTemplate>("Failed to update flow template");
    }
  }

  static async deleteFlowTemplate(id: string): Promise<ApiResponse<boolean>> {
    try {
      await apiHelpers.delete(API_ENDPOINTS.TASKS.FLOWS.DELETE(id));
      return {
        data: true,
        success: true,
        message: "Flow template deleted successfully",
      };
    } catch (error) {
      console.error("Failed to delete flow template:", error);
      return createApiError<boolean>("Failed to delete flow template");
    }
  }

  static async searchFlowTemplates(query: string, filters?: Record<string, any>): Promise<ApiResponse<FlowTemplate[]>> {
    try {
      const params = new URLSearchParams({ q: query, ...filters });
      const response = await apiHelpers.get<FlowTemplate[]>(`${API_ENDPOINTS.TASKS.FLOWS.SEARCH}?${params}`);

      let data: FlowTemplate[];
      if (Array.isArray(response)) {
        data = response;
      } else if (response && typeof response === "object" && "results" in response) {
        data = (response as any).results || [];
      } else {
        data = [];
      }

      return {
        data,
        success: true,
        message: "Flow templates search completed successfully",
      };
    } catch (error) {
      console.error("Failed to search flow templates:", error);
      return createApiError<FlowTemplate[]>("Failed to search flow templates");
    }
  }

  static async incrementUsage(id: string): Promise<ApiResponse<boolean>> {
    try {
      await apiHelpers.post(API_ENDPOINTS.TASKS.FLOWS.USAGE(id));
      return {
        data: true,
        success: true,
        message: "Usage count incremented successfully",
      };
    } catch (error) {
      console.error("Failed to increment usage count:", error);
      return createApiError<boolean>("Failed to increment usage count");
    }
  }

  static async getStatistics(): Promise<ApiResponse<any>> {
    try {
      const response = await apiHelpers.get(API_ENDPOINTS.TASKS.FLOWS.STATISTICS);
      return {
        data: response,
        success: true,
        message: "Statistics retrieved successfully",
      };
    } catch (error) {
      console.error("Failed to fetch statistics:", error);
      return createApiError<any>("Failed to fetch statistics");
    }
  }

  static async createTasksFromFlow(taskCreationConfig: any): Promise<ApiResponse<any>> {
    try {
      const response = await apiHelpers.post(API_ENDPOINTS.TASKS.CREATE_FROM_FLOW, taskCreationConfig);
      return {
        data: response,
        success: true,
        message: "Tasks created successfully from flow template",
      };
    } catch (error: any) {
      console.error("Failed to create tasks from flow:", error);

      // Extract error message from response
      const errorMessage = error.response?.data?.message || error.message || "Failed to create tasks from flow template";

      return {
        data: null,
        success: false,
        message: errorMessage,
      };
    }
  }
}
