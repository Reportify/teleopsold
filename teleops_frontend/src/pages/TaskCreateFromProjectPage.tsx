// Task Creation from Project Page - Create task from existing project
import React, { useEffect, useState } from "react";
import { Box, Typography, Button, Card, CardContent, IconButton, Alert, Chip } from "@mui/material";
import { ArrowBack, Assignment, LocationOn, CheckCircle } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";

const TaskCreateFromProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [projectData, setProjectData] = useState<any>(null);

  // Mock project data
  useEffect(() => {
    // Simulate loading project data
    const mockProjectData = {
      id: parseInt(projectId || "0"),
      name: "2G Decommissioning Phase 1",
      client: "Telecom Client A",
      type: "2G_DISMANTLE",
      description: "Decommissioning of 2G network infrastructure across multiple sites",
      sites: [
        { id: 501, name: "Site ABC", address: "123 Main St, New York, NY", role: "Primary" },
        { id: 502, name: "Site DEF", address: "456 Oak Ave, New York, NY", role: "Secondary" },
      ],
      equipment: ["BTS Equipment", "Antennas", "Power Systems", "Transmission Equipment"],
      status: "READY_FOR_TASKS",
    };
    setProjectData(mockProjectData);
  }, [projectId]);

  const handleCreateTask = () => {
    // Navigate to task creation with pre-filled project data
    navigate("/tasks/create", {
      state: {
        prefilledProject: projectData,
      },
    });
  };

  if (!projectData) {
    return (
      <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
        <Typography>Loading project details...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <IconButton onClick={() => navigate(`/projects/${projectId}`)}>
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography variant="h4" component="h1">
            Create Task from Project
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {projectData.name} • {projectData.client}
          </Typography>
        </Box>
      </Box>

      {/* Project Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Project Overview
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Project:</strong> {projectData.name}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Client:</strong> {projectData.client}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Type:</strong> {projectData.type.replace("_", " ")}
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              <strong>Description:</strong> {projectData.description}
            </Typography>
            <Chip label={projectData.status.replace("_", " ")} color="success" icon={<CheckCircle />} sx={{ mb: 2 }} />
          </Box>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Available Sites ({projectData.sites.length})
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
            {projectData.sites.map((site: any) => (
              <Card key={site.id} variant="outlined" sx={{ p: 1, minWidth: 200 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <LocationOn fontSize="small" color="primary" />
                  <Typography variant="body2" fontWeight="medium">
                    {site.name}
                  </Typography>
                  <Chip label={site.role} size="small" />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {site.address}
                </Typography>
              </Card>
            ))}
          </Box>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Equipment Inventory
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {projectData.equipment.map((item: string, index: number) => (
              <Chip key={index} label={item} variant="outlined" size="small" />
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Task Creation Options */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Task Creation Options
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose how you want to create your task from this project:
          </Typography>

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Button variant="contained" size="large" startIcon={<Assignment />} onClick={handleCreateTask} sx={{ minWidth: 200 }}>
              Create Custom Task
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => {
                // Navigate with template pre-selection
                navigate("/tasks/create", {
                  state: {
                    prefilledProject: projectData,
                    useTemplate: true,
                  },
                });
              }}
              sx={{ minWidth: 200 }}
            >
              Use Template
            </Button>
          </Box>

          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>Custom Task:</strong> Build your workflow from scratch using drag & drop
              <br />
              <strong>Template:</strong> Start with a pre-configured workflow based on project type
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Button variant="text" onClick={() => navigate(`/projects/${projectId}`)}>
          ← Back to Project
        </Button>
        <Typography variant="caption" color="text.secondary">
          Project ready for task creation
        </Typography>
      </Box>
    </Box>
  );
};

export default TaskCreateFromProjectPage;
