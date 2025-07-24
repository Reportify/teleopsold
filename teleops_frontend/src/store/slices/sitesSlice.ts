import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

// Types
export interface Site {
  id: string;
  site_id: string; // Business identifier
  name: string;
  project_id: string;
  tenant_id: string;

  // Location data
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  pincode: string;

  // Site details
  site_type: "BTS" | "NodeB" | "eNodeB" | "gNodeB" | "MSC" | "BSC" | "Other";
  technology: "2G" | "3G" | "4G" | "5G" | "Multi-Tech";
  status: "Allocated" | "Assigned" | "In_Progress" | "Completed" | "On_Hold";

  // Assignment info
  assigned_team_id?: string;
  assigned_team_name?: string;
  assignment_date?: string;
  expected_completion_date?: string;
  actual_completion_date?: string;

  // Equipment info
  equipment_count?: number;
  estimated_value?: number;
  recovery_percentage?: number;

  created_at: string;
  updated_at: string;
}

interface SitesState {
  sites: Site[];
  selectedSite: Site | null;
  loading: boolean;
  error: string | null;

  // Map view state
  mapCenter: { lat: number; lng: number };
  mapZoom: number;
  showMap: boolean;

  // UI state
  filters: {
    project_id?: string;
    status?: string;
    site_type?: string;
    technology?: string;
    assigned_team_id?: string;
    search?: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

const initialState: SitesState = {
  sites: [],
  selectedSite: null,
  loading: false,
  error: null,

  // Default map center (India)
  mapCenter: { lat: 20.5937, lng: 78.9629 },
  mapZoom: 5,
  showMap: false,

  filters: {},
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
  },
};

// Async thunks
export const fetchSites = createAsyncThunk("sites/fetchSites", async (params?: { project_id?: string; filters?: any }) => {
  // Placeholder
  return [];
});

export const assignSiteToTeam = createAsyncThunk("sites/assignToTeam", async ({ siteId, teamId }: { siteId: string; teamId: string }) => {
  // Placeholder
  return { siteId, teamId };
});

export const updateSiteStatus = createAsyncThunk("sites/updateStatus", async ({ siteId, status }: { siteId: string; status: Site["status"] }) => {
  // Placeholder
  return { siteId, status };
});

// Slice
const sitesSlice = createSlice({
  name: "sites",
  initialState,
  reducers: {
    setSelectedSite: (state, action: PayloadAction<Site | null>) => {
      state.selectedSite = action.payload;

      // Update map center when site is selected
      if (action.payload) {
        state.mapCenter = {
          lat: action.payload.latitude,
          lng: action.payload.longitude,
        };
        state.mapZoom = 15;
      }
    },

    setMapView: (
      state,
      action: PayloadAction<{
        center?: { lat: number; lng: number };
        zoom?: number;
        show?: boolean;
      }>
    ) => {
      if (action.payload.center) state.mapCenter = action.payload.center;
      if (action.payload.zoom) state.mapZoom = action.payload.zoom;
      if (action.payload.show !== undefined) state.showMap = action.payload.show;
    },

    setFilters: (state, action: PayloadAction<Partial<SitesState["filters"]>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    clearFilters: (state) => {
      state.filters = {};
    },

    setPagination: (state, action: PayloadAction<Partial<SitesState["pagination"]>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },

    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch sites
    builder
      .addCase(fetchSites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSites.fulfilled, (state, action) => {
        state.loading = false;
        state.sites = action.payload;
      })
      .addCase(fetchSites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch sites";
      });

    // Assign site to team
    builder.addCase(assignSiteToTeam.fulfilled, (state, action) => {
      const site = state.sites.find((s) => s.id === action.payload.siteId);
      if (site) {
        site.assigned_team_id = action.payload.teamId;
        site.status = "Assigned";
        site.assignment_date = new Date().toISOString();
      }
    });

    // Update site status
    builder.addCase(updateSiteStatus.fulfilled, (state, action) => {
      const site = state.sites.find((s) => s.id === action.payload.siteId);
      if (site) {
        site.status = action.payload.status;
        if (action.payload.status === "Completed") {
          site.actual_completion_date = new Date().toISOString();
        }
      }
    });
  },
});

export const { setSelectedSite, setMapView, setFilters, clearFilters, setPagination, clearError } = sitesSlice.actions;

export default sitesSlice.reducer;
