// Circle Site Management Page for Circle Tenants
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  LinearProgress,
  Alert,
  Tooltip,
  Stack,
  Divider,
  Badge,
  ListItemIcon,
  Tab,
  Tabs,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  Add,
  MoreVert,
  LocationOn,
  Map,
  Business,
  Visibility,
  Edit,
  Delete,
  Upload,
  Download,
  Search,
  FilterList,
  Refresh,
  GpsFixed,
  Warning,
  CheckCircle,
  ErrorOutline,
  Info,
  Phone,
  ContactPhone,
  SafetyDivider,
  Directions,
  Terrain,
  ExpandMore,
  Public,
  Place,
  MyLocation,
  TravelExplore,
} from "@mui/icons-material";

import { useAuth } from "../contexts/AuthContext";
import { useDarkMode } from "../contexts/ThemeContext";
import { StatsCard } from "../components";
import api from "../services/api";

interface CircleSite {
  id: number;
  site_id: string;
  global_id: string;
  site_name: string;
  site_code: string;
  site_type: string;
  status: string;

  // Location Information
  town: string;
  cluster: string;
  state: string;
  country: string;
  district: string;
  postal_code: string;
  latitude: number | null;
  longitude: number | null;
  elevation: number | null;
  full_address: string;

  // Site Details
  access_instructions: string;
  safety_requirements: string;
  contact_person: string;
  contact_phone: string;
  landmark_description: string;

  // Operational Information
  has_coordinates: boolean;
  coordinate_quality: string;
  accessibility_rating: string;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface SiteStatistics {
  total_sites: number;
  active_sites: number;
  inactive_sites: number;
  maintenance_sites: number;
  sites_with_coordinates: number;
  sites_without_coordinates: number;
}

interface CreateSiteForm {
  site_id: string;
  global_id: string;
  site_name: string;
  town: string;
  cluster: string;
  latitude: string;
  longitude: string;
  state: string;
  country: string;
  district: string;
  postal_code: string;
  elevation: string;
  site_type: string;
  status: string;
  access_instructions: string;
  safety_requirements: string;
  contact_person: string;
  contact_phone: string;
  landmark_description: string;
}

const SitesPage: React.FC = () => {
  const { getCurrentTenant } = useAuth();
  const { darkMode } = useDarkMode();
  const [activeTab, setActiveTab] = useState(0);
  const [sites, setSites] = useState<CircleSite[]>([]);
  const [statistics, setStatistics] = useState<SiteStatistics>({
    total_sites: 0,
    active_sites: 0,
    inactive_sites: 0,
    maintenance_sites: 0,
    sites_with_coordinates: 0,
    sites_without_coordinates: 0,
  });
  const [distributions, setDistributions] = useState<{
    site_types: Record<string, number>;
    cities: Record<string, number>;
    states: Record<string, number>;
  }>({
    site_types: {},
    cities: {},
    states: {},
  });
  const [geographicAnalysis, setGeographicAnalysis] = useState<{
    coverage_radius_km: number;
    geographic_center: { latitude: number; longitude: number } | null;
    total_area_covered: number;
  }>({
    coverage_radius_km: 0,
    geographic_center: null,
    total_area_covered: 0,
  });
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<CircleSite | null>(null);
  const [siteMenuAnchor, setSiteMenuAnchor] = useState<null | HTMLElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [siteTypeFilter, setSiteTypeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");

  const currentTenant = getCurrentTenant();

  // Form state for site creation
  const [createForm, setCreateForm] = useState<CreateSiteForm>({
    site_id: "",
    global_id: "",
    site_name: "",
    town: "",
    cluster: "",
    latitude: "",
    longitude: "",
    state: "",
    country: "India",
    district: "",
    postal_code: "",
    elevation: "",
    site_type: "tower",
    status: "active",
    access_instructions: "",
    safety_requirements: "",
    contact_person: "",
    contact_phone: "",
    landmark_description: "",
  });

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadResults, setUploadResults] = useState<any>(null);

  // Load circle sites
  const loadCircleSites = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/v1/sites/");

      if (response.data) {
        setSites(response.data.sites || []);
        setStatistics(response.data.statistics || {});
        setDistributions(response.data.distributions || {});
        setGeographicAnalysis(response.data.geographic_analysis || {});
      }
    } catch (error) {
      console.error("Error loading circle sites:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCircleSites();
  }, []);

  // Handle site creation
  const handleCreateSite = async () => {
    try {
      setLoading(true);

      const payload = {
        ...createForm,
        latitude: createForm.latitude ? parseFloat(createForm.latitude) : null,
        longitude: createForm.longitude ? parseFloat(createForm.longitude) : null,
        elevation: createForm.elevation ? parseFloat(createForm.elevation) : null,
      };

      await api.post("/api/v1/sites/", payload);

      // Reset form and close dialog
      setCreateForm({
        site_id: "",
        global_id: "",
        site_name: "",
        town: "",
        cluster: "",
        latitude: "",
        longitude: "",
        state: "",
        country: "India",
        district: "",
        postal_code: "",
        elevation: "",
        site_type: "tower",
        status: "active",
        access_instructions: "",
        safety_requirements: "",
        contact_person: "",
        contact_phone: "",
        landmark_description: "",
      });
      setCreateDialogOpen(false);

      // Reload sites
      await loadCircleSites();
    } catch (error: any) {
      console.error("Error creating site:", error);
      // Handle error display
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk upload
  const handleBulkUpload = async () => {
    if (!uploadFile) return;

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", uploadFile);

      const response = await api.post("/api/v1/sites/bulk-upload/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setUploadResults(response.data);
      await loadCircleSites(); // Refresh data
    } catch (error: any) {
      console.error("Error uploading file:", error);
      setUploadResults({
        error: error.response?.data?.error || "Upload failed",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle site deletion
  const handleDeleteSite = async (siteId: number) => {
    try {
      await api.delete(`/api/v1/sites/${siteId}/`);
      await loadCircleSites(); // Refresh data
    } catch (error) {
      console.error("Error deleting site:", error);
    }
  };

  // Filter sites based on search and filters
  const filteredSites = sites.filter((site) => {
    const matchesSearch =
      site.site_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.site_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.town.toLowerCase().includes(searchTerm.toLowerCase()) ||
      site.cluster.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || site.status === statusFilter;
    const matchesSiteType = siteTypeFilter === "all" || site.site_type === siteTypeFilter;
    const matchesLocation = locationFilter === "all" || site.state === locationFilter || site.town === locationFilter;

    return matchesSearch && matchesStatus && matchesSiteType && matchesLocation;
  });

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "inactive":
        return "error";
      case "maintenance":
        return "warning";
      default:
        return "default";
    }
  };

  const getCoordinateQualityColor = (quality: string) => {
    switch (quality) {
      case "high_precision":
        return "success";
      case "medium_precision":
        return "warning";
      case "low_precision":
        return "error";
      case "no_coordinates":
        return "error";
      default:
        return "default";
    }
  };

  const getCoordinateQualityText = (quality: string) => {
    switch (quality) {
      case "high_precision":
        return "High Precision";
      case "medium_precision":
        return "Medium Precision";
      case "low_precision":
        return "Low Precision";
      case "no_coordinates":
        return "No Coordinates";
      case "placeholder":
        return "Placeholder";
      default:
        return quality;
    }
  };

  const getAccessibilityColor = (rating: string) => {
    switch (rating) {
      case "excellent":
        return "success";
      case "good":
        return "info";
      case "fair":
        return "warning";
      case "poor":
        return "error";
      default:
        return "default";
    }
  };

  const formatCoordinate = (value: number | null) => {
    return value !== null ? value.toFixed(6) : "N/A";
  };

  const handleSiteMenuClick = (event: React.MouseEvent<HTMLButtonElement>, site: CircleSite) => {
    setSiteMenuAnchor(event.currentTarget);
    setSelectedSite(site);
  };

  const handleSiteMenuClose = () => {
    setSiteMenuAnchor(null);
    setSelectedSite(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
            Circle Site Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Master site data for {currentTenant?.organization_name} - {currentTenant?.circle_name}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" startIcon={<Upload />} onClick={() => setBulkUploadDialogOpen(true)}>
            Bulk Upload
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialogOpen(true)} size="large">
            Add Site
          </Button>
        </Stack>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <StatsCard title="Total Sites" value={statistics.total_sites} subtitle={`${statistics.active_sites} active`} icon={Business} color="primary" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <StatsCard title="Active Sites" value={statistics.active_sites} subtitle="Currently operational" icon={CheckCircle} color="success" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <StatsCard title="GPS Coordinates" value={statistics.sites_with_coordinates} subtitle={`${statistics.sites_without_coordinates} missing`} icon={GpsFixed} color="info" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <StatsCard title="Coverage Radius" value={`${geographicAnalysis.coverage_radius_km}km`} subtitle="Geographic spread" icon={TravelExplore} color="secondary" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <StatsCard title="Coverage Area" value={`${geographicAnalysis.total_area_covered}km²`} subtitle="Approximate area" icon={Map} color="warning" />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Site Directory" />
          <Tab label="Geographic Analysis" />
          <Tab label="Distribution Analytics" />
        </Tabs>
      </Card>

      {activeTab === 0 && (
        <>
          {/* Filters */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={3} alignItems="center">
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Search sites..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: <Search sx={{ mr: 1, color: "text.secondary" }} />,
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
                      <MenuItem value="all">All Status</MenuItem>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                      <MenuItem value="maintenance">Maintenance</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 2 }}>
                  <FormControl fullWidth>
                    <InputLabel>Site Type</InputLabel>
                    <Select value={siteTypeFilter} onChange={(e) => setSiteTypeFilter(e.target.value)} label="Site Type">
                      <MenuItem value="all">All Types</MenuItem>
                      <MenuItem value="tower">Tower</MenuItem>
                      <MenuItem value="data_center">Data Center</MenuItem>
                      <MenuItem value="exchange">Exchange</MenuItem>
                      <MenuItem value="office">Office</MenuItem>
                      <MenuItem value="warehouse">Warehouse</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControl fullWidth>
                    <InputLabel>Location</InputLabel>
                    <Select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} label="Location">
                      <MenuItem value="all">All Locations</MenuItem>
                      {Object.keys(distributions.cities).map((city) => (
                        <MenuItem key={city} value={city}>
                          {city} ({distributions.cities[city]})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 2 }}>
                  <Button fullWidth variant="outlined" startIcon={<Refresh />} onClick={loadCircleSites}>
                    Refresh
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Sites Table */}
          <Card>
            <CardContent>
              {loading && <LinearProgress sx={{ mb: 2 }} />}

              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Site Information</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>GPS Coordinates</TableCell>
                      <TableCell>Type & Status</TableCell>
                      <TableCell>Contact Info</TableCell>
                      <TableCell>Quality Metrics</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredSites.map((site) => (
                      <TableRow key={site.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {site.site_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              ID: {site.site_id}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Global: {site.global_id}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                              <LocationOn sx={{ fontSize: 16, mr: 0.5 }} />
                              {site.town}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Cluster: {site.cluster}
                            </Typography>
                            {site.state && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {site.state}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          {site.has_coordinates ? (
                            <Box>
                              <Typography variant="body2">
                                {formatCoordinate(site.latitude)}, {formatCoordinate(site.longitude)}
                              </Typography>
                              <Chip label={getCoordinateQualityText(site.coordinate_quality)} color={getCoordinateQualityColor(site.coordinate_quality)} size="small" variant="outlined" />
                            </Box>
                          ) : (
                            <Chip label="No GPS Data" color="error" size="small" icon={<Warning />} />
                          )}
                        </TableCell>
                        <TableCell>
                          <Stack spacing={1}>
                            <Chip label={site.site_type.replace("_", " ").toUpperCase()} size="small" variant="outlined" />
                            <Chip label={site.status.toUpperCase()} color={getStatusColor(site.status)} size="small" />
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Box>
                            {site.contact_person && (
                              <Typography variant="body2" sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                                <ContactPhone sx={{ fontSize: 16, mr: 0.5 }} />
                                {site.contact_person}
                              </Typography>
                            )}
                            {site.contact_phone && (
                              <Typography variant="caption" color="text.secondary">
                                {site.contact_phone}
                              </Typography>
                            )}
                            {!site.contact_person && !site.contact_phone && (
                              <Typography variant="caption" color="text.secondary">
                                No contact info
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={site.accessibility_rating.toUpperCase()} color={getAccessibilityColor(site.accessibility_rating)} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton onClick={(e) => handleSiteMenuClick(e, site)} size="small">
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredSites.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            No sites found matching the current filters
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Geographic Analysis
            </Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, display: "flex", alignItems: "center" }}>
                    <MyLocation sx={{ mr: 1 }} />
                    Coverage Metrics
                  </Typography>
                  <Stack spacing={2}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2">Coverage Radius:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {geographicAnalysis.coverage_radius_km} km
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2">Total Area:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {geographicAnalysis.total_area_covered} km²
                      </Typography>
                    </Box>
                    {geographicAnalysis.geographic_center && (
                      <>
                        <Divider />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Geographic Center:
                        </Typography>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography variant="body2">Latitude:</Typography>
                          <Typography variant="body2">{geographicAnalysis.geographic_center.latitude.toFixed(6)}</Typography>
                        </Box>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography variant="body2">Longitude:</Typography>
                          <Typography variant="body2">{geographicAnalysis.geographic_center.longitude.toFixed(6)}</Typography>
                        </Box>
                      </>
                    )}
                  </Stack>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, display: "flex", alignItems: "center" }}>
                    <GpsFixed sx={{ mr: 1 }} />
                    GPS Data Quality
                  </Typography>
                  <Stack spacing={2}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2">Sites with GPS:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {statistics.sites_with_coordinates} / {statistics.total_sites}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2">Coverage %:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {statistics.total_sites > 0 ? Math.round((statistics.sites_with_coordinates / statistics.total_sites) * 100) : 0}%
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2">Missing GPS:</Typography>
                      <Typography variant="body2" color="error" sx={{ fontWeight: 600 }}>
                        {statistics.sites_without_coordinates}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Distribution Analytics
            </Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    Site Types
                  </Typography>
                  <Stack spacing={1}>
                    {Object.entries(distributions.site_types).map(([type, count]) => (
                      <Box key={type} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="body2">{type.replace("_", " ").toUpperCase()}</Typography>
                        <Chip label={count} size="small" />
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    Top Cities
                  </Typography>
                  <Stack spacing={1}>
                    {Object.entries(distributions.cities)
                      .slice(0, 8)
                      .map(([city, count]) => (
                        <Box key={city} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Typography variant="body2">{city}</Typography>
                          <Chip label={count} size="small" />
                        </Box>
                      ))}
                  </Stack>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    States
                  </Typography>
                  <Stack spacing={1}>
                    {Object.entries(distributions.states).map(([state, count]) => (
                      <Box key={state} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="body2">{state}</Typography>
                        <Chip label={count} size="small" />
                      </Box>
                    ))}
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Site Actions Menu */}
      <Menu anchorEl={siteMenuAnchor} open={Boolean(siteMenuAnchor)} onClose={handleSiteMenuClose}>
        <MenuItem
          onClick={() => {
            // Handle view site details
            handleSiteMenuClose();
          }}
        >
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          View Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            // Handle edit site
            handleSiteMenuClose();
          }}
        >
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          Edit Site
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedSite?.has_coordinates) {
              window.open(`https://www.google.com/maps?q=${selectedSite.latitude},${selectedSite.longitude}`, "_blank");
            }
            handleSiteMenuClose();
          }}
          disabled={!selectedSite?.has_coordinates}
        >
          <ListItemIcon>
            <Map fontSize="small" />
          </ListItemIcon>
          View on Map
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            if (selectedSite) {
              handleDeleteSite(selectedSite.id);
            }
            handleSiteMenuClose();
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          Delete Site
        </MenuItem>
      </Menu>

      {/* Create Site Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Add New Site</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Required Information */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Required Information
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Site ID"
                value={createForm.site_id}
                onChange={(e) => setCreateForm({ ...createForm, site_id: e.target.value })}
                fullWidth
                required
                helperText="Unique identifier within your circle"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="Global ID"
                value={createForm.global_id}
                onChange={(e) => setCreateForm({ ...createForm, global_id: e.target.value })}
                fullWidth
                required
                helperText="Globally unique identifier"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Site Name" value={createForm.site_name} onChange={(e) => setCreateForm({ ...createForm, site_name: e.target.value })} fullWidth required />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Town/City" value={createForm.town} onChange={(e) => setCreateForm({ ...createForm, town: e.target.value })} fullWidth required />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Cluster"
                value={createForm.cluster}
                onChange={(e) => setCreateForm({ ...createForm, cluster: e.target.value })}
                fullWidth
                required
                helperText="Operational grouping/region"
              />
            </Grid>

            {/* GPS Coordinates */}
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                GPS Coordinates (Required)
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Latitude"
                type="number"
                value={createForm.latitude}
                onChange={(e) => setCreateForm({ ...createForm, latitude: e.target.value })}
                fullWidth
                required
                helperText="Decimal degrees (-90 to 90)"
                inputProps={{ step: "any", min: -90, max: 90 }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Longitude"
                type="number"
                value={createForm.longitude}
                onChange={(e) => setCreateForm({ ...createForm, longitude: e.target.value })}
                fullWidth
                required
                helperText="Decimal degrees (-180 to 180)"
                inputProps={{ step: "any", min: -180, max: 180 }}
              />
            </Grid>

            {/* Optional Location Details */}
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Additional Location Details
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="State" value={createForm.state} onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })} fullWidth />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="District" value={createForm.district} onChange={(e) => setCreateForm({ ...createForm, district: e.target.value })} fullWidth />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField label="Postal Code" value={createForm.postal_code} onChange={(e) => setCreateForm({ ...createForm, postal_code: e.target.value })} fullWidth />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Site Type</InputLabel>
                <Select value={createForm.site_type} onChange={(e) => setCreateForm({ ...createForm, site_type: e.target.value })} label="Site Type">
                  <MenuItem value="tower">Tower</MenuItem>
                  <MenuItem value="data_center">Data Center</MenuItem>
                  <MenuItem value="exchange">Exchange</MenuItem>
                  <MenuItem value="substation">Substation</MenuItem>
                  <MenuItem value="office">Office</MenuItem>
                  <MenuItem value="warehouse">Warehouse</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Elevation (meters)"
                type="number"
                value={createForm.elevation}
                onChange={(e) => setCreateForm({ ...createForm, elevation: e.target.value })}
                fullWidth
                inputProps={{ step: "any" }}
              />
            </Grid>

            {/* Contact & Access Information */}
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Contact & Access Information
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Contact Person" value={createForm.contact_person} onChange={(e) => setCreateForm({ ...createForm, contact_person: e.target.value })} fullWidth />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Contact Phone" value={createForm.contact_phone} onChange={(e) => setCreateForm({ ...createForm, contact_phone: e.target.value })} fullWidth />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Access Instructions"
                value={createForm.access_instructions}
                onChange={(e) => setCreateForm({ ...createForm, access_instructions: e.target.value })}
                fullWidth
                multiline
                rows={3}
                helperText="Instructions for accessing the site"
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Safety Requirements"
                value={createForm.safety_requirements}
                onChange={(e) => setCreateForm({ ...createForm, safety_requirements: e.target.value })}
                fullWidth
                multiline
                rows={2}
                helperText="Safety requirements and precautions"
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Landmark Description"
                value={createForm.landmark_description}
                onChange={(e) => setCreateForm({ ...createForm, landmark_description: e.target.value })}
                fullWidth
                multiline
                rows={2}
                helperText="Nearby landmarks for navigation"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateSite} variant="contained" disabled={loading}>
            {loading ? "Creating..." : "Create Site"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={bulkUploadDialogOpen} onClose={() => setBulkUploadDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Bulk Site Upload</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Upload Excel (.xlsx, .xls) or CSV files with site data. Required columns: site_id, global_id, site_name, town, cluster, latitude, longitude.
            </Alert>

            <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} style={{ marginBottom: 16 }} />

            {uploadResults && (
              <Box sx={{ mt: 2 }}>
                {uploadResults.error ? (
                  <Alert severity="error">{uploadResults.error}</Alert>
                ) : (
                  <Alert severity="success">
                    {uploadResults.message}
                    <br />
                    Success: {uploadResults.summary?.success_count}, Errors: {uploadResults.summary?.error_count}
                  </Alert>
                )}

                {uploadResults.errors && uploadResults.errors.length > 0 && (
                  <Accordion sx={{ mt: 2 }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography>View Errors ({uploadResults.errors.length})</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={1}>
                        {uploadResults.errors.slice(0, 10).map((error: any, index: number) => (
                          <Typography key={index} variant="body2" color="error">
                            Row {error.row}: {error.error}
                          </Typography>
                        ))}
                        {uploadResults.errors.length > 10 && (
                          <Typography variant="caption" color="text.secondary">
                            ... and {uploadResults.errors.length - 10} more errors
                          </Typography>
                        )}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setBulkUploadDialogOpen(false);
              setUploadFile(null);
              setUploadResults(null);
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleBulkUpload} variant="contained" disabled={!uploadFile || loading}>
            {loading ? "Uploading..." : "Upload"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SitesPage;
