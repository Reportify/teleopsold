import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Fab,
  Tooltip,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from "@mui/material";
import { Add, MoreVert, Edit, Delete, People, Search, FilterList, Refresh, Settings } from "@mui/icons-material";
import TeamCreationDialog from "../components/TeamCreationDialog";
import TeamMemberManagement from "../components/TeamMemberManagement";
import EditTeamDialog from "../components/EditTeamDialog";
import { teamService } from "../services/teamService";
import { userManagementAPI } from "../services/userAPI";
import { Team, TeamMember, TeamMembership, TeamCreateData, TeamMemberAddData, EnhancedUserProfile, User } from "../types/user";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} id={`team-tabpanel-${index}`} aria-labelledby={`team-tab-${index}`} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const TeamsPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMemberships, setTeamMemberships] = useState<TeamMembership[]>([]);
  const [teamDetailsMembers, setTeamDetailsMembers] = useState<TeamMember[]>([]);
  const [teamTabMembers, setTeamTabMembers] = useState<TeamMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<EnhancedUserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<EnhancedUserProfile[]>([]);
  const [memberType, setMemberType] = useState<"field" | "non_field">("field");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Ensure teams is always an array
  const safeTeams = Array.isArray(teams) ? teams : [];

  // Safe setTeams wrapper
  const setSafeTeams = (value: Team[] | ((prev: Team[]) => Team[])) => {
    if (typeof value === "function") {
      setTeams((prev) => {
        const result = value(Array.isArray(prev) ? prev : []);
        return Array.isArray(result) ? result : [];
      });
    } else {
      setTeams(Array.isArray(value) ? value : []);
    }
  };

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [teamToView, setTeamToView] = useState<Team | null>(null);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);

  // UI states
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuTeam, setMenuTeam] = useState<Team | null>(null);

  // Load initial data
  useEffect(() => {
    loadTeamsData();
  }, []);

  const filterUsersByMemberType = (users: EnhancedUserProfile[], type: "field" | "non_field") => {
    console.log("=== FILTERING DEBUG ===");
    console.log("Total users:", users.length);
    console.log("Filter type:", type);
    console.log("Sample user structure:", users[0]);

    // Log all users and their designation structures
    users.forEach((user, index) => {
      console.log(`User ${index}:`, {
        id: user.id,
        full_name: user.full_name,
        designation: user.designation,
        designation_type: user.designation?.designation_type,
        all_designations: user.all_designations,
        designation_types_from_all: user.all_designations?.map((d) => d.designation_type),
      });
    });

    const filteredUsers = users.filter((user) => {
      // Check primary designation first (using 'designation_type' field)
      if (user.designation?.designation_type === type) {
        console.log(`✓ User ${user.full_name} matches via designation.designation_type`);
        return true;
      }

      // Check all_designations array (using 'designation_type' field)
      if (user.all_designations && user.all_designations.length > 0) {
        const hasMatchingDesignation = user.all_designations.some((designation) => designation.designation_type === type);
        if (hasMatchingDesignation) {
          console.log(`✓ User ${user.full_name} matches via all_designations`);
          return true;
        }
      }

      console.log(`✗ User ${user.full_name} does not match filter`);
      return false;
    });

    console.log("Filtered users count:", filteredUsers.length);
    console.log("Filtered users:", filteredUsers);

    // Always set the filtered users (even if empty)
    setAvailableUsers(filteredUsers);
  };

  const handleMemberTypeChange = (type: "field" | "non_field") => {
    setMemberType(type);
    filterUsersByMemberType(allUsers, type);
  };

  const loadTeamsData = async () => {
    try {
      setLoading(true);
      setError("");

      const [teamsResponse, usersResponse] = await Promise.all([
        teamService.list(),
        userManagementAPI.users.list(), // Use real API for users
      ]);

      console.log("Users API Response:", usersResponse);
      console.log("Users data:", usersResponse.results);
      console.log("Teams API Response:", teamsResponse);
      console.log("Teams data:", teamsResponse.results);

      setSafeTeams(teamsResponse.results || []);
      setTeamMemberships([]); // Will be loaded when a team is selected
      setAllUsers(usersResponse.results || []);

      // Filter users based on current member type
      filterUsersByMemberType(usersResponse.results || [], memberType);
    } catch (error) {
      setError("Failed to load teams data");
      console.error("Error loading teams:", error);
      // Ensure teams is always an array even on error
      setSafeTeams([]);
      setAllUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (teamData: TeamCreateData) => {
    try {
      const response = await teamService.create(teamData);
      setSafeTeams((prev) => [...prev, response]);
      setCreateDialogOpen(false);
    } catch (error) {
      throw error;
    }
  };

  const handleDeleteTeam = async () => {
    if (!teamToDelete) return;

    try {
      await teamService.delete(teamToDelete.id);
      setSafeTeams((prev) => prev.filter((team) => team.id !== teamToDelete.id));
      setTeamMemberships((prev) => prev.filter((membership) => membership.team !== teamToDelete.id));
      setDeleteDialogOpen(false);
      setTeamToDelete(null);

      // If deleted team was selected, clear selection
      if (selectedTeam?.id === teamToDelete.id) {
        setSelectedTeam(null);
        setTabValue(0);
        setTeamTabMembers([]);
      }
    } catch (error) {
      setError("Failed to delete team");
    }
  };

  const handleAddMember = async (memberData: TeamMemberAddData) => {
    if (!selectedTeam) return;

    try {
      const response = await teamService.addMember(selectedTeam.id, memberData);
      setTeamMemberships((prev) => [...prev, response]);
    } catch (error) {
      throw error;
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedTeam) return;

    try {
      await teamService.removeMember(selectedTeam.id, userId);
      setTeamMemberships((prev) => prev.filter((membership) => !(membership.team === selectedTeam.id && membership.user === userId)));
    } catch (error) {
      throw error;
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, team: Team) => {
    setAnchorEl(event.currentTarget);
    setMenuTeam(team);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuTeam(null);
  };

  const loadTeamMembers = async (teamId: number) => {
    try {
      const members = await teamService.getMembers(teamId);
      setTeamTabMembers(members);
    } catch (error) {
      console.error("Error loading team members:", error);
      setError("Failed to load team members");
    }
  };

  const handleViewTeamMembers = (team: Team) => {
    setSelectedTeam(team);
    setTabValue(1);
    setTeamTabMembers([]); // Clear previous data
    loadTeamMembers(team.id);
    handleMenuClose();
  };

  const handleViewTeamDetails = async (team: Team) => {
    setTeamToView(team);
    setViewDialogOpen(true);
    // Load team members for the details view
    try {
      const members = await teamService.getMembers(team.id);
      setTeamDetailsMembers(members);
    } catch (error) {
      console.error("Error loading team members:", error);
    }
    handleMenuClose();
  };

  const handleEditTeam = async (team: Team) => {
    setTeamToEdit(team);
    setEditDialogOpen(true);
    
    // Load team members for the edit dialog
    try {
      const members = await teamService.getMembers(team.id);
      setTeamDetailsMembers(members);
    } catch (error) {
      console.error("Error loading team members for edit:", error);
    }
    
    handleMenuClose();
  };

  const handleUpdateTeam = async (teamData: { 
    name: string; 
    description: string; 
    team_leader_id?: string; 
    team_member_ids?: string[];
  }) => {
    if (!teamToEdit) return;

    try {
      const updatedTeam = await teamService.update(teamToEdit.id, teamData);
      setSafeTeams((prev) => prev.map((team) => (team.id === teamToEdit.id ? updatedTeam : team)));
      
      // If team members were updated, refresh the team members data
      if (teamData.team_member_ids && selectedTeam?.id === teamToEdit.id) {
        loadTeamMembers(teamToEdit.id);
      }
      
      setEditDialogOpen(false);
      setTeamToEdit(null);
    } catch (error) {
      throw error;
    }
  };



  const filteredTeams = safeTeams.filter((team) => team.name.toLowerCase().includes(searchQuery.toLowerCase()) || (team.description || "").toLowerCase().includes(searchQuery.toLowerCase()));

  const getTeamMembersCount = (teamId: number) => {
    const team = safeTeams.find(t => t.id === teamId);
    return team?.member_count || 0;
  };

  const getTeamMembers = (teamId: number): (TeamMember | TeamMembership)[] => {
    // For the details view, return the loaded team members
    if (teamToView && teamToView.id === teamId) {
      return teamDetailsMembers;
    }
    // For the edit dialog, return the loaded team members
    if (teamToEdit && teamToEdit.id === teamId) {
      return teamDetailsMembers;
    }
    // For the team members tab, return the loaded team tab members
    if (selectedTeam && selectedTeam.id === teamId) {
      return teamTabMembers;
    }
    // For other views, filter from teamMemberships (if needed)
    return teamMemberships.filter((membership) => membership.team === teamId && membership.is_active);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Teams
        </Typography>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading teams data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <People />
            Teams
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage in-house teams and their members
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={loadTeamsData} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialogOpen(true)}>
            Create Team
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label={`All Teams (${safeTeams.length})`} icon={<People />} iconPosition="start" />
          {selectedTeam && <Tab label={`${selectedTeam.name} Members`} icon={<People />} iconPosition="start" />}
        </Tabs>
      </Box>

      {/* Teams List Tab */}
      <TabPanel value={tabValue} index={0}>
        {/* Search and Filters */}
        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <TextField
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1 }}
          />
          <Button variant="outlined" startIcon={<FilterList />}>
            Filters
          </Button>
        </Box>

        {/* Teams Grid */}
        {filteredTeams.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: "center", py: 6 }}>
              <People sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {searchQuery ? "No teams found" : "No teams created yet"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchQuery ? "Try adjusting your search criteria" : "Create your first team to get started with team management"}
              </Typography>
              {!searchQuery && (
                <Button variant="contained" startIcon={<Add />} onClick={() => setCreateDialogOpen(true)}>
                  Create First Team
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {filteredTeams.map((team) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={team.id}>
                <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {team.name}
                        </Typography>
                      </Box>
                      <IconButton size="small" onClick={(e) => handleMenuClick(e, team)}>
                        <MoreVert />
                      </IconButton>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {team.description}
                    </Typography>

                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <People fontSize="small" />
                        <Typography variant="body2">{getTeamMembersCount(team.id)} members</Typography>
                      </Box>
                      <Chip label={team.is_active ? "Active" : "Inactive"} size="small" color={team.is_active ? "success" : "default"} variant="outlined" />
                    </Box>

                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                      Created: {new Date(team.created_at).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Team Members Tab */}
      {selectedTeam && (
        <TabPanel value={tabValue} index={1}>
          <TeamMemberManagement
            teamId={selectedTeam.id.toString()}
            teamName={selectedTeam.name}
            members={getTeamMembers(selectedTeam.id)}
            availableUsers={availableUsers}
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
            loading={loading}
          />
        </TabPanel>
      )}

      {/* Floating Action Button */}
      <Fab color="primary" aria-label="create team" sx={{ position: "fixed", bottom: 24, right: 24 }} onClick={() => setCreateDialogOpen(true)}>
        <Add />
      </Fab>

      {/* Team Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => handleViewTeamDetails(menuTeam!)}>
          <People sx={{ mr: 1 }} />
          View Team Details
        </MenuItem>
        <MenuItem onClick={() => handleEditTeam(menuTeam!)}>
          <Edit sx={{ mr: 1 }} />
          Edit Team
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setTeamToDelete(menuTeam);
            setDeleteDialogOpen(true);
            handleMenuClose();
          }}
          sx={{ color: "error.main" }}
        >
          <Delete sx={{ mr: 1 }} />
          Delete Team
        </MenuItem>
      </Menu>

      {/* Create Team Dialog */}
      <TeamCreationDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreateTeam={handleCreateTeam}
        availableUsers={availableUsers}
        existingTeamNames={teams.map((team) => team.name)}
        onMemberTypeChange={handleMemberTypeChange}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Team</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the team <strong>{teamToDelete?.name}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone. All team data and member associations will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteTeam} color="error" variant="contained">
            Delete Team
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Team Details Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <People />
            Team Details
          </Box>
        </DialogTitle>
        <DialogContent>
          {teamToView && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {teamToView.name}
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                {teamToView.description || "No description provided"}
              </Typography>

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Team Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Created Date
                    </Typography>
                    <Typography variant="body1">{new Date(teamToView.created_at).toLocaleDateString()}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Last Updated
                    </Typography>
                    <Typography variant="body1">{new Date(teamToView.updated_at).toLocaleDateString()}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Team ID
                    </Typography>
                    <Typography variant="body1" sx={{ fontFamily: "monospace" }}>
                      {teamToView.id}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="body2" color="text.secondary">
                      Active Members
                    </Typography>
                    <Typography variant="body1">{getTeamMembersCount(teamToView.id)}</Typography>
                  </Grid>
                </Grid>
              </Box>

              {/* Team Members Section */}
              <Box sx={{ mt: 4 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <People />
                  Team Members
                </Typography>
                {getTeamMembers(teamToView.id).length > 0 ? (
                  <List sx={{ bgcolor: "background.paper", borderRadius: 1, border: 1, borderColor: "divider" }}>
                    {getTeamMembers(teamToView.id).map((member, index) => (
                      <ListItem key={member.id} divider={index < getTeamMembers(teamToView.id).length - 1}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: "primary.main" }}>
                            {member.user_full_name?.charAt(0) || "U"}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Typography variant="subtitle2">
                                {member.user_full_name || "Unknown User"}
                              </Typography>
                              <Chip
                                label={(member as any).role_display || member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                size="small"
                                color={member.role === "leader" ? "primary" : "default"}
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {member.user_email}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Joined: {new Date(member.joined_at).toLocaleDateString()}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ textAlign: "center", py: 3, bgcolor: "background.paper", borderRadius: 1, border: 1, borderColor: "divider" }}>
                    <People sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      No members in this team yet
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setViewDialogOpen(false);
            setTeamDetailsMembers([]);
          }}>Close</Button>
          <Button
            variant="contained"
            onClick={() => {
              setViewDialogOpen(false);
              setTeamDetailsMembers([]);
              if (teamToView) handleEditTeam(teamToView);
            }}
          >
            Edit Team
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Team Dialog */}
      <EditTeamDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setTeamToEdit(null);
        }}
        team={teamToEdit}
        onUpdateTeam={handleUpdateTeam}
        existingTeamNames={teams.filter((t) => t.id !== teamToEdit?.id).map((t) => t.name)}
        availableUsers={availableUsers}
        teamMembers={teamToEdit ? getTeamMembers(teamToEdit.id) : []}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
      />
    </Box>
  );
};

export default TeamsPage;
