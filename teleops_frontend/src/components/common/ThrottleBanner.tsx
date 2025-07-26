import React from "react";
import { Alert, Box } from "@mui/material";
import { useThrottle } from "../../contexts/ThrottleContext";

const ThrottleBanner: React.FC = () => {
  const { throttleWait } = useThrottle();

  if (!throttleWait) return null;

  const minutes = Math.ceil(throttleWait / 60);

  return (
    <Box sx={{ position: "fixed", top: 80, left: 0, right: 0, zIndex: 1300, p: 2 }}>
      <Alert severity="warning" variant="filled">
        Too many requests. Please wait {minutes} minute(s) ({throttleWait} seconds) and try again.
      </Alert>
    </Box>
  );
};

export default ThrottleBanner;
