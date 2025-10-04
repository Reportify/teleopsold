import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  Autocomplete,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  Chip,
  Grid,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  FormHelperText,
} from "@mui/material";
import { 
  Edit, 
  Person, 
  Group, 
  Close, 
  Engineering, 
  Business, 
  Settings,
  AutoAwesome 
} from "@mui/icons-material";
import { Team, TeamMember, TeamMembership, EnhancedUserProfile, TeamMemberAddData } from "../types/user";
import { getUserFullName } from "../services/userAPI";
import { parseVLTTeamName, generateUniqueVLTTeamName } from "../utils/teamNaming";

interface EditTeamDialogProps {
  open: boolean;
  onClose: () => void;
  team: Team | null;
  onUpdateTeam: (teamData: { 
    name: string; 
    description: string; 
    team_leader_id?: string; 
    team_member_ids?: string[];
  }) => Promise<void>;
  existingTeamNames: string[];
  availableUsers: EnhancedUserProfile[];
  teamMembers: (TeamMember | TeamMembership)[];
  onAddMember?: (memberData: TeamMemberAddData) => Promise<void>;
  onRemoveMember?: (userId: string) => Promise<void>;
}

const EditTeamDialog: React.FC<EditTeamDialogProps> = ({
  open,
  onClose,
  team,
  onUpdateTeam,
  existingTeamNames,
  availableUsers,
  teamMembers,
  onAddMember,
  onRemoveMember,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [selectedTeamLeader, setSelectedTeamLeader] = useState<EnhancedUserProfile | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<EnhancedUserProfile[]>([]);
  const [memberType, setMemberType] = useState<"field" | "non_field">("field");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Reset form when dialog opens/closes or team changes
  useEffect(() => {
    if (open && team) {
      setFormData({
        name: team.name,
        description: team.description || "",
      });
      
      // Find team leader from team members
      const teamLeader = teamMembers.find(member => member.role === "leader");
      
      if (teamLeader) {
        // For TeamMember type, match by email since it doesn't have user ID
        // For TeamMembership type, match by user ID
        let leaderUser: EnhancedUserProfile | undefined;
        
        if ('user' in teamLeader) {
          // TeamMembership type - has user property (string ID)
          leaderUser = availableUsers.find(user => 
            (user.user?.id || user.id).toString() === teamLeader.user
          );
        } else {
          // TeamMember type - match by email
          leaderUser = availableUsers.find(user => 
            user.user?.email === teamLeader.user_email
          );
        }
        
        setSelectedTeamLeader(leaderUser || null);
      } else {
        setSelectedTeamLeader(null);
      }
      
      // Set team members (excluding leader)
      const allMemberUsers = teamMembers
        .filter(member => member.role !== "leader") // Exclude team leader
        .map(member => {
          if ('user' in member) {
            // TeamMembership type - match by user ID
            return availableUsers.find(user => 
              (user.user?.id || user.id).toString() === member.user
            );
          } else {
            // TeamMember type - match by email
            return availableUsers.find(user => 
              user.user?.email === member.user_email
            );
          }
        })
        .filter(Boolean) as EnhancedUserProfile[];
      
      setSelectedMembers(allMemberUsers);
      setErrors({});
      setSubmitError("");
    } else if (!open) {
      setFormData({ name: "", description: "" });
      setSelectedTeamLeader(null);
      setSelectedMembers([]);
      setErrors({});
      setSubmitError("");
    }
  }, [open, team, teamMembers, availableUsers]);

  // Remove team leader from team members when leader selection changes
  useEffect(() => {
    if (selectedTeamLeader) {
      setSelectedMembers(prevMembers => 
        prevMembers.filter(member => {
          const memberUserId = (member.user?.id || member.id).toString();
          const leaderUserId = (selectedTeamLeader.user?.id || selectedTeamLeader.id).toString();
          return memberUserId !== leaderUserId;
        })
      );
    }
  }, [selectedTeamLeader]);

  // Update team name when team leader changes (preserve original date/time)
  useEffect(() => {
    if (selectedTeamLeader && team && formData.name) {
      // Parse the current team name to extract date/time
      const parsed = parseVLTTeamName(formData.name);
      
      if (parsed.dateTimeStr) {
        // Create a new team name with the new leader but preserve the original date/time
        const newLeaderIdentifier = selectedTeamLeader.user?.username || 
                                   selectedTeamLeader.user?.first_name || 
                                   selectedTeamLeader.employee_id || 
                                   `User${selectedTeamLeader.user?.id || selectedTeamLeader.id}`;
        
        let newTeamName = `${newLeaderIdentifier}-${parsed.dateTimeStr}`;
        
        // Add counter suffix if it existed in the original name
        if (parsed.counter) {
          newTeamName += `-${parsed.counter}`;
        }
        
        // Update the form data with the new team name
        setFormData(prev => ({ ...prev, name: newTeamName }));
      }
    }
  }, [selectedTeamLeader, team]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // Validate description (optional)
    if (formData.description && formData.description.length > 500) {
      newErrors.description = "Description must be less than 500 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
    
    // Clear submit error
    if (submitError) {
      setSubmitError("");
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setSubmitError("");

    try {
      const teamData: any = {
        name: formData.name.trim(),
        description: formData.description.trim(),
      };

      // Add team leader if selected
      if (selectedTeamLeader) {
        teamData.team_leader_id = (selectedTeamLeader.user?.id || selectedTeamLeader.id).toString();
      }

      // Add team member IDs
      const memberIds = selectedMembers.map(member => 
        (member.user?.id || member.id).toString()
      );
      teamData.team_member_ids = memberIds;

      await onUpdateTeam(teamData);
      onClose();
    } catch (error: any) {
      console.error("Error updating team:", error);
      setSubmitError(
        error.response?.data?.message || 
        error.message || 
        "Failed to update team. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  // Filter team member options to exclude the selected team leader
  const teamMemberOptions = availableUsers.filter(user => 
    (user.user?.id || user.id) !== (selectedTeamLeader?.user?.id || selectedTeamLeader?.id)
  );

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: "600px",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Edit color="primary" />
          <Typography variant="h6" component="div">
            Edit Team
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Group fontSize="small" />
              Basic Information
            </Typography>
          </Grid>

          {/* Member Type Selection */}
          <Grid size={{ xs: 12 }}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Member Type
              </Typography>
              <ToggleButtonGroup
                value={memberType}
                exclusive
                onChange={(_, newValue) => newValue && setMemberType(newValue)}
                aria-label="member type"
                fullWidth
                sx={{ mb: 1 }}
              >
                <ToggleButton value="field" aria-label="field members">
                  <Engineering sx={{ mr: 1 }} />
                  Field Members
                </ToggleButton>
                <ToggleButton value="non_field" aria-label="non-field members">
                  <Business sx={{ mr: 1 }} />
                  Non-Field Members
                </ToggleButton>
              </ToggleButtonGroup>
              <FormHelperText>
                {memberType === "field" 
                  ? "Select field workers and technicians for operational tasks" 
                  : "Select office staff and administrative personnel"}
              </FormHelperText>
            </Box>
          </Grid>

          {/* Team Leader Selection */}
          <Grid size={{ xs: 12 }}>
            <Autocomplete
              options={availableUsers}
              getOptionLabel={(option) => `${getUserFullName(option)} (${option.user?.email || 'No email'})`}
              value={selectedTeamLeader}
              onChange={(_, newValue) => setSelectedTeamLeader(newValue)}
              isOptionEqualToValue={(option, value) => (option.user?.id || option.id) === (value.user?.id || value.id)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Team Leader"
                  placeholder="Select a team leader"
                  required
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Person fontSize="small" />
                    <Box>
                      <Typography variant="body2">
                        {getUserFullName(option)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.user?.email || 'No email'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
            />
          </Grid>

          {/* Team Members Selection */}
          <Grid size={{ xs: 12 }}>
            <Autocomplete
              multiple
              options={teamMemberOptions}
              getOptionLabel={(option) => `${getUserFullName(option)} (${option.user?.email || 'No email'})`}
              value={selectedMembers}
              onChange={(_, newValue) => setSelectedMembers(newValue || [])}
              isOptionEqualToValue={(option, value) => (option.user?.id || option.id) === (value.user?.id || value.id)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Team Members"
                  placeholder="Select team members (optional)"
                  helperText={`Selected ${selectedMembers.length} member${selectedMembers.length !== 1 ? 's' : ''}`}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <Group sx={{ mr: 1, color: 'text.secondary' }} />
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={getUserFullName(option)}
                    size="small"
                    {...getTagProps({ index })}
                    key={option.user?.id || option.id}
                  />
                ))
              }
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Group fontSize="small" />
                    <Box>
                      <Typography variant="body2">
                        {getUserFullName(option)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.user?.email || 'No email'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
              disabled={!selectedTeamLeader}
            />
          </Grid>

          {/* Team Name Display (Read-only) */}
          <Grid size={{ xs: 12 }}>
            <Alert 
              severity="info" 
              icon={<AutoAwesome />}
              sx={{ 
                backgroundColor: 'rgba(25, 118, 210, 0.04)',
                border: '1px solid rgba(25, 118, 210, 0.2)'
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Current Team Name: <strong>{formData.name}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Team name cannot be modified during editing
              </Typography>
            </Alert>
          </Grid>

          {/* Description */}
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={handleInputChange("description")}
              error={!!errors.description}
              helperText={errors.description || `${formData.description?.length || 0}/500 characters`}
              multiline
              rows={4}
              placeholder="Describe the team's purpose and responsibilities"
              disabled={loading}
            />
          </Grid>

          {/* Configuration Section */}
          <Grid size={{ xs: 12 }}>
            <Typography variant="h6" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
              <Settings fontSize="small" />
              Configuration
            </Typography>
          </Grid>

          {/* Current Team Summary */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1, border: 1, borderColor: 'divider' }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Team Name
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formData.name}
                  </Typography>
                </Grid>

                {selectedTeamLeader && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Team Leader
                    </Typography>
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        {getUserFullName(selectedTeamLeader)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {selectedTeamLeader.user?.email || 'No email'}
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {selectedMembers.length > 0 && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Team Members ({selectedMembers.length})
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {selectedMembers.slice(0, 3).map((member, index) => (
                        <Box key={member.user?.id || member.id} sx={{ mb: index < 2 ? 1 : 0 }}>
                          <Typography variant="body2" fontWeight="medium">
                            {getUserFullName(member)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {member.user?.email || 'No email'}
                          </Typography>
                        </Box>
                      ))}
                      {selectedMembers.length > 3 && (
                        <Typography variant="caption" color="text.secondary">
                          +{selectedMembers.length - 3} more members
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
        >
          {loading ? "Updating..." : "Update Team"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditTeamDialog;