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
} from "@mui/material";
import { Edit } from "@mui/icons-material";
import { Team } from "../types/user";

interface EditTeamDialogProps {
  open: boolean;
  onClose: () => void;
  team: Team | null;
  onUpdateTeam: (teamData: { name: string; description: string }) => Promise<void>;
  existingTeamNames: string[];
}

const EditTeamDialog: React.FC<EditTeamDialogProps> = ({
  open,
  onClose,
  team,
  onUpdateTeam,
  existingTeamNames,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
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
      setErrors({});
      setSubmitError("");
    } else if (!open) {
      setFormData({ name: "", description: "" });
      setErrors({});
      setSubmitError("");
    }
  }, [open, team]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // Validate team name
    if (!formData.name.trim()) {
      newErrors.name = "Team name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Team name must be at least 2 characters long";
    } else if (formData.name.trim().length > 100) {
      newErrors.name = "Team name must be less than 100 characters";
    } else if (existingTeamNames.includes(formData.name.trim())) {
      newErrors.name = "A team with this name already exists";
    }

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
      await onUpdateTeam({
        name: formData.name.trim(),
        description: formData.description.trim(),
      });
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

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Edit />
          Edit Team
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}

          <TextField
            fullWidth
            label="Team Name"
            value={formData.name}
            onChange={handleInputChange("name")}
            error={!!errors.name}
            helperText={errors.name}
            margin="normal"
            required
            disabled={loading}
            autoFocus
          />

          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={handleInputChange("description")}
            error={!!errors.description}
            helperText={errors.description || "Optional team description"}
            margin="normal"
            multiline
            rows={3}
            disabled={loading}
          />

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Note: Editing team details will not affect team members. Use the "View Members" option to manage team membership.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.name.trim()}
        >
          {loading ? "Updating..." : "Update Team"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditTeamDialog;