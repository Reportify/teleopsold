import React from "react";
import { Snackbar, Alert, AlertColor } from "@mui/material";

interface ModernSnackbarProps {
  open: boolean;
  message: string;
  severity: AlertColor;
  onClose: () => void;
  autoHideDuration?: number;
}

const ModernSnackbar: React.FC<ModernSnackbarProps> = ({ open, message, severity, onClose, autoHideDuration }) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration || (severity === "error" ? 8000 : 4000)}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      sx={{ marginBottom: 2, marginLeft: 2 }}
    >
      <Alert
        severity={severity}
        onClose={onClose}
        variant="filled"
        sx={{
          minWidth: "350px",
          maxWidth: "500px",
          borderRadius: "12px",
          fontSize: "0.9rem",
          fontWeight: 500,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
          backdropFilter: "blur(8px)",
          "& .MuiAlert-message": {
            fontSize: "0.9rem",
            fontWeight: 500,
            lineHeight: 1.4,
          },
          "& .MuiAlert-icon": {
            fontSize: "1.2rem",
            marginRight: "12px",
          },
          "& .MuiAlert-action": {
            paddingTop: 0,
            paddingBottom: 0,
          },
          // Success messages - Modern Green
          ...(severity === "success" && {
            backgroundColor: "#10B981",
            color: "#FFFFFF",
            "& .MuiAlert-icon": {
              color: "#FFFFFF",
            },
            "& .MuiIconButton-root": {
              color: "#FFFFFF",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
              },
            },
          }),
          // Error messages - Modern Red
          ...(severity === "error" && {
            backgroundColor: "#EF4444",
            color: "#FFFFFF",
            "& .MuiAlert-icon": {
              color: "#FFFFFF",
            },
            "& .MuiIconButton-root": {
              color: "#FFFFFF",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
              },
            },
          }),
          // Warning messages - Modern Orange
          ...(severity === "warning" && {
            backgroundColor: "#F59E0B",
            color: "#FFFFFF",
            "& .MuiAlert-icon": {
              color: "#FFFFFF",
            },
            "& .MuiIconButton-root": {
              color: "#FFFFFF",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
              },
            },
          }),
          // Info messages - Modern Blue
          ...(severity === "info" && {
            backgroundColor: "#3B82F6",
            color: "#FFFFFF",
            "& .MuiAlert-icon": {
              color: "#FFFFFF",
            },
            "& .MuiIconButton-root": {
              color: "#FFFFFF",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
              },
            },
          }),
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default ModernSnackbar;
