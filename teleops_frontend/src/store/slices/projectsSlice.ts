import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

// Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  client: string;
  tenant_id: string;
  circle_id?: string;
  project_type: "Dismantle" | "Installation" | "Maintenance";
  status: "Planning" | "Design" | "Inventory" | "Active" | "Completed" | "Cancelled";
  start_date: string;
  end_date?: string;
  created_at: string;
  updated_at: string;

  // Calculated fields
  total_sites?: number;
  completed_sites?: number;
  progress_percentage?: number;
  estimated_value?: number;
}

interface ProjectsState {
  projects: Project[];
  selectedProject: Project | null;
  loading: boolean;
  error: string | null;

  // UI state
  filters: {
    status?: string;
    project_type?: string;
    search?: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

const initialState: ProjectsState = {
  projects: [],
  selectedProject: null,
  loading: false,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
  },
};

// Async thunks (these will be replaced by RTK Query eventually)
export const fetchProjects = createAsyncThunk("projects/fetchProjects", async (params?: { page?: number; limit?: number; filters?: any }) => {
  // This is a placeholder - will be replaced by RTK Query
  return [];
});

export const createProject = createAsyncThunk("projects/createProject", async (projectData: Partial<Project>) => {
  // Placeholder
  return projectData as Project;
});

export const updateProject = createAsyncThunk("projects/updateProject", async ({ id, updates }: { id: string; updates: Partial<Project> }) => {
  // Placeholder
  return { id, updates } as { id: string; updates: Partial<Project> };
});

export const deleteProject = createAsyncThunk("projects/deleteProject", async (id: string) => {
  // Placeholder
  return id;
});

// Slice
const projectsSlice = createSlice({
  name: "projects",
  initialState,
  reducers: {
    setSelectedProject: (state, action: PayloadAction<Project | null>) => {
      state.selectedProject = action.payload;
    },

    setFilters: (state, action: PayloadAction<Partial<ProjectsState["filters"]>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    clearFilters: (state) => {
      state.filters = {};
    },

    setPagination: (state, action: PayloadAction<Partial<ProjectsState["pagination"]>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },

    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch projects
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.projects = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch projects";
      });

    // Create project
    builder
      .addCase(createProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.loading = false;
        state.projects.unshift(action.payload);
      })
      .addCase(createProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to create project";
      });

    // Update project
    builder.addCase(updateProject.fulfilled, (state, action) => {
      const index = state.projects.findIndex((p) => p.id === action.payload.id);
      if (index !== -1) {
        state.projects[index] = { ...state.projects[index], ...action.payload.updates };
      }
      if (state.selectedProject?.id === action.payload.id) {
        state.selectedProject = { ...state.selectedProject, ...action.payload.updates };
      }
    });

    // Delete project
    builder.addCase(deleteProject.fulfilled, (state, action) => {
      state.projects = state.projects.filter((p) => p.id !== action.payload);
      if (state.selectedProject?.id === action.payload) {
        state.selectedProject = null;
      }
    });
  },
});

export const { setSelectedProject, setFilters, clearFilters, setPagination, clearError } = projectsSlice.actions;

export default projectsSlice.reducer;
