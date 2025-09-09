// Allocation Type Selection Dialog Component
import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Grid, Card, CardContent, Chip } from "@mui/material";
import { Business, Group, Assignment, CheckCircle } from "@mui/icons-material";

export type AllocationType = "vendor" | "internal_team";

interface AllocationTypeDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectType: (type: AllocationType) => void;
  taskName?: string;
}

const AllocationTypeDialog: React.FC<AllocationTypeDialogProps> = ({ open, onClose, onSelectType, taskName }) => {
  const handleTypeSelection = (type: AllocationType) => {
    onSelectType(type);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Assignment />
          Select Allocation Type
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" color="text.secondary">
            Choose how you want to allocate {taskName ? `"${taskName}"` : "this task"}:
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {/* Vendor Allocation Option */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              sx={{
                cursor: "pointer",
                border: "1px solid",
                borderColor: "divider",
                "&:hover": {
                  borderColor: "primary.main",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                },
                transition: "all 0.2s ease-in-out",
              }}
              onClick={() => handleTypeSelection("vendor")}
            >
              <CardContent sx={{ textAlign: "center", py: 3 }}>
                <Box sx={{ mb: 2 }}>
                  <Business
                    sx={{
                      fontSize: 48,
                      color: "primary.main",
                      mb: 1,
                    }}
                  />
                </Box>
                <Typography variant="h6" gutterBottom>
                  Allocate to Vendor
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Assign this task to an external vendor for execution
                </Typography>

                <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mb: 2 }}>
                  <Chip label="External" size="small" color="primary" variant="outlined" />
                  <Chip label="Specialized" size="small" color="info" variant="outlined" />
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Best for: Specialized work, external expertise, or when internal capacity is limited
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Internal Team Allocation Option */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              sx={{
                cursor: "pointer",
                border: "1px solid",
                borderColor: "divider",
                "&:hover": {
                  borderColor: "primary.main",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                },
                transition: "all 0.2s ease-in-out",
              }}
              onClick={() => handleTypeSelection("internal_team")}
            >
              <CardContent sx={{ textAlign: "center", py: 3 }}>
                <Box sx={{ mb: 2 }}>
                  <Group
                    sx={{
                      fontSize: 48,
                      color: "success.main",
                      mb: 1,
                    }}
                  />
                </Box>
                <Typography variant="h6" gutterBottom>
                  Assign to Internal Team
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Assign this task directly to an internal team member
                </Typography>

                <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mb: 2 }}>
                  <Chip label="Internal" size="small" color="success" variant="outlined" />
                  <Chip label="Direct" size="small" color="warning" variant="outlined" />
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Best for: Internal expertise, direct control, or when internal capacity is available
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, p: 2, bgcolor: "info.50", borderRadius: 1 }}>
          <Typography variant="body2" color="info.main">
            <strong>Note:</strong> You can change the allocation type later if needed. The system will track all allocation changes for audit purposes.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AllocationTypeDialog;
