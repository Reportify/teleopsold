import React from "react";
import { Alert, AlertTitle, Box, Button } from "@mui/material";
import { Refresh } from "@mui/icons-material";

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  severity?: "error" | "warning" | "info";
  variant?: "filled" | "outlined" | "standard";
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ title = "Error", message, onRetry, severity = "error", variant = "outlined" }) => {
  return (
    <Box sx={{ p: 2 }}>
      <Alert severity={severity} variant={variant}>
        <AlertTitle>{title}</AlertTitle>
        {message}
        {onRetry && (
          <Box sx={{ mt: 1 }}>
            <Button size="small" startIcon={<Refresh />} onClick={onRetry} variant="outlined" color={severity}>
              Try Again
            </Button>
          </Box>
        )}
      </Alert>
    </Box>
  );
};

export default ErrorMessage;
