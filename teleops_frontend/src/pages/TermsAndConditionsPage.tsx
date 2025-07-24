import React from "react";
import { Box, Typography, Paper } from "@mui/material";

const TermsAndConditionsPage: React.FC = () => (
  <Box sx={{ maxWidth: 800, mx: "auto", my: 4, p: 2 }}>
    <Paper sx={{ p: 4, borderRadius: 3, boxShadow: 3 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Terms & Conditions
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Last updated: June 2024
      </Typography>
      <Typography variant="body1" paragraph>
        Welcome to TeleOps. Please read these Terms & Conditions ("Terms", "Terms and Conditions") carefully before using our services.
      </Typography>
      <Typography variant="h6" fontWeight={600} sx={{ mt: 3 }}>
        1. Acceptance of Terms
      </Typography>
      <Typography variant="body1" paragraph>
        By accessing or using our platform, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the service.
      </Typography>
      <Typography variant="h6" fontWeight={600} sx={{ mt: 3 }}>
        2. Use of Service
      </Typography>
      <Typography variant="body1" paragraph>
        You agree to use the service only for lawful purposes and in accordance with these Terms.
      </Typography>
      <Typography variant="h6" fontWeight={600} sx={{ mt: 3 }}>
        3. User Accounts
      </Typography>
      <Typography variant="body1" paragraph>
        You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer or device.
      </Typography>
      <Typography variant="h6" fontWeight={600} sx={{ mt: 3 }}>
        4. Intellectual Property
      </Typography>
      <Typography variant="body1" paragraph>
        The service and its original content, features, and functionality are and will remain the exclusive property of TeleOps and its licensors.
      </Typography>
      <Typography variant="h6" fontWeight={600} sx={{ mt: 3 }}>
        5. Termination
      </Typography>
      <Typography variant="body1" paragraph>
        We may terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever.
      </Typography>
      <Typography variant="h6" fontWeight={600} sx={{ mt: 3 }}>
        6. Changes to Terms
      </Typography>
      <Typography variant="body1" paragraph>
        We reserve the right to modify or replace these Terms at any time. Changes will be effective upon posting to this page.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
        For any questions about these Terms, please contact support@teleops.com.
      </Typography>
    </Paper>
  </Box>
);

export default TermsAndConditionsPage;
