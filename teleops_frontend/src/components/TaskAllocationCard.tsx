// Task Allocation Card Component
import React from "react";
import { Card, CardContent, Box, Typography, Grid, Chip, Button, Alert } from "@mui/material";
import { Assignment, Business, LocationOn, Schedule, Info, WorkOutline, Map } from "@mui/icons-material";
import type { Task } from "../types/task";

interface TaskAllocationCardProps {
  task: Task;
  onAllocate: (task: Task) => void;
}

const TaskAllocationCard: React.FC<TaskAllocationCardProps> = ({ task, onAllocate }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "CREATED":
        return "default";
      case "IN_PROGRESS":
        return "primary";
      case "COMPLETED":
        return "success";
      case "CANCELLED":
        return "error";
      default:
        return "default";
    }
  };

  const getTaskTypeIcon = (taskType: string) => {
    switch (taskType) {
      case "2G_DISMANTLE":
        return <WorkOutline />;
      case "MW_DISMANTLE":
        return <Map />;
      default:
        return <WorkOutline />;
    }
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {getTaskTypeIcon(task.task_type)}
            <Typography variant="h6" component="h3">
              {task.task_name}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Chip label={task.status} color={getStatusColor(task.status)} size="small" />
            <Chip label={task.task_type.replace("_", " ")} variant="outlined" size="small" />
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary">
              <Business sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }} />
              {task.client_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <WorkOutline sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }} />
              {task.project_name}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary">
              <LocationOn sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }} />
              {task.sites_count} site{task.sites_count !== 1 ? "s" : ""}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <Schedule sx={{ fontSize: 16, verticalAlign: "middle", mr: 0.5 }} />
              {task.estimated_duration_hours}h estimated
            </Typography>
          </Grid>
        </Grid>

        {task.requires_coordination && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Info sx={{ mr: 1 }} />
            Multi-site coordination required
          </Alert>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="caption" color="text.secondary">
            Created by {task.created_by} on {new Date(task.created_at).toLocaleDateString()}
          </Typography>
          <Button variant="contained" startIcon={<Assignment />} onClick={() => onAllocate(task)} disabled={task.status !== "CREATED"}>
            Allocate Task
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TaskAllocationCard;
