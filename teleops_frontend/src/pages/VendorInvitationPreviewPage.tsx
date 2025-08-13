import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Box, Paper, Typography, Button, Stack, Alert, CircularProgress, Chip, Divider } from "@mui/material";
import { API_ENDPOINTS, apiHelpers } from "../services/api";

interface VendorInvitationData {
  id: number;
  project: number; // This is the project ID
  project_details: {
    id: number;
    name: string;
    description: string;
    project_type: string;
    client_name?: string;
    customer_name?: string;
    circle?: string;
    scope?: string;
  };
  relationship: {
    id: number;
    vendor_code: string;
    vendor_organization_name?: string;
  };
  invite_email: string;
  expires_at: string;
  status: string;
  invited_at: string;
}

const VendorInvitationPreviewPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<VendorInvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  useEffect(() => {
    if (token) {
      loadInvitation();
    } else {
      setLoading(false);
      setError("No invitation token provided");
    }
  }, [token]);

  const loadInvitation = async () => {
    if (!token) {
      setError("No invitation token provided");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await apiHelpers.get<any>(API_ENDPOINTS.PUBLIC.VENDOR_INVITES.PREVIEW(token));
      setInvitation(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!token) return;

    try {
      setAccepting(true);
      await apiHelpers.post(API_ENDPOINTS.PUBLIC.VENDOR_INVITES.ACCEPT(token));
      // Redirect to success page or show success message
      navigate("/dashboard");
    } catch (e: any) {
      setError(e?.message || "Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!token) return;

    try {
      setDeclining(true);
      await apiHelpers.post(API_ENDPOINTS.PUBLIC.VENDOR_INVITES.DECLINE(token));
      // Redirect to decline page or show decline message
      navigate("/dashboard");
    } catch (e: any) {
      setError(e?.message || "Failed to decline invitation");
    } finally {
      setDeclining(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !invitation) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" p={3}>
        <Paper sx={{ p: 4, maxWidth: 500, textAlign: "center" }}>
          <Typography variant="h5" color="error" gutterBottom>
            Invitation Not Found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {error || "The invitation you're looking for could not be found or has expired."}
          </Typography>
          <Button variant="contained" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </Button>
        </Paper>
      </Box>
    );
  }

  // Additional safety check for relationship data
  if (!invitation.relationship) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" p={3}>
        <Paper sx={{ p: 4, maxWidth: 500, textAlign: "center" }}>
          <Typography variant="h5" color="error" gutterBottom>
            Invalid Invitation Data
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            The invitation data is incomplete or corrupted. Please contact support.
          </Typography>
          <Button variant="contained" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </Button>
        </Paper>
      </Box>
    );
  }

  const isExpired = new Date(invitation.expires_at) < new Date();
  const canRespond = invitation.status === "pending" && !isExpired;

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" p={3}>
      <Paper sx={{ p: 4, maxWidth: 600, width: "100%" }}>
        <Typography variant="h4" gutterBottom align="center">
          Project Vendor Invitation
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Stack spacing={3}>
          {/* Project Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Project Details
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Project Name:</strong> {invitation.project_details.name || "N/A"}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Project Type:</strong> {invitation.project_details.project_type || "N/A"}
            </Typography>
            {invitation.project_details.client_name && (
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Client Name:</strong> {invitation.project_details.client_name}
              </Typography>
            )}
            {invitation.project_details.customer_name && (
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Customer Name:</strong> {invitation.project_details.customer_name}
              </Typography>
            )}
            {invitation.project_details.circle && (
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Circle:</strong> {invitation.project_details.circle}
              </Typography>
            )}
            {invitation.project_details.description && (
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Description:</strong> {invitation.project_details.description}
              </Typography>
            )}
            {invitation.project_details.scope && (
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Scope:</strong> {invitation.project_details.scope}
              </Typography>
            )}
          </Box>

          {/* Vendor Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Vendor Information
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Vendor Code:</strong> {invitation.relationship?.vendor_code || "N/A"}
            </Typography>
            {invitation.relationship?.vendor_organization_name && (
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Organization:</strong> {invitation.relationship.vendor_organization_name}
              </Typography>
            )}
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Email:</strong> {invitation.invite_email || "N/A"}
            </Typography>
          </Box>

          {/* Invitation Details */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Invitation Details
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Status:</strong> <Chip label={invitation.status} color={invitation.status === "pending" ? "warning" : invitation.status === "accepted" ? "success" : "error"} size="small" />
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Invited:</strong> {new Date(invitation.invited_at).toLocaleDateString()}
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Expires:</strong> {new Date(invitation.expires_at).toLocaleDateString()}
            </Typography>
          </Box>

          {/* Status Alerts */}
          {isExpired && <Alert severity="error">This invitation has expired and can no longer be accepted.</Alert>}

          {invitation.status !== "pending" && <Alert severity="info">This invitation has already been {invitation.status}.</Alert>}

          {/* Action Buttons */}
          {canRespond && (
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button variant="contained" color="success" size="large" onClick={handleAccept} disabled={accepting} sx={{ minWidth: 120 }}>
                {accepting ? <CircularProgress size={20} /> : "Accept"}
              </Button>
              <Button variant="outlined" color="error" size="large" onClick={handleDecline} disabled={declining} sx={{ minWidth: 120 }}>
                {declining ? <CircularProgress size={20} /> : "Decline"}
              </Button>
            </Stack>
          )}

          {!canRespond && (
            <Box textAlign="center">
              <Button variant="contained" onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </Button>
            </Box>
          )}
        </Stack>
      </Paper>
    </Box>
  );
};

export default VendorInvitationPreviewPage;
