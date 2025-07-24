// 404 Page Component - Placeholder
import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 3, textAlign: "center" }}>
      <Typography variant="h1" sx={{ mb: 2 }}>
        404
      </Typography>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Page Not Found
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        The page you are looking for does not exist.
      </Typography>
      <Button variant="contained" onClick={() => navigate("/dashboard")}>
        Go to Dashboard
      </Button>
    </Box>
  );
};

export default NotFoundPage;
