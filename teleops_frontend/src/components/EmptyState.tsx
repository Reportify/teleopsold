import React from "react";
import { Box, Typography, Button, Paper } from "@mui/material";
import { Add, InfoOutlined } from "@mui/icons-material";

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  illustration?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, actionText, onAction, icon = <InfoOutlined sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />, illustration }) => {
  return (
    <Paper
      sx={{
        p: 6,
        textAlign: "center",
        bgcolor: "grey.50",
        border: "2px dashed",
        borderColor: "grey.300",
      }}
    >
      {illustration ? <img src={illustration} alt={title} style={{ maxWidth: 200, marginBottom: 16 }} /> : icon}

      <Typography variant="h6" fontWeight={600} gutterBottom>
        {title}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: "auto" }}>
        {description}
      </Typography>

      {actionText && onAction && (
        <Button variant="contained" startIcon={<Add />} onClick={onAction} size="large">
          {actionText}
        </Button>
      )}
    </Paper>
  );
};

export default EmptyState;
