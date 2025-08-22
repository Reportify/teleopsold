// Flow Library Page - Browse and manage flow templates
import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stack,
  Divider,
  Avatar,
  Tooltip,
} from "@mui/material";
import { Add, Edit, Delete, ContentCopy, Visibility, Star, StarBorder, TrendingUp, Schedule, Category, FilterList } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { FlowTemplate, FlowCategory } from "../types/flow";
import { FlowService } from "../services/flowService";

// Using centralized flow service

const FlowLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<FlowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Load flows from service
  useEffect(() => {
    const loadFlows = async () => {
      try {
        setLoading(true);
        const response = await FlowService.getFlowTemplates();
        if (response.success) {
          setFlows(response.data);
        } else {
          setError("Failed to load flow templates");
        }
      } catch (err) {
        setError("Error loading flow templates");
        console.error("Error loading flows:", err);
      } finally {
        setLoading(false);
      }
    };

    loadFlows();
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showInactiveFlows, setShowInactiveFlows] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<FlowTemplate | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Filter and search flows
  const filteredFlows = useMemo(() => {
    return flows.filter((flow) => {
      const matchesSearch =
        flow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flow.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flow.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = categoryFilter === "all" || flow.category === categoryFilter;
      const matchesActive = showInactiveFlows || flow.is_active;

      return matchesSearch && matchesCategory && matchesActive;
    });
  }, [flows, searchTerm, categoryFilter, showInactiveFlows]);

  const handleCreateFlow = () => {
    navigate("/flows/new");
  };

  const handleEditFlow = (flowId: string) => {
    navigate(`/flows/${flowId}/edit`);
  };

  const handleDuplicateFlow = (flow: FlowTemplate) => {
    console.log("Duplicating flow:", flow.id);
    // Navigate to create page with pre-filled data
    navigate("/flows/new", { state: { duplicateFrom: flow } });
  };

  const handlePreviewFlow = (flow: FlowTemplate) => {
    setSelectedFlow(flow);
    setPreviewDialogOpen(true);
  };

  const handleDeleteFlow = (flow: FlowTemplate) => {
    setSelectedFlow(flow);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteFlow = () => {
    if (selectedFlow) {
      console.log("Deleting flow:", selectedFlow.id);
      // Here you would call the API to delete the flow
    }
    setDeleteDialogOpen(false);
    setSelectedFlow(null);
  };

  const getCategoryColor = (category: FlowCategory) => {
    const colors = {
      DISMANTLING: "error",
      INSTALLATION: "success",
      MAINTENANCE: "warning",
      SURVEY: "info",
      LOGISTICS: "primary",
      COMMISSIONING: "secondary",
      CUSTOM: "default",
    };
    return colors[category] as any;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <Typography>Loading flow templates...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" variant="h6">
          Error: {error}
        </Typography>
        <Button onClick={() => window.location.reload()} sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Flow Library
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage reusable workflow templates for task creation
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreateFlow}>
          Create Flow
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h4" color="primary">
                {flows.filter((f) => f.is_active).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Flows
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h4" color="success.main">
                {flows.reduce((sum, f) => sum + f.usage_count, 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Usage
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Avg Duration
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h4" color="info.main">
                {new Set(flows.flatMap((f) => f.category)).size}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Categories
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label="Search flows..." variant="outlined" size="small" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField fullWidth select label="Category" size="small" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <MenuItem value="all">All Categories</MenuItem>
                <MenuItem value="DISMANTLING">Dismantling</MenuItem>
                <MenuItem value="INSTALLATION">Installation</MenuItem>
                <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
                <MenuItem value="SURVEY">Survey</MenuItem>
                <MenuItem value="LOGISTICS">Logistics</MenuItem>
                <MenuItem value="COMMISSIONING">Commissioning</MenuItem>
                <MenuItem value="CUSTOM">Custom</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Button variant={showInactiveFlows ? "contained" : "outlined"} startIcon={<FilterList />} onClick={() => setShowInactiveFlows(!showInactiveFlows)}>
                {showInactiveFlows ? "Hide" : "Show"} Inactive
              </Button>
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {filteredFlows.length} flow(s)
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Flow Templates Grid */}
      <Grid container spacing={3}>
        {filteredFlows.map((flow) => (
          <Grid key={flow.id} size={{ xs: 12, md: 6, lg: 4 }}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                opacity: flow.is_active ? 1 : 0.7,
                border: flow.is_default ? 2 : 1,
                borderColor: flow.is_default ? "primary.main" : "divider",
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="h6" component="h2" sx={{ flexGrow: 1 }}>
                    {flow.name}
                  </Typography>
                  {!flow.is_active && <Chip label="Inactive" size="small" color="default" />}
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                  {flow.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Chip label={flow.category.replace("_", " ")} size="small" color={getCategoryColor(flow.category)} sx={{ mr: 1, mb: 1 }} />
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <TrendingUp fontSize="small" color="action" />
                    <Typography variant="caption">{flow.usage_count} uses</Typography>
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    Activities ({flow.activities.length}):
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {flow.activities.slice(0, 3).map((activity) => (
                      <Chip key={activity.id} label={activity.activity_name} size="small" variant="outlined" />
                    ))}
                    {flow.activities.length > 3 && <Chip label={`+${flow.activities.length - 3} more`} size="small" variant="outlined" />}
                  </Box>
                </Box>

                <Divider sx={{ my: 1 }} />

                <Typography variant="caption" color="text.secondary">
                  Created by {flow.created_by} • {formatDate(flow.created_at)}
                </Typography>
              </CardContent>

              <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
                <Box>
                  <Tooltip title="Preview">
                    <IconButton size="small" onClick={() => handlePreviewFlow(flow)}>
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Duplicate">
                    <IconButton size="small" onClick={() => handleDuplicateFlow(flow)}>
                      <ContentCopy />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Box>
                  <Button size="small" onClick={() => handleEditFlow(flow.id)}>
                    Edit
                  </Button>
                  <IconButton size="small" onClick={() => handleDeleteFlow(flow)} color="error">
                    <Delete />
                  </IconButton>
                </Box>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredFlows.length === 0 && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No flows found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Try adjusting your search criteria or create a new flow template
          </Typography>
          <Button variant="contained" startIcon={<Add />} onClick={handleCreateFlow}>
            Create Your First Flow
          </Button>
        </Box>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onClose={() => setPreviewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Flow Preview: {selectedFlow?.name}</DialogTitle>
        <DialogContent>
          {selectedFlow && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedFlow.description}
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2">
                    <strong>Category:</strong> {selectedFlow.category.replace("_", " ")}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2">
                    <strong>Usage Count:</strong> {selectedFlow.usage_count}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="body2">
                    <strong>Created:</strong> {formatDate(selectedFlow.created_at)}
                  </Typography>
                </Grid>
              </Grid>
              <Typography variant="h6" gutterBottom>
                Activities
              </Typography>
              <Box>
                {selectedFlow.activities.map((activity) => (
                  <Chip key={activity.id} label={activity.activity_name} variant="outlined" sx={{ mr: 1, mb: 1 }} />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
          {selectedFlow && (
            <Button variant="contained" onClick={() => handleEditFlow(selectedFlow.id)}>
              Edit Flow
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Flow Template</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone. The flow template will be permanently deleted.
          </Alert>
          <Typography>Are you sure you want to delete the flow template "{selectedFlow?.name}"?</Typography>
          {selectedFlow && selectedFlow.usage_count > 0 && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              This flow has been used {selectedFlow.usage_count} times. Deleting it may affect existing tasks.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmDeleteFlow}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FlowLibraryPage;
