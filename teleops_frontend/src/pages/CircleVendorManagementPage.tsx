// Circle Vendor Management Page for Circle Tenants
import React, { useState, useEffect, useCallback } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import {
  MoreVert,
  Business,
  Star,
  Assessment,
  Email,
  Visibility,
  Edit,
  Delete,
  PersonAdd,
  Assignment,
  Pause,
  Search,
  PlayArrow,
  MonetizationOn,
  TrendingUp,
  CheckCircleOutline,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { ModernSnackbar } from "../components";
import circleVendorService, { VendorRelationship, VendorInviteRequest } from "../services/circleVendorService";

interface VendorInviteForm {
  vendor_name: string;
  vendor_code: string;
  contact_person_name: string;
  vendor_email: string;
  contact_access_level: string;
  expiry_option: "1" | "3" | "7" | "14" | "30" | "custom";
  custom_expiry_date: string;
}

// Mock vendor invitations interface (will be replaced with actual API data)
interface VendorInvitation {
  id: string;
  vendor_name: string;
  vendor_code: string;
  contact_name: string;
  email: string;
  contact_phone?: string;
  contact_access_level: string;
  status: "Pending" | "Accepted" | "Expired" | "Cancelled";
  invited_at: string;
  expires_at: string;
  invitation_token: string;
}

const CircleVendorManagementPage: React.FC = () => {
  const { getCurrentTenant } = useAuth();
  const theme = useTheme();
  const [vendors, setVendors] = useState<VendorRelationship[]>([]);
  const [invitations, setInvitations] = useState<VendorInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [vendorMenuAnchor, setVendorMenuAnchor] = useState<null | HTMLElement>(null);
  const [invitationMenuAnchor, setInvitationMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedVendor, setSelectedVendor] = useState<VendorRelationship | null>(null);
  const [selectedInvitation, setSelectedInvitation] = useState<VendorInvitation | null>(null);
  const [openResendDialog, setOpenResendDialog] = useState(false);
  const [resendInvitation, setResendInvitation] = useState<VendorInvitation | null>(null);
  const [resendExpiryOption, setResendExpiryOption] = useState("1");
  const [resendCustomExpiry, setResendCustomExpiry] = useState("");
  const [timeRefreshKey, setTimeRefreshKey] = useState(0);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "info" | "success" | "warning" | "error",
  });

  const currentTenant = getCurrentTenant();

  // Form state for vendor invitation
  const [inviteForm, setInviteForm] = useState<VendorInviteForm>({
    vendor_name: "",
    vendor_code: "",
    contact_person_name: "",
    vendor_email: "",
    contact_access_level: "Basic",
    expiry_option: "1",
    custom_expiry_date: "",
  });

  // Load vendor relationships and invitations
  const loadVendorRelationships = useCallback(async () => {
    setLoading(true);
    try {
      const vendorRelationships = await circleVendorService.getVendorRelationships();
      setVendors(vendorRelationships);
    } catch (error: any) {
      console.error("Failed to load vendor relationships:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to load vendor relationships. Please try again.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVendorInvitations = useCallback(async () => {
    setInvitationsLoading(true);
    try {
      // TODO: Replace with actual API call when backend is ready
      // For now, extract invitations from vendor relationships
      const pendingInvitations: VendorInvitation[] = vendors
        .filter((v) => !v.vendor_tenant && v.invitation_data)
        .map((v) => ({
          id: v.invitation_data!.id,
          vendor_name: v.vendor_organization_name || "Unknown Organization",
          vendor_code: v.vendor_code,
          contact_name: v.contact_person_name || "Unknown Contact",
          email: v.vendor_email || "no-email@example.com",
          contact_access_level: v.contact_access_level,
          status: v.invitation_data!.status as any,
          invited_at: v.invitation_data!.invited_at || v.created_at,
          expires_at: v.invitation_data!.expires_at || "",
          invitation_token: v.invitation_data!.token,
        }));

      setInvitations(pendingInvitations);
    } catch (error: any) {
      console.error("Failed to load vendor invitations:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to load vendor invitations. Please try again.",
        severity: "error",
      });
    } finally {
      setInvitationsLoading(false);
    }
  }, [vendors]);

  useEffect(() => {
    loadVendorRelationships();
  }, [loadVendorRelationships]);

  useEffect(() => {
    loadVendorInvitations();
  }, [loadVendorInvitations]);

  // Initialize custom expiry date
  useEffect(() => {
    const now = new Date();
    const defaultExpiry = new Date(now.getTime() + 1 * 1000); // 1 days from now
    const year = defaultExpiry.getFullYear();
    const month = String(defaultExpiry.getMonth() + 1).padStart(2, "0");
    const day = String(defaultExpiry.getDate()).padStart(2, "0");
    const hours = String(defaultExpiry.getHours()).padStart(2, "0");
    const minutes = String(defaultExpiry.getMinutes()).padStart(2, "0");

    setInviteForm((prev) => ({
      ...prev,
      custom_expiry_date: `${year}-${month}-${day}T${hours}:${minutes}`,
    }));
  }, []);

  // Calculate vendor metrics using accurate tenant registration status
  const vendorMetrics = {
    total_vendors: vendors.length,
    // Active vendors: those with approved tenant registration
    active_vendors: vendors.filter((v) => v.vendor_tenant && v.vendor_tenant_data?.registration_status === "Approved" && v.vendor_tenant_data?.is_active === true).length,
    // Pending vendors: those with pending tenant registration
    pending_vendors: vendors.filter((v) => v.vendor_tenant && v.vendor_tenant_data?.registration_status === "Pending").length,
    // Rejected vendors: those with rejected tenant registration
    rejected_vendors: vendors.filter((v) => v.vendor_tenant && v.vendor_tenant_data?.registration_status === "Rejected").length,
    pending_invitations: invitations.filter((i) => i.status === "Pending").length,
    expired_invitations: invitations.filter((i) => i.status === "Expired").length,
    onboarded_vendors: vendors.filter((v) => v.vendor_tenant).length,
    average_performance: vendors.filter((v) => v.performance_rating).reduce((sum, v) => sum + (v.performance_rating || 0), 0) / vendors.filter((v) => v.performance_rating).length || 0,
    high_performers: vendors.filter((v) => v.performance_rating && v.performance_rating >= 4.0).length,
    // Note: billing information moved to separate billing system
    total_monthly_spend: 0, // Will be calculated from billing system later
  };

  // Filter vendors based on search and status
  const getFilteredVendors = useCallback(() => {
    let filtered = [...vendors];

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (vendor) =>
          vendor.vendor_organization_name?.toLowerCase().includes(search) ||
          vendor.vendor_code?.toLowerCase().includes(search) ||
          vendor.contact_person_name?.toLowerCase().includes(search) ||
          vendor.vendor_email?.toLowerCase().includes(search)
      );
    }

    // Apply status filter using consolidated status
    if (statusFilter) {
      filtered = filtered.filter((vendor) => {
        const consolidatedStatus = getConsolidatedVendorStatus(vendor);
        return consolidatedStatus.label === statusFilter;
      });
    }

    // Only show vendors that have completed onboarding (have vendor_tenant)
    filtered = filtered.filter((vendor) => vendor.vendor_tenant);

    return filtered;
  }, [vendors, searchTerm, statusFilter]);

  const handleInviteVendor = async () => {
    try {
      // Form validation
      if (!inviteForm.vendor_name.trim()) {
        setSnackbar({ open: true, message: "Vendor name is required", severity: "error" });
        return;
      }
      if (!inviteForm.vendor_code.trim()) {
        setSnackbar({ open: true, message: "Vendor code is required", severity: "error" });
        return;
      }
      if (!inviteForm.contact_person_name.trim()) {
        setSnackbar({ open: true, message: "Contact person name is required", severity: "error" });
        return;
      }
      if (!inviteForm.vendor_email.trim()) {
        setSnackbar({ open: true, message: "Vendor email is required", severity: "error" });
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inviteForm.vendor_email)) {
        setSnackbar({ open: true, message: "Please enter a valid email address", severity: "error" });
        return;
      }

      // Custom expiry date validation
      if (inviteForm.expiry_option === "custom") {
        const customDate = new Date(inviteForm.custom_expiry_date);
        const now = new Date();
        if (customDate <= now) {
          setSnackbar({ open: true, message: "Expiry date must be in the future", severity: "error" });
          return;
        }
      }

      // Calculate expiry date based on selection
      let expires_at;
      if (inviteForm.expiry_option === "custom") {
        expires_at = new Date(inviteForm.custom_expiry_date).toISOString();
      } else {
        const daysToAdd = parseInt(inviteForm.expiry_option);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + daysToAdd);
        expires_at = expiryDate.toISOString();
      }

      const inviteData: VendorInviteRequest = {
        vendor_name: inviteForm.vendor_name,
        vendor_code: inviteForm.vendor_code,
        contact_person_name: inviteForm.contact_person_name,
        vendor_email: inviteForm.vendor_email,
        contact_access_level: inviteForm.contact_access_level,
        invitation_expires_at: expires_at,
      };

      await circleVendorService.inviteVendor(inviteData);

      // Reset form
      setInviteForm({
        vendor_name: "",
        vendor_code: "",
        contact_person_name: "",
        vendor_email: "",
        contact_access_level: "Basic",
        expiry_option: "7",
        custom_expiry_date: "",
      });

      setInviteDialogOpen(false);
      loadVendorRelationships(); // Reload to show new invitation
      setSnackbar({ open: true, message: "Vendor invited successfully!", severity: "success" });
    } catch (error: any) {
      console.error("Failed to invite vendor:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to invite vendor. Please try again.",
        severity: "error",
      });
    }
  };

  const getInvitationStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "warning";
      case "Accepted":
        return "success";
      case "Expired":
        return "error";
      case "Cancelled":
        return "default";
      default:
        return "default";
    }
  };

  // Get consolidated vendor status for single chip display
  const getConsolidatedVendorStatus = (vendor: VendorRelationship) => {
    // Priority order: Activation status > Registration status > Relationship status
    if (vendor.vendor_tenant_data) {
      const regStatus = vendor.vendor_tenant_data.registration_status;
      const activationStatus = vendor.vendor_tenant_data.activation_status;
      const isActive = vendor.vendor_tenant_data.is_active;

      // Check activation status first
      if (activationStatus === "Suspended") {
        return { label: "Suspended", color: theme.palette.warning.main };
      } else if (regStatus === "Approved" && activationStatus === "Active" && isActive) {
        return { label: "Active", color: theme.palette.success.main };
      } else if (regStatus === "Rejected") {
        return { label: "Rejected", color: theme.palette.error.main };
      } else if (regStatus === "Pending") {
        return { label: "Pending Approval", color: theme.palette.info.main };
      }
    }

    // Fallback to relationship status for edge cases
    const relStatus = vendor.relationship_status;
    if (relStatus === "Active") {
      return { label: "Active", color: theme.palette.success.main };
    } else if (relStatus === "Suspended") {
      return { label: "Suspended", color: theme.palette.warning.main };
    } else if (relStatus === "Terminated") {
      return { label: "Terminated", color: theme.palette.error.main };
    } else {
      return { label: "Pending Approval", color: theme.palette.info.main };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Time calculation function
  const getTimeLeft = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();

    if (diffMs <= 0) {
      return "Expired";
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ${diffHours % 24}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  };

  const handleTimeRefresh = () => {
    setTimeRefreshKey((prev) => prev + 1);
    loadVendorInvitations();
  };

  // Complete refresh function for invitations
  const handleInvitationsRefresh = useCallback(async () => {
    setInvitationsLoading(true);
    try {
      // First reload vendor relationships to get fresh data
      await loadVendorRelationships();
      // loadVendorInvitations will be called automatically due to useEffect dependency
    } catch (error: any) {
      console.error("Failed to refresh invitations:", error);
      setSnackbar({
        open: true,
        message: "Failed to refresh invitations. Please try again.",
        severity: "error",
      });
      setInvitationsLoading(false);
    }
  }, [loadVendorRelationships]);

  // Menu handlers
  const handleVendorMenuOpen = (event: React.MouseEvent<HTMLElement>, vendor: VendorRelationship) => {
    setVendorMenuAnchor(event.currentTarget);
    setSelectedVendor(vendor);
  };

  const handleVendorMenuClose = () => {
    setVendorMenuAnchor(null);
    setSelectedVendor(null);
  };

  const handleInvitationMenuOpen = (event: React.MouseEvent<HTMLElement>, invitation: VendorInvitation) => {
    setInvitationMenuAnchor(event.currentTarget);
    setSelectedInvitation(invitation);
  };

  const handleInvitationMenuClose = () => {
    setInvitationMenuAnchor(null);
    setSelectedInvitation(null);
  };

  // Invitation management handlers
  const handleResendInvitation = (invitation: VendorInvitation) => {
    setResendInvitation(invitation);
    setResendExpiryOption("1");
    const d = new Date();
    d.setSeconds(0, 0);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    setResendCustomExpiry(`${year}-${month}-${day}T${hours}:${minutes}`);
    setOpenResendDialog(true);
    handleInvitationMenuClose();
  };

  const handleCancelInvitation = async (invitation: VendorInvitation) => {
    try {
      const result = await circleVendorService.cancelInvitation(invitation.id);

      if (result.success) {
        setSnackbar({
          open: true,
          message: `Invitation cancelled for ${invitation.vendor_name}`,
          severity: "success",
        });
        await loadVendorRelationships();
      } else {
        throw new Error(result.message || "Failed to cancel invitation");
      }

      handleInvitationMenuClose();
    } catch (error: any) {
      console.error("Error cancelling invitation:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to cancel invitation",
        severity: "error",
      });
    }
  };

  const handleDeleteInvitation = async (invitation: VendorInvitation) => {
    try {
      if (invitation.status !== "Cancelled" && invitation.status !== "Expired") {
        setSnackbar({
          open: true,
          message: "Only cancelled or expired invitations can be deleted",
          severity: "error",
        });
        return;
      }

      const result = await circleVendorService.deleteInvitation(invitation.id);

      if (result.success) {
        setSnackbar({
          open: true,
          message: `Invitation permanently deleted for ${invitation.vendor_name}`,
          severity: "success",
        });
        await loadVendorRelationships();
      } else {
        throw new Error(result.message || "Failed to delete invitation");
      }

      handleInvitationMenuClose();
    } catch (error: any) {
      console.error("Error deleting invitation:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to delete invitation",
        severity: "error",
      });
    }
  };

  const handleRevokeCancellation = async (invitation: VendorInvitation) => {
    try {
      if (invitation.status !== "Cancelled") {
        setSnackbar({
          open: true,
          message: "Only cancelled invitations can have their cancellation revoked",
          severity: "error",
        });
        return;
      }

      const result = await circleVendorService.revokeCancellation(invitation.id);

      if (result.success) {
        setSnackbar({
          open: true,
          message: `Cancellation revoked for ${invitation.vendor_name}. Invitation is now active again.`,
          severity: "success",
        });
        await loadVendorRelationships();
      } else {
        throw new Error(result.message || "Failed to revoke cancellation");
      }

      handleInvitationMenuClose();
    } catch (error: any) {
      console.error("Error revoking cancellation:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to revoke cancellation",
        severity: "error",
      });
    }
  };

  const handleConfirmResendInvitation = async () => {
    try {
      if (!resendInvitation) {
        setSnackbar({
          open: true,
          message: "No invitation found to resend",
          severity: "error",
        });
        return;
      }

      let expiryDate: Date;
      if (resendExpiryOption === "custom") {
        expiryDate = new Date(resendCustomExpiry);
        if (expiryDate <= new Date()) {
          setSnackbar({
            open: true,
            message: "Expiry date must be in the future",
            severity: "error",
          });
          return;
        }
      } else {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + parseInt(resendExpiryOption));
      }

      const result = await circleVendorService.resendInvitation(resendInvitation.id, {
        expires_at: expiryDate.toISOString(),
      });

      if (result.success) {
        setSnackbar({
          open: true,
          message: `Invitation resent to ${resendInvitation.vendor_name}`,
          severity: "success",
        });

        await loadVendorRelationships();
        setOpenResendDialog(false);
        setResendInvitation(null);
      } else {
        throw new Error(result.message || "Failed to resend invitation");
      }
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to resend invitation",
        severity: "error",
      });
    }
  };

  // Helper function to safely get vendor ID as string
  const getVendorIdString = (vendor: VendorRelationship): string => {
    if (typeof vendor.id === "string") {
      return vendor.id;
    }
    return String(vendor.id || "");
  };

  if (loading && vendors.length === 0) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Vendor Management
        </Typography>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading vendor data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Vendor Management
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage vendor relationships, invitations, and performance for {currentTenant?.circle_name} circle
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setInviteDialogOpen(true)} sx={{ borderRadius: 2 }}>
          Invite Vendor
        </Button>
      </Box>

      {/* Vendor Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Vendors
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {vendorMetrics.onboarded_vendors}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {vendorMetrics.active_vendors} active
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                  <Business />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Pending Invitations
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="warning.main">
                    {vendorMetrics.pending_invitations}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {vendorMetrics.expired_invitations} expired
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                  <Assessment />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Pending Approval
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="info.main">
                    {vendorMetrics.pending_vendors}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Awaiting internal review
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.info.main }}>
                  <Assignment />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Rejected Vendors
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="error.main">
                    {vendorMetrics.rejected_vendors}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Registration denied
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.error.main }}>
                  <Delete />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Avg Performance
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="success.main">
                    {vendorMetrics.average_performance.toFixed(1)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {vendorMetrics.high_performers} high performers
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                  <Star />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Monthly Spend
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="secondary.main">
                    {formatCurrency(vendorMetrics.total_monthly_spend)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Across all vendors
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                  <MonetizationOn />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Performance Trend
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="info.main">
                    +8.5%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    This month
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.info.main }}>
                  <TrendingUp />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Loading Indicator for Data Refresh */}
      {loading && vendors.length > 0 && <LinearProgress sx={{ mb: 2 }} />}

      {/* Vendor Invitations Section */}
      <Paper elevation={3} sx={{ mb: 4 }}>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="h6" fontWeight={600}>
              Vendor Invitations
            </Typography>
            <Button variant="outlined" size="small" onClick={handleInvitationsRefresh} disabled={invitationsLoading} sx={{ borderRadius: 2 }}>
              Refresh
            </Button>
          </Box>

          {invitationsLoading ? (
            <LinearProgress />
          ) : invitations.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No vendor invitations found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Use the "Invite Vendor" button to send new invitations.
              </Typography>
            </Box>
          ) : (
            <TableContainer
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                "& .MuiTableHead-root": {
                  backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
                },
                "& .MuiTableRow-hover:hover": {
                  backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
                },
              }}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: theme.palette.text.primary }}>Vendor Details</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: theme.palette.text.primary }}>Contact Person</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                      Status
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                      Access Level
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                      Expires
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                        Time Left
                        <IconButton size="small" onClick={handleTimeRefresh} title="Refresh time calculations">
                          🔄
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Avatar sx={{ bgcolor: theme.palette.primary.main }}>{invitation.vendor_name.charAt(0)}</Avatar>
                          <Box>
                            <Typography variant="body1" fontWeight={600} color="text.primary">
                              {invitation.vendor_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Code: {invitation.vendor_code}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              📧 {invitation.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.primary">
                          {invitation.contact_name}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={invitation.status}
                          size="small"
                          sx={{
                            bgcolor:
                              invitation.status === "Pending"
                                ? theme.palette.warning.main
                                : invitation.status === "Accepted"
                                ? theme.palette.primary.main
                                : invitation.status === "Expired"
                                ? theme.palette.error.main
                                : theme.palette.grey[600],
                            color: "white",
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={invitation.contact_access_level} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="text.primary">
                          {formatDate(invitation.expires_at)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(invitation.expires_at).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={600} color={getTimeLeft(invitation.expires_at) === "Expired" ? "error.main" : "text.primary"} key={timeRefreshKey}>
                          {getTimeLeft(invitation.expires_at)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton onClick={(e) => handleInvitationMenuOpen(e, invitation)} size="small">
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Paper>

      {/* Vendors Section */}
      <Paper elevation={3}>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="h6" fontWeight={600}>
              Active Vendors
            </Typography>
            <Button variant="outlined" size="small" onClick={loadVendorRelationships} disabled={loading} sx={{ borderRadius: 2 }}>
              Refresh
            </Button>
          </Box>

          {/* Filters */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl
                fullWidth
                size="small"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "transparent",
                    "& fieldset": {
                      borderColor: theme.palette.mode === "dark" ? theme.palette.grey[600] : theme.palette.grey[300],
                    },
                    "&:hover fieldset": {
                      borderColor: theme.palette.mode === "dark" ? theme.palette.grey[500] : theme.palette.grey[400],
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: theme.palette.text.secondary,
                  },
                }}
              >
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter || ""} onChange={(e) => setStatusFilter(e.target.value as string)} label="Status">
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Pending Approval">Pending Approval</MenuItem>
                  <MenuItem value="Rejected">Rejected</MenuItem>
                  <MenuItem value="Suspended">Suspended</MenuItem>
                  <MenuItem value="Terminated">Terminated</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 9 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search vendors by name, code, contact, or email..."
                value={searchTerm || ""}
                onChange={(e) => setSearchTerm(e.target.value || "")}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "transparent",
                    "& fieldset": {
                      borderColor: theme.palette.mode === "dark" ? theme.palette.grey[600] : theme.palette.grey[300],
                    },
                    "&:hover fieldset": {
                      borderColor: theme.palette.mode === "dark" ? theme.palette.grey[500] : theme.palette.grey[400],
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                  "& .MuiInputBase-input::placeholder": {
                    color: theme.palette.text.secondary,
                    opacity: 1,
                  },
                }}
                InputProps={{
                  startAdornment: <Search fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />,
                }}
              />
            </Grid>
          </Grid>

          {/* Vendors Table */}
          {getFilteredVendors().length === 0 && !loading ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <Business sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No vendors found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {vendors.length === 0 ? "Start building your vendor network by inviting service providers to your circle" : "Try adjusting your search criteria or filters"}
              </Typography>
              {vendors.length === 0 && (
                <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setInviteDialogOpen(true)}>
                  Invite Your First Vendor
                </Button>
              )}
            </Box>
          ) : (
            <TableContainer
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                "& .MuiTableHead-root": {
                  backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
                },
                "& .MuiTableRow-hover:hover": {
                  backgroundColor: theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
                },
              }}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: theme.palette.text.primary }}>Vendor Details</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: theme.palette.text.primary }}>Contact Information</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                      Status
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                      Performance
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                      Access Level
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                      Joined Date
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getFilteredVendors().map((vendor) => (
                    <TableRow key={vendor.id} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Avatar sx={{ bgcolor: theme.palette.primary.main }}>{vendor.vendor_organization_name ? vendor.vendor_organization_name.charAt(0) : vendor.vendor_code.charAt(0)}</Avatar>
                          <Box>
                            <Typography variant="body1" fontWeight={600} color="text.primary">
                              {vendor.vendor_organization_name || "Unknown Organization"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Code: {vendor.vendor_code} • ID: {getVendorIdString(vendor).slice(-8)}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" color="text.primary">
                            {vendor.contact_person_name || "Not specified"}
                          </Typography>
                          {vendor.vendor_email && (
                            <Typography variant="caption" color="text.secondary">
                              {vendor.vendor_email}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        {(() => {
                          const status = getConsolidatedVendorStatus(vendor);
                          return (
                            <Chip
                              label={status.label}
                              size="small"
                              sx={{
                                bgcolor: status.color,
                                color: "white",
                                fontWeight: 600,
                                minWidth: 120,
                              }}
                            />
                          );
                        })()}
                      </TableCell>
                      <TableCell align="center">
                        {vendor.performance_rating ? (
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                            <Star sx={{ fontSize: 16, color: "warning.main" }} />
                            <Typography variant="body2" fontWeight={600} color="text.primary">
                              {vendor.performance_rating.toFixed(1)}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Not rated
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="text.primary">
                          {vendor.contact_access_level}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="text.primary">
                          {formatDate(vendor.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton onClick={(e) => handleVendorMenuOpen(e, vendor)} size="small">
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Paper>

      {/* Vendor Invitation Dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Invite Vendor to {currentTenant?.circle_name}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Basic Information */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Vendor Information
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Vendor Name" value={inviteForm.vendor_name} onChange={(e) => setInviteForm({ ...inviteForm, vendor_name: e.target.value })} fullWidth required />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Vendor Code"
                value={inviteForm.vendor_code}
                onChange={(e) => setInviteForm({ ...inviteForm, vendor_code: e.target.value })}
                fullWidth
                required
                helperText="Your internal reference code for this vendor"
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Contact Person Name"
                value={inviteForm.contact_person_name}
                onChange={(e) => setInviteForm({ ...inviteForm, contact_person_name: e.target.value })}
                fullWidth
                required
                helperText="Name of the person responsible for this vendor relationship"
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Vendor Email"
                type="email"
                value={inviteForm.vendor_email}
                onChange={(e) => setInviteForm({ ...inviteForm, vendor_email: e.target.value })}
                fullWidth
                required
                helperText="Invitation will be sent to this email address"
              />
            </Grid>

            {/* Access Configuration */}
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Access Configuration
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Contact Access Level</InputLabel>
                <Select value={inviteForm.contact_access_level} onChange={(e) => setInviteForm({ ...inviteForm, contact_access_level: e.target.value })}>
                  <MenuItem value="Basic">Basic - Limited contact information</MenuItem>
                  <MenuItem value="Full">Full - Complete contact access</MenuItem>
                  <MenuItem value="Restricted">Restricted - Minimal contact details</MenuItem>
                  <MenuItem value="None">None - No direct contact access</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Expiry Date */}
            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                Invitation Expiry
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Invitation Expires In</InputLabel>
                <Select value={inviteForm.expiry_option} onChange={(e) => setInviteForm({ ...inviteForm, expiry_option: e.target.value as "1" | "3" | "7" | "14" | "30" | "custom" })}>
                  <MenuItem value="1">1 Day</MenuItem>
                  <MenuItem value="3">3 Days</MenuItem>
                  <MenuItem value="7">7 Days</MenuItem>
                  <MenuItem value="14">14 Days</MenuItem>
                  <MenuItem value="30">30 Days</MenuItem>
                  <MenuItem value="custom">Custom Date</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {inviteForm.expiry_option === "custom" && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Custom Expiry Date"
                  type="datetime-local"
                  value={inviteForm.custom_expiry_date}
                  onChange={(e) => setInviteForm({ ...inviteForm, custom_expiry_date: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleInviteVendor} disabled={!inviteForm.vendor_name || !inviteForm.vendor_code || !inviteForm.vendor_email}>
            Send Invitation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Vendor Actions Menu */}
      <Menu anchorEl={vendorMenuAnchor} open={Boolean(vendorMenuAnchor)} onClose={handleVendorMenuClose}>
        <MenuItem onClick={handleVendorMenuClose}>
          <Visibility sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={handleVendorMenuClose}>
          <Edit sx={{ mr: 1 }} />
          Edit Relationship
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleVendorMenuClose}>
          <Assessment sx={{ mr: 1 }} />
          Performance Report
        </MenuItem>
        <MenuItem onClick={handleVendorMenuClose}>
          <Assignment sx={{ mr: 1 }} />
          Contract Details
        </MenuItem>
        <Divider />
        {selectedVendor?.relationship_status === "Active" ? (
          <MenuItem onClick={handleVendorMenuClose} sx={{ color: "warning.main" }}>
            <Pause sx={{ mr: 1 }} />
            Suspend Vendor
          </MenuItem>
        ) : selectedVendor?.relationship_status === "Suspended" ? (
          <MenuItem onClick={handleVendorMenuClose} sx={{ color: "success.main" }}>
            <PlayArrow sx={{ mr: 1 }} />
            Reactivate Vendor
          </MenuItem>
        ) : selectedVendor?.relationship_status === "Pending_Approval" ? (
          <MenuItem onClick={handleVendorMenuClose} sx={{ color: "success.main" }}>
            <CheckCircleOutline sx={{ mr: 1 }} />
            Approve Vendor
          </MenuItem>
        ) : null}
        <MenuItem onClick={handleVendorMenuClose} sx={{ color: "error.main" }}>
          <Delete sx={{ mr: 1 }} />
          Terminate Relationship
        </MenuItem>
      </Menu>

      {/* Vendor Invitation Actions Menu */}
      <Menu anchorEl={invitationMenuAnchor} open={Boolean(invitationMenuAnchor)} onClose={handleInvitationMenuClose}>
        {/* Show different options based on invitation status */}
        {selectedInvitation?.status === "Pending" && [
          <MenuItem key="resend" onClick={() => selectedInvitation && handleResendInvitation(selectedInvitation)}>
            <Email fontSize="small" sx={{ mr: 1 }} />
            Resend Invitation
          </MenuItem>,
          <MenuItem key="copy" onClick={handleInvitationMenuClose}>
            <Visibility fontSize="small" sx={{ mr: 1 }} />
            Copy Invitation Link
          </MenuItem>,
          <Divider key="divider1" />,
          <MenuItem key="cancel" onClick={() => selectedInvitation && handleCancelInvitation(selectedInvitation)} sx={{ color: "warning.main" }}>
            <Pause fontSize="small" sx={{ mr: 1 }} />
            Cancel Invitation
          </MenuItem>,
        ]}

        {selectedInvitation?.status === "Accepted" && [
          <MenuItem key="view" onClick={handleInvitationMenuClose}>
            <Visibility fontSize="small" sx={{ mr: 1 }} />
            View Onboarding Status
          </MenuItem>,
          <Divider key="divider2" />,
          <MenuItem key="cancel" onClick={() => selectedInvitation && handleCancelInvitation(selectedInvitation)} sx={{ color: "warning.main" }}>
            <Pause fontSize="small" sx={{ mr: 1 }} />
            Cancel Invitation
          </MenuItem>,
        ]}

        {selectedInvitation?.status === "Cancelled" && [
          <MenuItem key="revoke" onClick={() => selectedInvitation && handleRevokeCancellation(selectedInvitation)} sx={{ color: "success.main" }}>
            <PlayArrow fontSize="small" sx={{ mr: 1 }} />
            Revoke Cancellation
          </MenuItem>,
          <Divider key="divider-revoke" />,
          <MenuItem key="resend" onClick={() => selectedInvitation && handleResendInvitation(selectedInvitation)} sx={{ color: "primary.main" }}>
            <Email fontSize="small" sx={{ mr: 1 }} />
            Resend Invitation
          </MenuItem>,
          <MenuItem key="copy" onClick={handleInvitationMenuClose}>
            <Visibility fontSize="small" sx={{ mr: 1 }} />
            Copy Invitation Link
          </MenuItem>,
          <Divider key="divider3" />,
          <MenuItem key="delete" onClick={() => selectedInvitation && handleDeleteInvitation(selectedInvitation)} sx={{ color: "error.main" }}>
            <Delete fontSize="small" sx={{ mr: 1 }} />
            Delete Invitation
          </MenuItem>,
        ]}

        {selectedInvitation?.status === "Expired" && [
          <MenuItem key="resend" onClick={() => selectedInvitation && handleResendInvitation(selectedInvitation)} sx={{ color: "primary.main" }}>
            <Email fontSize="small" sx={{ mr: 1 }} />
            Resend Invitation
          </MenuItem>,
          <MenuItem key="copy" onClick={handleInvitationMenuClose}>
            <Visibility fontSize="small" sx={{ mr: 1 }} />
            Copy Invitation Link
          </MenuItem>,
          <Divider key="divider4" />,
          <MenuItem key="delete" onClick={() => selectedInvitation && handleDeleteInvitation(selectedInvitation)} sx={{ color: "error.main" }}>
            <Delete fontSize="small" sx={{ mr: 1 }} />
            Delete Invitation
          </MenuItem>,
        ]}
      </Menu>

      {/* Resend Invitation Dialog */}
      <Dialog
        open={openResendDialog}
        onClose={() => {
          setOpenResendDialog(false);
          setResendInvitation(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Resend Vendor Invitation</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Set a new expiry date and time for this invitation to <strong>{resendInvitation?.vendor_name}</strong>.
          </Typography>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Expires In</InputLabel>
                <Select value={resendExpiryOption} onChange={(e) => setResendExpiryOption(e.target.value)} label="Expires In">
                  <MenuItem value="1">1 Day</MenuItem>
                  <MenuItem value="3">3 Days</MenuItem>
                  <MenuItem value="7">7 Days</MenuItem>
                  <MenuItem value="14">14 Days</MenuItem>
                  <MenuItem value="30">30 Days</MenuItem>
                  <MenuItem value="custom">Custom Date & Time</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {resendExpiryOption === "custom" && (
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Custom Expiry Date & Time"
                  type="datetime-local"
                  value={resendCustomExpiry}
                  onChange={(e) => setResendCustomExpiry(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenResendDialog(false);
              setResendInvitation(null);
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleConfirmResendInvitation}>
            Resend Invitation
          </Button>
        </DialogActions>
      </Dialog>

      <ModernSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} />
    </Box>
  );
};

export default CircleVendorManagementPage;
