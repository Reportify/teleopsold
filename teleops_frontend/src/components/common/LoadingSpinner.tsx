import React from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

interface LoadingSpinnerProps {
  size?: number;
  message?: string;
  fullPage?: boolean;
  color?: "primary" | "secondary" | "inherit";
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 40, message = "Loading...", fullPage = false, color = "primary" }) => {
  const content = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        p: 3,
      }}
    >
      <CircularProgress size={size} color={color} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );

  if (fullPage) {
    return (
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          zIndex: 9999,
        }}
      >
        {content}
      </Box>
    );
  }

  return content;
};

export default LoadingSpinner;
