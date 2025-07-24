// Settings Page Component - Placeholder
import React from "react";
import { Box, Typography } from "@mui/material";
import { useDarkMode } from "../contexts/ThemeContext";

const SettingsPage: React.FC = () => {
  const { darkMode } = useDarkMode();

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        backgroundColor: darkMode ? "#121212" : "#FAFBFC",
        minHeight: "100vh",
        color: darkMode ? "#e8eaed" : "#1a1a1a",
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontWeight: 500,
          color: darkMode ? "#e8eaed" : "#1a1a1a",
          fontSize: { xs: "1.5rem", sm: "1.875rem", md: "2rem" },
          letterSpacing: "-0.01em",
          mb: 1,
        }}
      >
        Settings
      </Typography>
      <Typography
        variant="body1"
        sx={{
          color: darkMode ? "#9aa0a6" : "#6b7280",
          fontSize: "0.875rem",
          opacity: 0.8,
        }}
      >
        Application settings and configuration will be implemented here.
      </Typography>
    </Box>
  );
};

export default SettingsPage;
