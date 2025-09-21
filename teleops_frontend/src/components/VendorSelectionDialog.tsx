// Task Allocation Dialog Component - Handles both Vendor and Internal Team allocation
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  LinearProgress,
  Checkbox,
  FormControlLabel,
  Divider,
  Alert,
} from "@mui/material";
import { Assignment, Business, CheckCircle, Info, LocationOn, WorkOutline } from "@mui/icons-material";
import type { Task, Vendor } from "../types/task";
import taskAllocationService from "../services/taskAllocationService";

interface VendorSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  vendors: Vendor[];
  allocationType?: "vendor" | "internal_team"; // Make optional
  onAllocationComplete: (task: Task, vendor: Vendor | null, allocation?: any) => void;
}

const VendorSelectionDialog: React.FC<VendorSelectionDialogProps> = ({ open, onClose, task, vendors, allocationType, onAllocationComplete }) => {
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedAllocationType, setSelectedAllocationType] = useState<"vendor" | "internal_team" | null>(allocationType || null);
  const [selectedSubActivities, setSelectedSubActivities] = useState<Set<string>>(new Set());
  const [allocationStep, setAllocationStep] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Initialize selected sub-activities with all selected by default
  React.useEffect(() => {
    if (task?.sub_activities) {
      const allSubActivityIds = new Set(task.sub_activities.map((sa) => sa.id.toString()));
      setSelectedSubActivities(allSubActivityIds);
    }

    // Set allocation type from prop or default to vendor
    if (allocationType) {
      setSelectedAllocationType(allocationType);
    }
  }, [task, allocationType]);

  const handleSubActivityToggle = (subActivityId: string) => {
    setSelectedSubActivities((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subActivityId)) {
        newSet.delete(subActivityId);
      } else {
        newSet.add(subActivityId);
      }
      return newSet;
    });
  };

  const handleVendorSelection = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setAllocationStep(2); // Go to step 3 (Review & Confirm)
  };

  const handleAllocationComplete = async () => {
    if (!task || !selectedAllocationType) return;

    setLoading(true);
    try {
      // Prepare allocation data
      const allocationData: any = {
        task: task.id, // Already a UUID string
        allocation_type: selectedAllocationType,
        sub_activity_ids: Array.from(selectedSubActivities),
        allocation_notes: `Task allocated to ${selectedAllocationType === "vendor" ? "vendor" : "internal team"}`,
        estimated_duration_hours: 8, // Default value, can be made configurable
      };

      // Add vendor or team specific data
      if (selectedAllocationType === "vendor" && selectedVendor) {
        allocationData.vendor_relationship = selectedVendor.id;
      } else if (selectedAllocationType === "internal_team") {
        // For internal team, we need to get the team ID from the selected vendor
        // This is a temporary solution - in a real scenario, you'd have a separate team selection
        allocationData.internal_team = selectedVendor?.id || 1; // Default team ID
      }

      // Create the allocation via API
      const allocation = await taskAllocationService.createTaskAllocation(allocationData);

      // Call the parent callback with the allocation result
      onAllocationComplete(task, selectedVendor, allocation);

      // Reset state
      setSelectedVendor(null);
      setSelectedAllocationType(null);
      setSelectedSubActivities(new Set());
      setAllocationStep(0);
      onClose();
    } catch (error) {
      console.error("Allocation failed:", error);
      // You could add error state handling here
      alert("Failed to allocate task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedVendor(null);
    setSelectedAllocationType(null);
    setSelectedSubActivities(new Set());
    setAllocationStep(0);
    onClose();
  };

  if (!task) return null;

  // Handle case when no vendors are available for the project
  if (vendors.length === 0 && allocationType === "vendor") {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Assignment />
            No Project Vendors Available
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              This project has no vendors linked yet.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please add vendors to the project before allocating tasks.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Assignment />
          Allocate Task: {task.task_name} (ID: {task.task_id})
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stepper activeStep={allocationStep} sx={{ mb: 3 }}>
          <Step>
            <StepLabel>Task Details</StepLabel>
          </Step>
          {!allocationType && (
            <Step>
              <StepLabel>Allocation Type</StepLabel>
            </Step>
          )}
          <Step>
            <StepLabel>Select {selectedAllocationType === "vendor" ? "Vendor" : "Internal Team"}</StepLabel>
          </Step>
          <Step>
            <StepLabel>Review & Confirm</StepLabel>
          </Step>
        </Stepper>

        {/* Step Content */}
        {allocationStep === 0 && (
          /* Step 1: Task Details & Sub-activity Selection */
          <Box>
            <Typography variant="h6" gutterBottom>
              Task Details & Sub-activity Selection
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Review task details and select which sub-activities to allocate
            </Typography>

            {/* Task Overview */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Task Overview
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Task Name:</strong> {task.task_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Task ID:</strong> {task.task_id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Project:</strong> {task.project_name}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Sites:</strong> {task.sites_count} site{task.sites_count !== 1 ? "s" : ""}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Status:</strong> {task.status}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Type:</strong> {task.task_type}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Site Details */}
            {task.sites && task.sites.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Site Details
                  </Typography>
                  <Grid container spacing={2}>
                    {task.sites.map((site) => (
                      <Grid size={{ xs: 12, md: 6 }} key={site.id}>
                        <Card variant="outlined">
                          <CardContent sx={{ py: 2, px: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              {site.site_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              <strong>Site ID:</strong> {site.site_id}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              <strong>Role:</strong> {site.site_role}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              <strong>Sequence:</strong> {site.sequence_order}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* Sub-activities Selection */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Sub-activities Selection
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Select which sub-activities to allocate (all selected by default)
                </Typography>

                {task.sub_activities && task.sub_activities.length > 0 ? (
                  <Grid container spacing={2}>
                    {task.sub_activities.map((subActivity) => (
                      <Grid size={{ xs: 12, md: 6 }} key={subActivity.id}>
                        <Card variant="outlined">
                          <CardContent sx={{ py: 2, px: 2 }}>
                            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                              <Checkbox checked={selectedSubActivities.has(subActivity.id.toString())} onChange={() => handleSubActivityToggle(subActivity.id.toString())} size="small" />
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                  {subActivity.sub_activity_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Type: {subActivity.activity_type}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Sequence: {subActivity.sequence_order}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Status: {subActivity.status}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Site: {subActivity.site_name || "Unknown Site"}
                                </Typography>
                                {subActivity.site_global_id && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    Site ID: {subActivity.site_global_id}
                                  </Typography>
                                )}
                                {subActivity.work_instructions && (
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    Instructions: {subActivity.work_instructions}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No sub-activities found for this task.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        )}

        {!allocationType && allocationStep === 1 && (
          /* Step 2: Select Allocation Type (only shown when allocationType is not provided) */
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Allocation Type
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose how you want to allocate this task
            </Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card
                  sx={{
                    cursor: "pointer",
                    border: selectedAllocationType === "vendor" ? 2 : 1,
                    borderColor: selectedAllocationType === "vendor" ? "primary.main" : "divider",
                  }}
                  onClick={() => setSelectedAllocationType("vendor")}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <Business sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Vendor Allocation
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Allocate task to an external vendor
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card
                  sx={{
                    cursor: "pointer",
                    border: selectedAllocationType === "internal_team" ? 2 : 1,
                    borderColor: selectedAllocationType === "internal_team" ? "primary.main" : "divider",
                  }}
                  onClick={() => setSelectedAllocationType("internal_team")}
                >
                  <CardContent sx={{ textAlign: "center", py: 3 }}>
                    <WorkOutline sx={{ fontSize: 48, color: "primary.main", mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Internal Team
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Assign task to internal team members
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {allocationStep === (allocationType ? 1 : 2) && (
          /* Step 2/3: Select Vendor or Internal Team */
          <Box>
            <Typography variant="h6" gutterBottom>
              Select {selectedAllocationType === "vendor" ? "Vendor" : "Internal Team"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {selectedAllocationType === "vendor" ? "Choose a vendor from the available options" : "Select internal team members for this task"}
            </Typography>

            {selectedAllocationType === "vendor" && vendors.length > 0 && (
              <Grid container spacing={2}>
                {vendors.map((vendor) => (
                  <Grid size={{ xs: 12, md: 6 }} key={vendor.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        cursor: "pointer",
                        border: selectedVendor?.id === vendor.id ? 2 : 1,
                        borderColor: selectedVendor?.id === vendor.id ? "primary.main" : "divider",
                      }}
                      onClick={() => handleVendorSelection(vendor)}
                    >
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {vendor.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>Vendor Code:</strong> {vendor.vendor_code}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>Contact Person:</strong> {vendor.contact_person.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          <strong>Email:</strong> {vendor.contact_person.email}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Phone:</strong> {vendor.contact_person.phone}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}

            {selectedAllocationType === "internal_team" && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Internal team assignment functionality will be implemented in a future update.
              </Alert>
            )}
          </Box>
        )}

        {allocationStep === (allocationType ? 2 : 3) && (
          /* Step 3/4: Review & Confirm */
          <Box>
            <Typography variant="h6" gutterBottom>
              Review & Confirm
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Review the allocation details before confirming
            </Typography>

            {/* Allocation Summary */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Allocation Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Task Name:</strong> {task.task_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Task ID:</strong> {task.task_id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Sites:</strong> {task.sites_count} site{task.sites_count !== 1 ? "s" : ""}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Allocation Type:</strong> {selectedAllocationType === "vendor" ? "Vendor" : "Internal Team"}
                    </Typography>
                    {selectedAllocationType === "vendor" && selectedVendor && (
                      <>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Vendor:</strong> {selectedVendor.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Vendor Code:</strong> {selectedVendor.vendor_code}
                        </Typography>
                      </>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Selected Sub-activities */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Selected Sub-activities
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {task.sub_activities &&
                    task.sub_activities
                      .filter((sa) => selectedSubActivities.has(sa.id.toString()))
                      .map((sa) => <Chip key={sa.id} label={`${sa.sub_activity_name} (${sa.site_name || "Unknown Site"})`} size="small" sx={{ mr: 1, mb: 1 }} />)}
                </Box>
              </CardContent>
            </Card>

            {/* Multi-site coordination alert */}
            {task.sites && task.sites.length > 1 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Multi-site coordination required:</strong> This task involves {task.sites.length} sites. Ensure proper coordination between sites during execution.
                </Typography>
              </Alert>
            )}
          </Box>
        )}

        {/* Navigation Buttons */}
        {allocationStep === 0 && (
          <Box sx={{ mt: 3 }}>
            <Button variant="contained" onClick={() => setAllocationStep(1)} disabled={task.sub_activities && task.sub_activities.length > 0 ? selectedSubActivities.size === 0 : false}>
              Continue to {allocationType ? (allocationType === "vendor" ? "Vendor Selection" : "Team Selection") : "Allocation Type"}
            </Button>
          </Box>
        )}

        {!allocationType && allocationStep === 1 && (
          <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
            <Button variant="outlined" onClick={() => setAllocationStep(0)}>
              Back to Task Details
            </Button>
            <Button variant="contained" onClick={() => setAllocationStep(2)} disabled={!selectedAllocationType}>
              Continue to {selectedAllocationType === "vendor" ? "Vendor Selection" : "Team Selection"}
            </Button>
          </Box>
        )}

        {allocationStep === (allocationType ? 1 : 2) && (
          <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
            <Button variant="outlined" onClick={() => setAllocationStep(allocationType ? 0 : 1)}>
              Back to {allocationType ? "Task Details" : "Allocation Type"}
            </Button>
            <Button variant="contained" onClick={() => setAllocationStep(allocationType ? 2 : 3)} disabled={selectedAllocationType === "vendor" ? !selectedVendor : false}>
              Continue to Review & Confirm
            </Button>
          </Box>
        )}

        {allocationStep === (allocationType ? 2 : 3) && (
          <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
            <Button variant="outlined" onClick={() => setAllocationStep(allocationType ? 1 : 2)}>
              Back to {selectedAllocationType === "vendor" ? "Vendor Selection" : "Team Selection"}
            </Button>
            <Button variant="contained" onClick={handleAllocationComplete} disabled={loading} startIcon={loading ? <LinearProgress /> : undefined}>
              {loading ? "Processing..." : "Complete Allocation"}
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default VendorSelectionDialog;
