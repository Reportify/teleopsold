// Internal Team Assignment Dialog Component
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
  Avatar,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from "@mui/material";
import { Group, Person, Assignment, CheckCircle, Schedule } from "@mui/icons-material";

interface TeamMember {
  id: number;
  name: string;
  role: string;
  avatar: string;
  availability: "available" | "busy" | "offline";
  current_workload: number;
  specializations: string[];
}

interface InternalTeamAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  onAssignmentComplete: (memberId: number, estimatedStartDate: string, notes: string) => void;
  taskName?: string;
}

const InternalTeamAssignmentDialog: React.FC<InternalTeamAssignmentDialogProps> = ({ open, onClose, onAssignmentComplete, taskName }) => {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [estimatedStartDate, setEstimatedStartDate] = useState("");
  const [notes, setNotes] = useState("");

  // Mock team members data
  const teamMembers: TeamMember[] = [
    {
      id: 1,
      name: "John Smith",
      role: "Senior Technician",
      avatar: "JS",
      availability: "available",
      current_workload: 2,
      specializations: ["2G Dismantling", "MW Installation", "RF Survey"],
    },
    {
      id: 2,
      name: "Sarah Johnson",
      role: "Field Engineer",
      avatar: "SJ",
      availability: "available",
      current_workload: 1,
      specializations: ["Equipment Testing", "Commissioning", "Site Survey"],
    },
    {
      id: 3,
      name: "Mike Chen",
      role: "Technical Specialist",
      avatar: "MC",
      availability: "busy",
      current_workload: 4,
      specializations: ["MW Dismantling", "Fiber Optics", "Network Testing"],
    },
    {
      id: 4,
      name: "Emily Davis",
      role: "Project Coordinator",
      avatar: "ED",
      availability: "available",
      current_workload: 0,
      specializations: ["Project Management", "Coordination", "Documentation"],
    },
  ];

  const handleAssignmentComplete = () => {
    if (selectedMember) {
      onAssignmentComplete(selectedMember.id, estimatedStartDate, notes);
      // Reset form
      setSelectedMember(null);
      setEstimatedStartDate("");
      setNotes("");
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case "available":
        return "success";
      case "busy":
        return "warning";
      case "offline":
        return "error";
      default:
        return "default";
    }
  };

  const getAvailabilityText = (availability: string) => {
    switch (availability) {
      case "available":
        return "Available";
      case "busy":
        return "Busy";
      case "offline":
        return "Offline";
      default:
        return "Unknown";
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Group />
          Assign to Internal Team Member
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {taskName ? `Task: ${taskName}` : "Select Team Member"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Choose an internal team member to assign this task to
          </Typography>
        </Box>

        {/* Team Members Grid */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {teamMembers.map((member) => (
            <Grid size={{ xs: 12, md: 6 }} key={member.id}>
              <Card
                sx={{
                  cursor: "pointer",
                  border: selectedMember?.id === member.id ? 2 : 1,
                  borderColor: selectedMember?.id === member.id ? "primary.main" : "divider",
                  "&:hover": { borderColor: "primary.main" },
                  transition: "border-color 0.2s ease",
                  opacity: member.availability === "offline" ? 0.6 : 1,
                }}
                onClick={() => member.availability !== "offline" && setSelectedMember(member)}
              >
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: "primary.main",
                        fontSize: "18px",
                      }}
                    >
                      {member.avatar}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6">{member.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {member.role}
                      </Typography>
                    </Box>
                    <Chip label={getAvailabilityText(member.availability)} color={getAvailabilityColor(member.availability)} size="small" />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      <strong>Current Workload:</strong> {member.current_workload} active tasks
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Specializations:</strong>
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {member.specializations.map((spec, index) => (
                        <Chip key={index} label={spec} size="small" variant="outlined" sx={{ fontSize: "0.7rem" }} />
                      ))}
                    </Box>
                  </Box>

                  {selectedMember?.id === member.id && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "primary.main" }}>
                      <CheckCircle />
                      <Typography variant="body2">Selected</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Assignment Details Form */}
        {selectedMember && (
          <Box sx={{ mt: 3, p: 3, bgcolor: "grey.50", borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Assignment Details for {selectedMember.name}
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth label="Estimated Start Date" type="date" value={estimatedStartDate} onChange={(e) => setEstimatedStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select value="medium" label="Priority" size="small">
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Assignment Notes"
                  multiline
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any specific instructions or requirements for this assignment..."
                />
              </Grid>
            </Grid>
          </Box>
        )}

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>Note:</strong> Internal team assignments provide direct control and oversight. The assigned member will receive immediate notification and can start working on the task.
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={handleAssignmentComplete} disabled={!selectedMember} startIcon={<Assignment />}>
          Complete Assignment
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InternalTeamAssignmentDialog;
