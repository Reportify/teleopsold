// Team Member Management Component
import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
} from "@mui/material";
import {
  Add,
  Remove,
  Person,
  Group,
  Close,
  Edit,
  Delete,
  Email,
  Phone,
  Badge,
} from "@mui/icons-material";
import { TeamMember, TeamMembership, TeamMemberAddData, EnhancedUserProfile } from "../types/user";

interface TeamMemberManagementProps {
  teamId: string;
  teamName: string;
  members: (TeamMember | TeamMembership)[];
  availableUsers: EnhancedUserProfile[];
  onAddMember: (memberData: TeamMemberAddData) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
  onUpdateMemberRole?: (membershipId: string, role: string) => Promise<void>;
  loading?: boolean;
}

interface AddMemberDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (memberData: TeamMemberAddData) => Promise<void>;
  availableUsers: EnhancedUserProfile[];
  loading?: boolean;
}

const AddMemberDialog: React.FC<AddMemberDialogProps> = ({
  open,
  onClose,
  onAdd,
  availableUsers,
  loading = false,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [role, setRole] = useState<"leader" | "member" | "coordinator" | "observer">("member");
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string>("");

  const roles = [
    { value: "leader", label: "Team Leader", description: "Leads and coordinates team activities" },
    { value: "member", label: "Team Member", description: "Active participant in team activities" },
    { value: "coordinator", label: "Coordinator", description: "Coordinates specific aspects of team work" },
    { value: "observer", label: "Observer", description: "Observes team activities with limited participation" },
  ];

  const handleSubmit = async () => {
    if (!selectedUserId) {
      setError("Please select a user");
      return;
    }

    try {
      setError("");
      await onAdd({
        user_id: selectedUserId,
        role,
        notes: notes.trim() || undefined,
      });
      handleClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to add member");
    }
  };

  const handleClose = () => {
    setSelectedUserId("");
    setRole("member");
    setNotes("");
    setError("");
    onClose();
  };

  const selectedUser = availableUsers.find(user => user.user_id.toString() === selectedUserId);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Add color="primary" />
          <Typography variant="h6">Add Team Member</Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth required>
              <InputLabel>Select User</InputLabel>
              <Select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                label="Select User"
              >
                {availableUsers.map((user) => (
                  <MenuItem key={user.user_id} value={user.user_id.toString()}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {user.user?.first_name?.[0]}{user.user?.last_name?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body1">{user.full_name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {user.user?.email}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth required>
              <InputLabel>Role</InputLabel>
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                label="Role"
              >
                {roles.map((roleOption) => (
                  <MenuItem key={roleOption.value} value={roleOption.value}>
                    <Box>
                      <Typography variant="body1">{roleOption.label}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {roleOption.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Notes (Optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this member's role or responsibilities"
              multiline
              rows={2}
            />
          </Grid>

          {selectedUser && (
            <Grid size={{ xs: 12 }}>
              <Card sx={{ backgroundColor: "background.default" }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Selected User Details
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar sx={{ width: 48, height: 48 }}>
                      {selectedUser.user?.first_name?.[0]}{selectedUser.user?.last_name?.[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        {selectedUser.full_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedUser.user?.email}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Employee ID: {selectedUser.employee_id}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {error && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined" disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !selectedUserId}
          startIcon={<Add />}
        >
          {loading ? "Adding..." : "Add Member"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const TeamMemberManagement: React.FC<TeamMemberManagementProps> = ({
  teamId,
  teamName,
  members,
  availableUsers,
  onAddMember,
  onRemoveMember,
  onUpdateMemberRole,
  loading = false,
}) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<(TeamMember | TeamMembership) | null>(null);

  const getRoleColor = (role: string) => {
    switch (role) {
      case "leader":
        return "primary";
      case "coordinator":
        return "secondary";
      case "member":
        return "default";
      case "observer":
        return "info";
      default:
        return "default";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "leader":
        return <Badge />;
      case "coordinator":
        return <Edit />;
      case "member":
        return <Person />;
      case "observer":
        return <Group />;
      default:
        return <Person />;
    }
  };

  const handleRemoveMember = async () => {
    if (memberToRemove) {
      try {
        // Handle both TeamMember and TeamMembership types
        const userId = 'user' in memberToRemove ? memberToRemove.user : memberToRemove.id.toString();
        await onRemoveMember(userId);
        setRemoveConfirmOpen(false);
        setMemberToRemove(null);
      } catch (error) {
        console.error("Failed to remove member:", error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Group />
            Team Members
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage members for {teamName} ({members.length} members)
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setAddDialogOpen(true)}
          disabled={loading || availableUsers.length === 0}
        >
          Add Member
        </Button>
      </Box>

      {/* Members List */}
      {members.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 6 }}>
            <Group sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No team members yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Start building your team by adding members
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setAddDialogOpen(true)}
              disabled={availableUsers.length === 0}
            >
              Add First Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <List>
            {members.map((member, index) => (
              <React.Fragment key={member.id}>
                <ListItem sx={{ py: 2 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ width: 48, height: 48 }}>
                      {member.user_full_name?.split(" ").map(n => n[0]).join("")}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {member.user_full_name}
                        </Typography>
                        <Chip
                          icon={getRoleIcon(member.role)}
                          label={member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          size="small"
                          color={getRoleColor(member.role) as any}
                          variant="outlined"
                        />
                        {'is_active' in member && !member.is_active && (
                          <Chip label="Inactive" size="small" color="error" variant="outlined" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 0.5 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Email fontSize="small" />
                            <Typography variant="body2">{member.user_email}</Typography>
                          </Box>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Joined: {formatDate(member.joined_at)}
                        </Typography>
                        {'notes' in member && member.notes && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Notes: {member.notes}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      {onUpdateMemberRole && (
                        <Tooltip title="Edit Role">
                          <IconButton size="small" color="primary">
                            <Edit />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Remove Member">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setMemberToRemove(member);
                            setRemoveConfirmOpen(true);
                          }}
                          disabled={loading}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < members.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Card>
      )}

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onAdd={onAddMember}
        availableUsers={availableUsers}
        loading={loading}
      />

      {/* Remove Confirmation Dialog */}
      <Dialog open={removeConfirmOpen} onClose={() => setRemoveConfirmOpen(false)}>
        <DialogTitle>Remove Team Member</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove <strong>{memberToRemove?.user_full_name}</strong> from the team?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone. The member will lose access to team resources and activities.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleRemoveMember} color="error" variant="contained">
            Remove Member
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamMemberManagement;