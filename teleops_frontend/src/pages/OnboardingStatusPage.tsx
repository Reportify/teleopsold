import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box, Typography, CircularProgress, Paper, Chip } from "@mui/material";
import { api } from "../services/api";

interface StatusData {
  email: string;
  contact_name: string;
  tenant_type: string;
  status: string;
  organization_name: string | null;
  accepted_at: string | null;
  invited_at: string;
}

const statusColor = (status: string) => {
  switch (status) {
    case "Pending":
      return "info";
    case "Accepted":
      return "success";
    case "Expired":
      return "warning";
    case "Cancelled":
      return "error";
    default:
      return "default";
  }
};

const OnboardingStatusPage: React.FC = () => {
  const { invitation_id } = useParams<{ invitation_id: string }>();
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invitation_id) return;
    setLoading(true);
    (async () => {
      try {
        const res = await api.get(`/public/onboarding/status/${invitation_id}/`);
        setStatus(res.data);
        setLoading(false);
      } catch (error: any) {
        setError(error.message || "Failed to fetch status.");
        setLoading(false);
      }
    })();
  }, [invitation_id]);

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f9fb" }}>
      <Paper sx={{ p: 4, minWidth: 350, maxWidth: 500, boxShadow: 3 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Onboarding Status
        </Typography>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 120 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        ) : status ? (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              <b>Email:</b> {status.email}
            </Typography>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              <b>Contact Name:</b> {status.contact_name}
            </Typography>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              <b>Tenant Type:</b> {status.tenant_type}
            </Typography>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              <b>Status:</b> <Chip label={status.status} color={statusColor(status.status)} />
            </Typography>
            {status.organization_name && (
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                <b>Organization:</b> {status.organization_name}
              </Typography>
            )}
            <Typography variant="subtitle2" sx={{ mt: 2 }}>
              Invited: {new Date(status.invited_at).toLocaleString()}
            </Typography>
            {status.accepted_at && <Typography variant="subtitle2">Accepted: {new Date(status.accepted_at).toLocaleString()}</Typography>}
          </Box>
        ) : null}
      </Paper>
    </Box>
  );
};

export default OnboardingStatusPage;
