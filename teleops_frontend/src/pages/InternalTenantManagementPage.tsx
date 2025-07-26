import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  useTheme,
  Divider,
  FormControl,
  InputLabel,
  Select,
  Tabs,
  Tab,
  LinearProgress,
  Badge,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Drawer,
  Alert,
} from "@mui/material";
import {
  Search,
  Business,
  Person,
  Email,
  Phone,
  MoreVert,
  Edit,
  CheckCircle,
  Pause,
  PlayArrow,
  Visibility,
  Delete,
  MonetizationOn,
  SupportAgent,
  Schedule,
  PersonAdd,
  Close,
  DashboardCustomize,
  Warning,
  Help,
  Assignment,
  OpenInNew,
} from "@mui/icons-material";
import { InternalAPIService, TenantData } from "../services/internalApi";
import { ModernSnackbar } from "../components";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const InternalTenantManagementPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState(0);
  const [allTenants, setAllTenants] = useState<TenantData[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTenant, setSelectedTenant] = useState<TenantData | null>(null);
  const [invitationAnchorEl, setInvitationAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedInvitation, setSelectedInvitation] = useState<any | null>(null);
  const [openInviteDialog, setOpenInviteDialog] = useState(false);
  const [openDetailsDrawer, setOpenDetailsDrawer] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState<string | null>(null);
  const [openWarningDialog, setOpenWarningDialog] = useState(false);
  const [openClarificationDialog, setOpenClarificationDialog] = useState(false);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [tenantToReject, setTenantToReject] = useState<TenantData | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" | "warning" | "info" });

  // Client-side filtering states
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [inviteForm, setInviteForm] = useState({
    organization_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    tenant_type: "Corporate" as "Corporate" | "Circle" | "Vendor",
    expiry_option: "1" as "1" | "2" | "3" | "custom",
    custom_expiry_date: "",
  });

  const [warningForm, setWarningForm] = useState({
    title: "",
    description: "",
    required_action: "",
    issue_type: "Warning" as "Warning" | "Business_Verification" | "Compliance_Review" | "Documentation_Missing",
    severity: "Medium" as "Low" | "Medium" | "High" | "Critical",
    required_documents: [] as string[],
    due_days: "7",
  });

  const [clarificationForm, setClarificationForm] = useState({
    title: "",
    description: "",
    required_action: "",
    issue_type: "Clarification_Required" as "Clarification_Required" | "Business_Verification" | "Compliance_Review",
    severity: "Low" as "Low" | "Medium" | "High" | "Critical",
    due_days: "14",
  });

  // Add state for resend expired invitation dialog
  const [openResendDialog, setOpenResendDialog] = useState(false);
  const [resendInvitation, setResendInvitation] = useState<any | null>(null);
  const [resendExpiryOption, setResendExpiryOption] = useState("1" as "1" | "3" | "7" | "14" | "custom");
  const [resendCustomExpiry, setResendCustomExpiry] = useState(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    // Use local time instead of UTC
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });

  // Client-side filtering functions
  const getFilteredTenants = useCallback(() => {
    let filtered = [...allTenants];

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (tenant) =>
          tenant.organization_name?.toLowerCase().includes(search) ||
          tenant.primary_contact_name?.toLowerCase().includes(search) ||
          tenant.primary_contact_email?.toLowerCase().includes(search) ||
          tenant.tenant_type?.toLowerCase().includes(search)
      );
    }

    // Apply type filter
    if (typeFilter) {
      filtered = filtered.filter((tenant) => tenant.tenant_type === typeFilter);
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter((tenant) => tenant.activation_status === statusFilter);
    }

    // Apply tab-based filtering
    if (selectedTab === 1) {
      // Active tenants
      filtered = filtered.filter((tenant) => tenant.activation_status === "Active");
    } else if (selectedTab === 2) {
      // Suspended tenants
      filtered = filtered.filter((tenant) => tenant.activation_status === "Suspended");
    } else if (selectedTab === 3) {
      // Pending Approval: Inactive status + Pending registration
      filtered = filtered.filter((tenant) => tenant.activation_status === "Inactive" && tenant.registration_status === "Pending");
    } else if (selectedTab === 4) {
      // Rejected: Inactive status + Rejected registration
      filtered = filtered.filter((tenant) => tenant.activation_status === "Inactive" && tenant.registration_status === "Rejected");
    }
    // Tab 0 (All) shows all filtered tenants

    return filtered;
  }, [allTenants, searchTerm, typeFilter, statusFilter, selectedTab]);

  // Calculate badge counts from all loaded tenants
  const tenantMetrics = {
    totalTenants: allTenants.length,
    activeTenants: allTenants.filter((t) => t.activation_status === "Active").length,
    suspendedTenants: allTenants.filter((t) => t.activation_status === "Suspended").length,
    pendingApprovals: allTenants.filter((t) => t.activation_status === "Inactive" && t.registration_status === "Pending").length,
    rejectedTenants: allTenants.filter((t) => t.activation_status === "Inactive" && t.registration_status === "Rejected").length,
    totalRevenue: allTenants.reduce((sum, t) => sum + (t?.monthly_revenue || 0), 0),
    totalUsers: allTenants.reduce((sum, t) => sum + (t?.users || 0), 0),
    totalTickets: allTenants.reduce((sum, t) => sum + (t?.support_tickets || 0), 0),
    trialTenants: allTenants.filter((t) => t?.is_trial).length,
  };

  // Load all tenants from backend API (simplified)
  const loadAllTenants = useCallback(async () => {
    try {
      setLoading(true);
      const response = await InternalAPIService.getTenants({});

      if (response.success && response.data) {
        const responseData = response.data as any;
        const results = responseData.tenants || responseData.results || responseData || [];

        // Enrich tenant data with missing fields expected by frontend
        const enrichedTenants = (Array.isArray(results) ? results : []).map((tenant: any) => {
          const userCount = tenant.user_count || tenant.users || 0;

          return {
            ...tenant,
            users: userCount,
            support_tickets: tenant.support_tickets || 0,
            monthly_revenue: tenant.monthly_revenue || 0,
            overage_charges: tenant.overage_charges || 0,
            payment_status: tenant.payment_status || "paid",
            is_trial: tenant.is_trial || false,
            usage_metrics: {
              projects: tenant.usage_statistics?.projects_count || tenant.usage_metrics?.projects || 0,
              sites: tenant.usage_statistics?.sites_count || tenant.usage_metrics?.sites || 0,
              equipment: tenant.usage_statistics?.equipment_count || tenant.usage_metrics?.equipment || 0,
              storage_gb: tenant.usage_metrics?.storage_gb || 0,
              api_calls: tenant.usage_metrics?.api_calls || 0,
            },
          };
        });

        setAllTenants(enrichedTenants);
      } else {
        throw new Error(response.message || "Failed to load tenants");
      }
    } catch (error: any) {
      console.error("Error loading tenants:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to load tenants from server",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Load pending and cancelled invitations from backend API
  const loadInvitations = useCallback(async () => {
    try {
      setInvitationsLoading(true);
      // Load both pending and cancelled invitations
      const response = await InternalAPIService.getInvitations({
        // Remove status filter to get all invitations, or we can filter client-side
      });

      if (response.success && response.data) {
        const results = response.data.results || [];
        // Filter out completed invitations to keep UI clean (they're preserved for audit)
        const activeInvitations = results.filter((inv: any) => inv.status !== "Completed");
        setInvitations(Array.isArray(activeInvitations) ? activeInvitations : []);
      } else {
        setInvitations([]);
      }
    } catch (error: any) {
      console.error("Error loading invitations:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to load invitations from server",
        severity: "error",
      });
      setInvitations([]);
    } finally {
      setInvitationsLoading(false);
    }
  }, []);

  // Load tenants on component mount and when filters change
  useEffect(() => {
    loadAllTenants();
    loadInvitations();
  }, [loadAllTenants, loadInvitations]);

  // No debounced search - filtering is instant client-side
  // useEffect removed as we don't need to reload data for client-side filtering

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, tenant: TenantData) => {
    setAnchorEl(event.currentTarget);
    setSelectedTenant(tenant);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTenant(null);
  };

  const closeMenuOnly = () => {
    setAnchorEl(null);
    // Don't clear selectedTenant here - let the calling function manage it
  };

  const handleInvitationMenuClick = (event: React.MouseEvent<HTMLElement>, invitation: any) => {
    setInvitationAnchorEl(event.currentTarget);
    setSelectedInvitation(invitation);
  };

  const handleInvitationMenuClose = () => {
    setInvitationAnchorEl(null);
    setSelectedInvitation(null);
  };

  const handleSuspendTenant = async (tenant: TenantData) => {
    try {
      const response = await InternalAPIService.suspendTenant(tenant.id, "Suspended via internal portal");

      if (response.success) {
        setSnackbar({
          open: true,
          message: `Tenant ${tenant.organization_name} suspended successfully`,
          severity: "success",
        });
        // Reload tenants to get updated data
        await loadAllTenants();
      } else {
        throw new Error(response.message || "Failed to suspend tenant");
      }
      handleMenuClose();
    } catch (error: any) {
      console.error("Error suspending tenant:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to suspend tenant",
        severity: "error",
      });
    }
  };

  const handleReactivateTenant = async (tenant: TenantData) => {
    try {
      const response = await InternalAPIService.reactivateTenant(tenant.id);

      if (response.success) {
        setSnackbar({
          open: true,
          message: `Tenant ${tenant.organization_name} reactivated successfully`,
          severity: "success",
        });
        // Reload tenants to get updated data
        await loadAllTenants();
      } else {
        throw new Error(response.message || "Failed to reactivate tenant");
      }
      handleMenuClose();
    } catch (error: any) {
      console.error("Error reactivating tenant:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to reactivate tenant",
        severity: "error",
      });
    }
  };

  const handleCreateInvite = async () => {
    try {
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

      const invitationData = {
        email: inviteForm.contact_email,
        contact_name: inviteForm.contact_name,
        tenant_type: inviteForm.tenant_type,
        organization_name: inviteForm.organization_name,
        contact_phone: inviteForm.contact_phone,
        expires_at: expires_at,
      };

      const response = await InternalAPIService.createTenantInvitation(invitationData);

      if (response.success) {
        setSnackbar({
          open: true,
          message: `Invitation sent to ${inviteForm.contact_email}`,
          severity: "success",
        });
        setOpenInviteDialog(false);
        setInviteForm({
          organization_name: "",
          contact_name: "",
          contact_email: "",
          contact_phone: "",
          tenant_type: "Corporate",
          expiry_option: "1",
          custom_expiry_date: "",
        });
        // Automatically refresh the pending invitations table
        await loadInvitations();
      } else {
        throw new Error(response.message || "Failed to send invitation");
      }
    } catch (error: any) {
      console.error("Error creating invitation:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to send invitation",
        severity: "error",
      });
    }
  };

  // Handle resend invitation (now also opens dialog)
  const handleResendInvitation = (invitation: any) => {
    setResendInvitation(invitation);
    // Reset to default: 1 day
    setResendExpiryOption("1");
    const d = new Date();
    d.setSeconds(0, 0);
    // Use local time instead of UTC
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    setResendCustomExpiry(`${year}-${month}-${day}T${hours}:${minutes}`);
    setOpenResendDialog(true);
    handleInvitationMenuClose(); // Close the menu when opening dialog
  };

  // Handle cancel invitation (change status to Cancelled)
  const handleCancelInvitation = async (invitation: any) => {
    try {
      const response = await InternalAPIService.cancelInvitation(invitation.id);
      if (response.success) {
        setSnackbar({
          open: true,
          message: `Invitation cancelled for ${invitation.email}`,
          severity: "success",
        });
        await loadInvitations();
      } else {
        throw new Error(response.message || "Failed to cancel invitation");
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

  // Handle delete invitation (permanently remove cancelled invitations)
  const handleDeleteInvitation = async (invitation: any) => {
    try {
      if (invitation.status !== "Cancelled") {
        setSnackbar({
          open: true,
          message: "Only cancelled invitations can be deleted",
          severity: "error",
        });
        return;
      }

      const response = await InternalAPIService.deleteInvitation(invitation.id);
      if (response.success) {
        setSnackbar({
          open: true,
          message: `Invitation permanently deleted for ${invitation.email}`,
          severity: "success",
        });
        await loadInvitations();
      } else {
        throw new Error(response.message || "Failed to delete invitation");
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

  // Handle resend email verification for accepted invitations
  const handleResendEmailVerification = async (invitation: any) => {
    try {
      if (invitation.status !== "Accepted") {
        setSnackbar({
          open: true,
          message: "Email verification can only be resent for accepted invitations",
          severity: "error",
        });
        return;
      }

      // Call API to resend verification email
      const response = await InternalAPIService.resendEmailVerification(invitation.id);
      if (response.success) {
        setSnackbar({
          open: true,
          message: `Email verification resent to ${invitation.email}`,
          severity: "success",
        });
      } else {
        throw new Error(response.message || "Failed to resend email verification");
      }
      handleInvitationMenuClose();
    } catch (error: any) {
      console.error("Error resending email verification:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to resend email verification",
        severity: "error",
      });
    }
  };

  // Handle copy email verification link for accepted invitations
  const handleCopyEmailVerificationLink = async (invitation: any) => {
    try {
      if (invitation.status !== "Accepted") {
        setSnackbar({
          open: true,
          message: "Email verification link is only available for accepted invitations",
          severity: "error",
        });
        return;
      }

      // Get the verification token from backend
      const response = await InternalAPIService.getEmailVerificationToken(invitation.id);
      if (response.success && response.data?.token) {
        const verificationLink = `${window.location.origin}/verify-email?token=${response.data.token}`;

        navigator.clipboard
          .writeText(verificationLink)
          .then(() => {
            setSnackbar({
              open: true,
              message: `Email verification link copied to clipboard for ${invitation.email}`,
              severity: "success",
            });
          })
          .catch(() => {
            setSnackbar({
              open: true,
              message: `Email verification link: ${verificationLink}`,
              severity: "success",
            });
          });
      } else {
        throw new Error(response.message || "Failed to get email verification link");
      }
      handleInvitationMenuClose();
    } catch (error: any) {
      console.error("Error copying email verification link:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to get email verification link",
        severity: "error",
      });
    }
  };

  // Handle copy invitation link for pending invitation
  const handleCopyInvitationLink = async (invitation: any) => {
    try {
      const invitationLink = `${window.location.origin}/public/invitations/${invitation.invitation_token}/`;

      navigator.clipboard
        .writeText(invitationLink)
        .then(() => {
          setSnackbar({
            open: true,
            message: `Invitation link copied to clipboard for ${invitation.email}`,
            severity: "success",
          });
        })
        .catch(() => {
          setSnackbar({
            open: true,
            message: `Invitation link: ${invitationLink}`,
            severity: "success",
          });
        });
      handleInvitationMenuClose();
    } catch (error: any) {
      console.error("Error copying invitation link:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to copy invitation link",
        severity: "error",
      });
    }
  };

  // Calculate time left until expiry
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

  const handleShowInvitationLink = async (tenant: TenantData) => {
    try {
      // Fetch invitations for this tenant
      const response = await InternalAPIService.getInvitations({
        tenant_id: tenant.id,
        status: "active",
      });

      if (response.success && response.data?.results?.length > 0) {
        const invitation = response.data.results[0];
        const invitationLink = `${window.location.origin}/public/invitations/${invitation.invitation_token}/`;

        navigator.clipboard
          .writeText(invitationLink)
          .then(() => {
            setSnackbar({
              open: true,
              message: `Invitation link copied to clipboard for ${tenant.organization_name}`,
              severity: "success",
            });
          })
          .catch(() => {
            setSnackbar({
              open: true,
              message: `Invitation link: ${invitationLink}`,
              severity: "success",
            });
          });
      } else {
        setSnackbar({
          open: true,
          message: `No active invitation found for ${tenant.organization_name}. Please create a new invitation.`,
          severity: "error",
        });
      }
    } catch (error: any) {
      console.error("Error fetching invitation link:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to fetch invitation link",
        severity: "error",
      });
    }
    handleMenuClose();
  };

  const handleEmailVerification = async (tenant: TenantData) => {
    try {
      // Fetch email verification tokens for this tenant
      const response = await InternalAPIService.getEmailVerificationTokens({
        tenant_id: tenant.id,
      });

      if (response.success && response.data?.results?.length > 0) {
        const verification = response.data.results[0];
        const verificationLink = `${window.location.origin}/verify-email?token=${verification.verification_token}`;

        navigator.clipboard
          .writeText(verificationLink)
          .then(() => {
            setSnackbar({
              open: true,
              message: `Email verification link copied to clipboard for ${verification.user_name} (${verification.user_email})`,
              severity: "success",
            });
          })
          .catch(() => {
            setSnackbar({
              open: true,
              message: `Email verification link: ${verificationLink}`,
              severity: "success",
            });
          });
      } else {
        setSnackbar({
          open: true,
          message: `No active email verification token found for ${tenant.organization_name}. User may already be verified.`,
          severity: "error",
        });
      }
    } catch (error: any) {
      console.error("Error fetching verification link:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to fetch verification link",
        severity: "error",
      });
    }
    handleMenuClose();
  };

  // Handle email verification for pending invitations (by email)
  const handleInvitationEmailVerification = async (invitation: any) => {
    try {
      // For pending invitations, we can create a generic verification link or message
      setSnackbar({
        open: true,
        message: `Email verification will be available after ${invitation.contact_name} accepts the invitation and creates an account.`,
        severity: "success",
      });
      handleInvitationMenuClose();
    } catch (error: any) {
      console.error("Error with email verification:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to handle email verification",
        severity: "error",
      });
    }
  };

  // Handle revoke cancellation for cancelled invitations
  const handleRevokeCancellation = async (invitation: any) => {
    try {
      if (invitation.status !== "Cancelled") {
        setSnackbar({
          open: true,
          message: "Only cancelled invitations can have their cancellation revoked",
          severity: "error",
        });
        return;
      }

      const response = await InternalAPIService.revokeCancellation(invitation.id);
      if (response.success) {
        setSnackbar({
          open: true,
          message: `Cancellation revoked for ${invitation.email}. Invitation is now active again.`,
          severity: "success",
        });
        await loadInvitations();
      } else {
        throw new Error(response.message || "Failed to revoke cancellation");
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

  // Handle resend expired invitation
  const handleResendExpiredInvitation = (invitation: any) => {
    setResendInvitation(invitation);
    // Reset to default: 1 day
    setResendExpiryOption("1");
    const d = new Date();
    d.setSeconds(0, 0);
    // Use local time instead of UTC
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    setResendCustomExpiry(`${year}-${month}-${day}T${hours}:${minutes}`);
    setOpenResendDialog(true);
    handleInvitationMenuClose(); // Close the menu when opening dialog
  };

  // Handle raising warning for tenant
  const handleRaiseWarning = async () => {
    if (!selectedTenant) return;

    try {
      setSnackbar({
        open: true,
        message: `Warning raised for ${selectedTenant.organization_name}. Tenant can continue operations while addressing this issue.`,
        severity: "success",
      });

      setOpenWarningDialog(false);
      setWarningForm({
        title: "",
        description: "",
        required_action: "",
        issue_type: "Warning",
        severity: "Medium",
        required_documents: [],
        due_days: "7",
      });
      handleMenuClose();
    } catch (error: any) {
      console.error("Error raising warning:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to raise warning",
        severity: "error",
      });
    }
  };

  // Handle requesting clarification from tenant
  const handleRequestClarification = async () => {
    if (!selectedTenant) return;

    try {
      setSnackbar({
        open: true,
        message: `Clarification request sent to ${selectedTenant.organization_name}. Tenant can continue operations while responding.`,
        severity: "success",
      });

      setOpenClarificationDialog(false);
      setClarificationForm({
        title: "",
        description: "",
        required_action: "",
        issue_type: "Clarification_Required",
        severity: "Low",
        due_days: "14",
      });
      handleMenuClose();
    } catch (error: any) {
      console.error("Error requesting clarification:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to request clarification",
        severity: "error",
      });
    }
  };

  // Handle tenant approval
  const handleApproveTenant = async (tenant: TenantData) => {
    try {
      setApprovalLoading(tenant.id);
      const response = await InternalAPIService.approveTenant(tenant.id);

      if (response.success) {
        setSnackbar({
          open: true,
          message: `Tenant ${tenant.organization_name} approved successfully`,
          severity: "success",
        });

        // Add debug logging
        // Clear current tenant state to force fresh load
        setAllTenants([]);

        // Add a small delay to ensure backend transaction is committed
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Force reload tenants with current filters
        await loadAllTenants();
      } else {
        // Handle API errors with detailed messages
        const errorMessage = response.message || "Failed to approve tenant";
        const errorDetails = response.errors ? Object.values(response.errors).flat().join(", ") : "";

        throw new Error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
      }
    } catch (error: any) {
      console.error("Error approving tenant:", error);

      // Determine error type and show appropriate message
      let errorMessage = "Failed to approve tenant";

      if (error.name === "NetworkError" || error.code === "NETWORK_ERROR") {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to approve tenants.";
      } else if (error.response?.status === 404) {
        errorMessage = "Tenant not found. It may have been already processed.";
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || "Invalid request. Please check tenant data.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    } finally {
      setApprovalLoading(null);
    }
  };

  // Handle tenant rejection
  const handleRejectTenant = async (tenant: TenantData, reason?: string) => {
    try {
      setApprovalLoading(tenant.id);
      const response = await InternalAPIService.rejectTenant(tenant.id, reason);

      if (response.success) {
        setSnackbar({
          open: true,
          message: `Tenant ${tenant.organization_name} rejected`,
          severity: "success",
        });

        // Clear current tenant state to force fresh load
        setAllTenants([]);

        // Add a small delay to ensure backend transaction is committed
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Force reload tenants with current filters
        await loadAllTenants();
      } else {
        // Handle API errors with detailed messages
        const errorMessage = response.message || "Failed to reject tenant";
        const errorDetails = response.errors ? Object.values(response.errors).flat().join(", ") : "";

        throw new Error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
      }
    } catch (error: any) {
      console.error("Error rejecting tenant:", error);

      // Determine error type and show appropriate message
      let errorMessage = "Failed to reject tenant";

      if (error.name === "NetworkError" || error.code === "NETWORK_ERROR") {
        errorMessage = "Network error. Please check your connection and try again.";
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to reject tenants.";
      } else if (error.response?.status === 404) {
        errorMessage = "Tenant not found. It may have been already processed.";
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || "Invalid request. Please check tenant data.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    } finally {
      setApprovalLoading(null);
    }
  };

  // Handle cancel rejection (move rejected tenant back to pending)
  const handleCancelRejection = async (tenant: TenantData) => {
    try {
      setApprovalLoading(tenant.id);
      const response = await InternalAPIService.cancelRejection(tenant.id);

      if (response.success) {
        setSnackbar({
          open: true,
          message: `Rejection cancelled for ${tenant.organization_name}. Tenant moved back to pending approval.`,
          severity: "success",
        });

        // Clear current tenant state to force fresh load
        setAllTenants([]);

        // Add a small delay to ensure backend transaction is committed
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Force reload tenants with current filters
        await loadAllTenants();
      } else {
        throw new Error(response.message || "Failed to cancel rejection");
      }
    } catch (error: any) {
      console.error("Error cancelling rejection:", error);

      let errorMessage = "Failed to cancel rejection";

      if (error.response?.status === 403) {
        errorMessage = "You don't have permission to cancel rejections.";
      } else if (error.response?.status === 404) {
        errorMessage = "Tenant not found.";
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || "Only rejected tenants can have their rejection cancelled.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    } finally {
      setApprovalLoading(null);
    }
    handleMenuClose();
  };

  // Add state for forcing time refresh
  const [timeRefreshKey, setTimeRefreshKey] = useState(0);

  const handleTimeRefresh = () => {
    setTimeRefreshKey((prev) => prev + 1);
    // Optionally refresh the entire invitations data to get latest status
    loadInvitations();
  };

  const handleViewTenantDetails = async (tenant: TenantData) => {
    // Close menu first to prevent state conflicts, but preserve selectedTenant
    closeMenuOnly();

    try {
      setDetailsLoading(true);
      setOpenDetailsDrawer(true); // Open drawer immediately to show loading state
      const response = await InternalAPIService.getTenantDetail(tenant.id);

      if (response.success && response.data) {
        // Add missing fields that the frontend expects but backend doesn't provide
        const enrichedTenantData = {
          ...response.data,
          // Add fallback values for missing fields
          subscription_plan: response.data.subscription_plan || "Standard",
          users: response.data.user_count || 0,
          support_tickets: 0,
          monthly_revenue: 0,
          overage_charges: 0,
          payment_status: "paid" as "paid" | "pending" | "overdue" | "failed",
          is_trial: false,
          usage_metrics: {
            projects: response.data.usage_statistics?.projects_count || 0,
            sites: response.data.usage_statistics?.sites_count || 0,
            equipment: response.data.usage_statistics?.equipment_count || 0,
            tasks: response.data.usage_statistics?.tasks_count || 0,
          },
        };

        setSelectedTenant(enrichedTenantData);
      } else {
        throw new Error(response.message || "Failed to load tenant details");
      }
    } catch (error: any) {
      setOpenDetailsDrawer(false); // Close drawer on error
      setSnackbar({
        open: true,
        message: error.message || "Failed to load tenant details",
        severity: "error",
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return theme.palette.success.main;
      case "suspended":
        return theme.palette.warning.main;
      case "pending":
      case "inactive":
        return theme.palette.info.main;
      case "cancelled":
      case "rejected":
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return theme.palette.success.main;
      case "pending":
        return theme.palette.warning.main;
      case "overdue":
      case "failed":
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Add confirm resend handler (works for both regular and expired invitations)
  const handleConfirmResendExpired = async () => {
    if (!resendInvitation) return;
    try {
      // Calculate expiry date based on selection
      let expiresAt;
      if (resendExpiryOption === "custom") {
        expiresAt = new Date(resendCustomExpiry).toISOString();
      } else {
        const daysToAdd = parseInt(resendExpiryOption);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + daysToAdd);
        expiresAt = expiryDate.toISOString();
      }

      // Use appropriate API based on invitation status
      const isExpiredInvitation = resendInvitation.status === "Expired" || (resendInvitation.status === "Pending" && getTimeLeft(resendInvitation.expires_at) === "Expired");

      const response = isExpiredInvitation
        ? await InternalAPIService.resendExpiredInvitation(resendInvitation.id, expiresAt)
        : await InternalAPIService.resendInvitation(resendInvitation.id, expiresAt);

      if (response.success) {
        setSnackbar({
          open: true,
          message: `Invitation resent to ${resendInvitation.email}`,
          severity: "success",
        });
        await loadInvitations();
      } else {
        throw new Error(response.message || "Failed to resend invitation");
      }
      setOpenResendDialog(false);
      setResendInvitation(null);
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to resend invitation",
        severity: "error",
      });
    }
  };

  if (loading && allTenants.length === 0) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Tenant Management
        </Typography>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading tenant data from server...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Typography variant="h4" fontWeight={700}>
          Tenant Management
        </Typography>
        <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setOpenInviteDialog(true)} sx={{ borderRadius: 2 }}>
          Invite Tenant
        </Button>
      </Box>

      {/* Tenant Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Tenants
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {tenantMetrics.totalTenants}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                  <Business />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Active Tenants
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="success.main">
                    {tenantMetrics.activeTenants}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                  <CheckCircle />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Monthly Revenue
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="secondary.main">
                    {formatCurrency(tenantMetrics.totalRevenue)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                  <MonetizationOn />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Pending Approvals
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="warning.main">
                    {tenantMetrics.pendingApprovals}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                  <Schedule />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Loading Indicator for Data Refresh */}
      {loading && allTenants.length > 0 && <LinearProgress sx={{ mb: 2 }} />}

      {/* Tenant Invitations Section */}
      <Paper elevation={3} sx={{ mb: 4 }}>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="h6" fontWeight={600}>
              Tenant Invitations
            </Typography>
            <Button variant="outlined" size="small" onClick={loadInvitations} disabled={invitationsLoading} sx={{ borderRadius: 2 }}>
              Refresh
            </Button>
          </Box>

          {invitationsLoading ? (
            <LinearProgress />
          ) : (invitations || []).length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No invitations found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Use the "Invite Tenant" button to send new invitations.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Contact Details</TableCell>
                    <TableCell>Organization</TableCell>
                    <TableCell align="center">Type</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Expires</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                        Time Left
                        <IconButton size="small" onClick={handleTimeRefresh} title="Refresh time calculations">
                          🔄
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(invitations || []).map((invitation) => (
                    <TableRow key={invitation.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body1" fontWeight={600}>
                            {invitation.contact_name || "Unknown Contact"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {invitation.email}
                          </Typography>
                          {invitation.contact_phone && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              📞 {invitation.contact_phone}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{invitation.organization_name || "Not specified"}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={invitation.tenant_type} size="small" color="primary" variant="outlined" />
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
                                : invitation.status === "Cancelled"
                                ? theme.palette.grey[600]
                                : theme.palette.grey[400],
                            color: "white",
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">{formatDate(invitation.expires_at)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(invitation.expires_at).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={invitation.status === "Accepted" ? "primary.main" : getTimeLeft(invitation.expires_at) === "Expired" ? "error.main" : "text.primary"}
                          key={timeRefreshKey}
                        >
                          {invitation.status === "Accepted" ? "Accepted" : getTimeLeft(invitation.expires_at)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton onClick={(e) => handleInvitationMenuClick(e, invitation)} size="small">
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

      {/* Tabbed Content */}
      <Paper elevation={3}>
        <Tabs value={selectedTab} onChange={handleTabChange} sx={{ px: 3, pt: 2 }}>
          <Tab
            label={
              <Badge badgeContent={tenantMetrics.totalTenants} color="primary">
                All Tenants
              </Badge>
            }
          />
          <Tab
            label={
              <Badge badgeContent={tenantMetrics.activeTenants} color="success">
                Active
              </Badge>
            }
          />
          <Tab
            label={
              <Badge badgeContent={tenantMetrics.suspendedTenants} color="warning">
                Suspended
              </Badge>
            }
          />
          <Tab
            label={
              <Badge badgeContent={tenantMetrics.pendingApprovals} color="info">
                Pending Approval
              </Badge>
            }
          />
          <Tab
            label={
              <Badge badgeContent={tenantMetrics.rejectedTenants} color="error">
                Rejected
              </Badge>
            }
          />
        </Tabs>

        <TabPanel value={selectedTab} index={0}>
          {/* All Tenants */}
          <Box sx={{ p: 3 }}>
            {/* Filters */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select value={statusFilter || ""} onChange={(e) => setStatusFilter(e.target.value as string)} label="Status">
                    <MenuItem value="">All Status</MenuItem>
                    <MenuItem value="Active">Active</MenuItem>
                    <MenuItem value="Suspended">Suspended</MenuItem>
                    <MenuItem value="Inactive">Pending</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type</InputLabel>
                  <Select value={typeFilter || ""} onChange={(e) => setTypeFilter(e.target.value as string)} label="Type">
                    <MenuItem value="">All Types</MenuItem>
                    <MenuItem value="Corporate">Corporate</MenuItem>
                    <MenuItem value="Circle">Circle</MenuItem>
                    <MenuItem value="Vendor">Vendor</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 7.2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search tenants by name, contact, or email..."
                  value={searchTerm || ""}
                  onChange={(e) => setSearchTerm(e.target.value || "")}
                  InputProps={{
                    startAdornment: <Search fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />,
                  }}
                />
              </Grid>
            </Grid>

            {/* No Results Message */}
            {allTenants.length === 0 && !loading && (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="h6" color="text.secondary">
                  No tenants found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try adjusting your filters or check your connection.
                </Typography>
              </Box>
            )}

            {/* Tenants Table */}
            {allTenants.length > 0 && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Organization Details</TableCell>
                      <TableCell>Contact Information</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="center">Plan</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                      <TableCell align="center">Users</TableCell>
                      <TableCell align="center">Support</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getFilteredTenants().map((tenant) => (
                      <TableRow key={tenant.id} hover>
                        <TableCell
                          onClick={() => handleViewTenantDetails(tenant)}
                          sx={{
                            cursor: "pointer",
                            "&:hover": {
                              backgroundColor: theme.palette.action.hover,
                            },
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                            <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                              <Business />
                            </Avatar>
                            <Box>
                              <Typography variant="body1" fontWeight={600}>
                                {tenant.organization_name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {tenant.tenant_type} • ID: {tenant.id.slice(-8)}
                              </Typography>
                              {tenant.is_trial && <Chip label="Trial" size="small" color="info" />}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">{tenant.primary_contact_name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {tenant.primary_contact_email}
                            </Typography>
                            {tenant.primary_contact_phone && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {tenant.primary_contact_phone}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
                            <Chip
                              label={tenant.activation_status}
                              size="small"
                              sx={{
                                bgcolor: getStatusColor(tenant.activation_status),
                                color: "white",
                                fontWeight: 600,
                              }}
                            />
                            <Chip
                              label={tenant.payment_status}
                              size="small"
                              variant="outlined"
                              sx={{
                                borderColor: getPaymentStatusColor(tenant.payment_status),
                                color: getPaymentStatusColor(tenant.payment_status),
                              }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight={600}>
                            {tenant.subscription_plan}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body1" fontWeight={600} color="success.main">
                            {formatCurrency(tenant.monthly_revenue)}
                          </Typography>
                          {tenant.overage_charges > 0 && (
                            <Typography variant="caption" color="warning.main" display="block">
                              +{formatCurrency(tenant.overage_charges)} overage
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body1" fontWeight={600}>
                            {tenant.users}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                            <SupportAgent fontSize="small" color={tenant.support_tickets > 0 ? "warning" : "disabled"} />
                            <Typography variant="body2">{tenant.support_tickets}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton onClick={(e) => handleMenuClick(e, tenant)} size="small">
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
        </TabPanel>

        <TabPanel value={selectedTab} index={1}>
          {/* Active Tenants */}
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Active Tenants
            </Typography>
            {allTenants.filter((t) => t.activation_status === "Active").length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                No active tenants found.
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Organization</TableCell>
                      <TableCell>Plan</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                      <TableCell align="center">Users</TableCell>
                      <TableCell>Last Login</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allTenants
                      .filter((t) => t.activation_status === "Active")
                      .map((tenant) => (
                        <TableRow key={tenant.id} hover>
                          <TableCell
                            onClick={() => handleViewTenantDetails(tenant)}
                            sx={{
                              cursor: "pointer",
                              "&:hover": {
                                backgroundColor: theme.palette.action.hover,
                              },
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                              <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                                <CheckCircle />
                              </Avatar>
                              <Box>
                                <Typography variant="body1" fontWeight={600}>
                                  {tenant.organization_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {tenant.primary_contact_name}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>{tenant.subscription_plan}</TableCell>
                          <TableCell align="right">
                            <Typography variant="body1" fontWeight={600} color="success.main">
                              {formatCurrency(tenant.monthly_revenue)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">{tenant.users}</TableCell>
                          <TableCell>{tenant.last_login ? formatDate(tenant.last_login) : "Never"}</TableCell>
                          <TableCell align="center">
                            <IconButton onClick={(e) => handleMenuClick(e, tenant)} size="small">
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
        </TabPanel>

        <TabPanel value={selectedTab} index={2}>
          {/* Suspended Tenants */}
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Suspended Tenants
            </Typography>
            {allTenants.filter((t) => t.activation_status === "Suspended").length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                No suspended tenants found.
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Organization</TableCell>
                      <TableCell>Contact</TableCell>
                      <TableCell align="center">Payment Status</TableCell>
                      <TableCell align="right">Outstanding</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allTenants
                      .filter((t) => t.activation_status === "Suspended")
                      .map((tenant) => (
                        <TableRow key={tenant.id} hover>
                          <TableCell
                            onClick={() => handleViewTenantDetails(tenant)}
                            sx={{
                              cursor: "pointer",
                              "&:hover": {
                                backgroundColor: theme.palette.action.hover,
                              },
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                              <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                                <Pause />
                              </Avatar>
                              <Box>
                                <Typography variant="body1" fontWeight={600}>
                                  {tenant.organization_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Suspended Account
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{tenant.primary_contact_name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {tenant.primary_contact_email}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={tenant.payment_status}
                              size="small"
                              sx={{
                                bgcolor: getPaymentStatusColor(tenant.payment_status),
                                color: "white",
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body1" fontWeight={600} color="error.main">
                              {formatCurrency(tenant.monthly_revenue + tenant.overage_charges)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <IconButton onClick={(e) => handleMenuClick(e, tenant)} size="small">
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
        </TabPanel>

        <TabPanel value={selectedTab} index={3}>
          {/* Pending Approvals */}
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Pending Tenant Approvals
            </Typography>
            {allTenants.filter((t) => t.activation_status === "Inactive" && t.registration_status === "Pending").length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                No pending approvals found.
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Organization Details</TableCell>
                      <TableCell>Registration Info</TableCell>
                      <TableCell>Requested Plan</TableCell>
                      <TableCell>Submitted</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allTenants
                      .filter((t) => t.activation_status === "Inactive" && t.registration_status === "Pending")
                      .map((tenant) => (
                        <TableRow key={tenant.id} hover>
                          <TableCell
                            onClick={() => handleViewTenantDetails(tenant)}
                            sx={{
                              cursor: "pointer",
                              "&:hover": {
                                backgroundColor: theme.palette.action.hover,
                              },
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                              <Avatar sx={{ bgcolor: theme.palette.info.main }}>
                                <Schedule />
                              </Avatar>
                              <Box>
                                <Typography variant="body1" fontWeight={600}>
                                  {tenant.organization_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {tenant.tenant_type}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{tenant.primary_contact_name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {tenant.primary_contact_email}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={tenant.subscription_plan} color="primary" variant="outlined" />
                            {tenant.is_trial && <Chip label="Trial Requested" size="small" color="info" sx={{ ml: 1 }} />}
                          </TableCell>
                          <TableCell>{formatDate(tenant.created_at)}</TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: "flex", gap: 1 }}>
                              <Button size="small" variant="contained" color="success" onClick={() => handleApproveTenant(tenant)} disabled={approvalLoading === tenant.id} sx={{ borderRadius: 2 }}>
                                {approvalLoading === tenant.id ? "Approving..." : "Approve"}
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => {
                                  setTenantToReject(tenant);
                                  setOpenRejectDialog(true);
                                }}
                                disabled={approvalLoading === tenant.id}
                                sx={{ borderRadius: 2 }}
                              >
                                {approvalLoading === tenant.id ? "Rejecting..." : "Reject"}
                              </Button>
                              <IconButton onClick={(e) => handleMenuClick(e, tenant)} size="small" disabled={approvalLoading === tenant.id}>
                                <MoreVert />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={4}>
          {/* Rejected Tenants */}
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Rejected Tenant Applications
            </Typography>
            {allTenants.filter((t) => t.activation_status === "Inactive" && t.registration_status === "Rejected").length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                No rejected applications found.
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Organization Details</TableCell>
                      <TableCell>Registration Info</TableCell>
                      <TableCell>Rejection Reason</TableCell>
                      <TableCell>Rejected Date</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allTenants
                      .filter((t) => t.activation_status === "Inactive" && t.registration_status === "Rejected")
                      .map((tenant) => (
                        <TableRow key={tenant.id} hover>
                          <TableCell
                            onClick={() => handleViewTenantDetails(tenant)}
                            sx={{
                              cursor: "pointer",
                              "&:hover": {
                                backgroundColor: theme.palette.action.hover,
                              },
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                              <Avatar sx={{ bgcolor: theme.palette.error.main }}>
                                <Close />
                              </Avatar>
                              <Box>
                                <Typography variant="body1" fontWeight={600}>
                                  {tenant.organization_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {tenant.tenant_type}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{tenant.primary_contact_name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {tenant.primary_contact_email}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="error.main">
                              {tenant.rejection_reason || "No reason provided"}
                            </Typography>
                          </TableCell>
                          <TableCell>{formatDate(tenant.updated_at)}</TableCell>
                          <TableCell align="center">
                            <IconButton onClick={(e) => handleMenuClick(e, tenant)} size="small">
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
        </TabPanel>
      </Paper>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={() => selectedTenant && handleViewTenantDetails(selectedTenant)}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Edit Tenant
        </MenuItem>

        <MenuItem onClick={handleMenuClose}>
          <DashboardCustomize fontSize="small" sx={{ mr: 1 }} />
          Login as Tenant
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => selectedTenant && (setOpenWarningDialog(true), handleMenuClose())}>
          <Warning fontSize="small" sx={{ mr: 1, color: "warning.main" }} />
          Raise Warning
        </MenuItem>
        <MenuItem onClick={() => selectedTenant && (setOpenClarificationDialog(true), handleMenuClose())}>
          <Help fontSize="small" sx={{ mr: 1, color: "info.main" }} />
          Request Clarification
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Assignment fontSize="small" sx={{ mr: 1 }} />
          View Compliance Issues
        </MenuItem>
        <Divider />
        {selectedTenant?.activation_status === "Active" ? (
          <MenuItem onClick={() => selectedTenant && handleSuspendTenant(selectedTenant)}>
            <Pause fontSize="small" sx={{ mr: 1 }} />
            Suspend Tenant
          </MenuItem>
        ) : selectedTenant?.activation_status === "Suspended" ? (
          <MenuItem onClick={() => selectedTenant && handleReactivateTenant(selectedTenant)}>
            <PlayArrow fontSize="small" sx={{ mr: 1 }} />
            Reactivate Tenant
          </MenuItem>
        ) : selectedTenant?.activation_status === "Inactive" && selectedTenant?.registration_status === "Rejected" ? (
          <MenuItem onClick={() => selectedTenant && handleCancelRejection(selectedTenant)}>
            <CheckCircle fontSize="small" sx={{ mr: 1, color: "success.main" }} />
            Cancel Rejection
          </MenuItem>
        ) : null}
        <Divider />
        <MenuItem onClick={handleMenuClose} sx={{ color: "error.main" }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete Tenant
        </MenuItem>
      </Menu>

      {/* Invitation Actions Menu */}
      <Menu
        anchorEl={invitationAnchorEl}
        open={Boolean(invitationAnchorEl)}
        onClose={handleInvitationMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        {/* Show different options based on invitation status */}
        {selectedInvitation?.status === "Pending" && [
          <MenuItem key="resend" onClick={() => selectedInvitation && handleResendInvitation(selectedInvitation)}>
            <Email fontSize="small" sx={{ mr: 1 }} />
            Resend Invitation
          </MenuItem>,
          <MenuItem key="copy" onClick={() => selectedInvitation && handleCopyInvitationLink(selectedInvitation)}>
            <CheckCircle fontSize="small" sx={{ mr: 1 }} />
            Copy Invitation Link
          </MenuItem>,
          <MenuItem key="verify" onClick={() => selectedInvitation && handleInvitationEmailVerification(selectedInvitation)}>
            <Visibility fontSize="small" sx={{ mr: 1 }} />
            Email Verification Info
          </MenuItem>,
          <Divider key="divider" />,
          <MenuItem key="cancel" onClick={() => selectedInvitation && handleCancelInvitation(selectedInvitation)} sx={{ color: "warning.main" }}>
            <Pause fontSize="small" sx={{ mr: 1 }} />
            Cancel Invitation
          </MenuItem>,
        ]}

        {selectedInvitation?.status === "Accepted" && [
          <MenuItem key="resend-email" onClick={() => selectedInvitation && handleResendEmailVerification(selectedInvitation)}>
            <Email fontSize="small" sx={{ mr: 1 }} />
            Resend Email Verification
          </MenuItem>,
          <MenuItem key="copy-email" onClick={() => selectedInvitation && handleCopyEmailVerificationLink(selectedInvitation)}>
            <Visibility fontSize="small" sx={{ mr: 1 }} />
            Copy Email Verification Link
          </MenuItem>,
          <Divider key="divider" />,
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
          <MenuItem key="copy" onClick={() => selectedInvitation && handleCopyInvitationLink(selectedInvitation)}>
            <CheckCircle fontSize="small" sx={{ mr: 1 }} />
            Copy Invitation Link
          </MenuItem>,
          <Divider key="divider" />,
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
          <MenuItem key="copy" onClick={() => selectedInvitation && handleCopyInvitationLink(selectedInvitation)}>
            <CheckCircle fontSize="small" sx={{ mr: 1 }} />
            Copy Invitation Link
          </MenuItem>,
          <Divider key="divider" />,
          <MenuItem key="delete" onClick={() => selectedInvitation && handleDeleteInvitation(selectedInvitation)} sx={{ color: "error.main" }}>
            <Delete fontSize="small" sx={{ mr: 1 }} />
            Delete Invitation
          </MenuItem>,
        ]}
      </Menu>

      {/* Tenant Details Drawer */}
      <Drawer
        anchor="right"
        open={openDetailsDrawer}
        onClose={() => {
          setOpenDetailsDrawer(false);
          setSelectedTenant(null); // Clear selected tenant when drawer closes
          setDetailsLoading(false); // Clear loading state
        }}
        sx={{ "& .MuiDrawer-paper": { width: 500 } }}
      >
        {detailsLoading ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <LinearProgress sx={{ mb: 2 }} />
            <Typography variant="h6">Loading tenant details...</Typography>
            <Typography variant="body2" color="text.secondary">
              Please wait while we fetch the latest information.
            </Typography>
          </Box>
        ) : !selectedTenant ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="h6">No tenant selected</Typography>
            <Typography variant="body2" color="text.secondary">
              Please select a tenant to view details.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography variant="h6">Tenant Details</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<OpenInNew />}
                  onClick={() => {
                    if (selectedTenant) {
                      navigate(`/internal/tenants/${selectedTenant.id}`);
                    }
                  }}
                  sx={{ borderRadius: 2 }}
                >
                  View Full Details
                </Button>
                <IconButton
                  onClick={() => {
                    setOpenDetailsDrawer(false);
                    setSelectedTenant(null);
                    setDetailsLoading(false);
                  }}
                >
                  <Close />
                </IconButton>
              </Box>
            </Box>

            <Card elevation={1} sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                  <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 60, height: 60 }}>
                    <Business />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{selectedTenant.organization_name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedTenant.tenant_type} • {selectedTenant.subscription_plan}
                    </Typography>
                  </Box>
                </Box>

                <Chip
                  label={selectedTenant.activation_status}
                  sx={{
                    bgcolor: getStatusColor(selectedTenant.activation_status),
                    color: "white",
                    fontWeight: 600,
                  }}
                />
              </CardContent>
            </Card>

            <Typography variant="h6" gutterBottom>
              Contact Information
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <Person />
                </ListItemIcon>
                <ListItemText primary={selectedTenant.primary_contact_name} secondary="Primary Contact" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Email />
                </ListItemIcon>
                <ListItemText primary={selectedTenant.primary_contact_email} secondary="Email Address" />
              </ListItem>
              {selectedTenant.primary_contact_phone && (
                <ListItem>
                  <ListItemIcon>
                    <Phone />
                  </ListItemIcon>
                  <ListItemText primary={selectedTenant.primary_contact_phone} secondary="Phone Number" />
                </ListItem>
              )}
            </List>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Usage & Metrics
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Card elevation={1}>
                  <CardContent sx={{ textAlign: "center" }}>
                    <Typography variant="h4" color="primary.main">
                      {selectedTenant.users || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Users
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Card elevation={1}>
                  <CardContent sx={{ textAlign: "center" }}>
                    <Typography variant="h4" color="success.main">
                      {selectedTenant.usage_metrics?.projects || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Projects
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Card elevation={1}>
                  <CardContent sx={{ textAlign: "center" }}>
                    <Typography variant="h4" color="info.main">
                      {selectedTenant.usage_metrics?.sites || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sites
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Card elevation={1}>
                  <CardContent sx={{ textAlign: "center" }}>
                    <Typography variant="h4" color="warning.main">
                      {selectedTenant.support_tickets || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tickets
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Billing Information
            </Typography>
            <Card elevation={1}>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                  <Typography variant="body2">Monthly Revenue</Typography>
                  <Typography variant="h6" color="success.main">
                    {formatCurrency(selectedTenant.monthly_revenue || 0)}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                  <Typography variant="body2">Overage Charges</Typography>
                  <Typography variant="body1" color={(selectedTenant.overage_charges || 0) > 0 ? "warning.main" : "text.primary"}>
                    {formatCurrency(selectedTenant.overage_charges || 0)}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="body2">Payment Status</Typography>
                  <Chip
                    label={selectedTenant.payment_status || "Unknown"}
                    size="small"
                    sx={{
                      bgcolor: getPaymentStatusColor(selectedTenant.payment_status || "unknown"),
                      color: "white",
                    }}
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Vendor-specific details */}
            {selectedTenant.tenant_type === "Vendor" && (
              <>
                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                  Vendor Details
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Coverage Areas
                  </Typography>
                  {selectedTenant.coverage_areas && selectedTenant.coverage_areas.length > 0 ? (
                    <List dense>
                      {selectedTenant.coverage_areas.map((area: string, idx: number) => (
                        <ListItem key={idx}>
                          <ListItemText primary={area} />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No coverage areas specified.
                    </Typography>
                  )}
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Service Capabilities
                  </Typography>
                  {selectedTenant.service_capabilities && selectedTenant.service_capabilities.length > 0 ? (
                    <List dense>
                      {selectedTenant.service_capabilities.map((cap: string, idx: number) => (
                        <ListItem key={idx}>
                          <ListItemText primary={cap} />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No service capabilities specified.
                    </Typography>
                  )}
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Certifications
                  </Typography>
                  {selectedTenant.certifications && selectedTenant.certifications.length > 0 ? (
                    <List dense>
                      {selectedTenant.certifications.map((cert: string, idx: number) => (
                        <ListItem key={idx}>
                          <ListItemText primary={cert} />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No certifications specified.
                    </Typography>
                  )}
                </Box>
              </>
            )}

            {/* Additional tenant info */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Additional Information
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText primary="Tenant ID" secondary={selectedTenant.id} />
              </ListItem>
              <ListItem>
                <ListItemText primary="Created At" secondary={formatDate(selectedTenant.created_at)} />
              </ListItem>
              {selectedTenant.activated_at && (
                <ListItem>
                  <ListItemText primary="Activated At" secondary={formatDate(selectedTenant.activated_at)} />
                </ListItem>
              )}
              {selectedTenant.last_login && (
                <ListItem>
                  <ListItemText primary="Last Login" secondary={formatDate(selectedTenant.last_login)} />
                </ListItem>
              )}
            </List>
          </Box>
        )}
      </Drawer>

      {/* Invite Tenant Dialog */}
      <Dialog open={openInviteDialog} onClose={() => setOpenInviteDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Invite New Tenant</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Organization Name" value={inviteForm.organization_name} onChange={(e) => setInviteForm({ ...inviteForm, organization_name: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Tenant Type</InputLabel>
                <Select value={inviteForm.tenant_type} onChange={(e) => setInviteForm({ ...inviteForm, tenant_type: e.target.value as any })} label="Tenant Type">
                  <MenuItem value="Corporate">Corporate</MenuItem>
                  <MenuItem value="Circle">Circle</MenuItem>
                  <MenuItem value="Vendor">Vendor</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Contact Name" value={inviteForm.contact_name} onChange={(e) => setInviteForm({ ...inviteForm, contact_name: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Contact Email" type="email" value={inviteForm.contact_email} onChange={(e) => setInviteForm({ ...inviteForm, contact_email: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Contact Phone" value={inviteForm.contact_phone} onChange={(e) => setInviteForm({ ...inviteForm, contact_phone: e.target.value })} />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Expires In</InputLabel>
                <Select value={inviteForm.expiry_option} onChange={(e) => setInviteForm({ ...inviteForm, expiry_option: e.target.value as any })} label="Expires In">
                  <MenuItem value="1">1 Day</MenuItem>
                  <MenuItem value="2">2 Days</MenuItem>
                  <MenuItem value="3">3 Days</MenuItem>
                  <MenuItem value="custom">Custom Date & Time</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {inviteForm.expiry_option === "custom" && (
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Custom Expiry Date & Time"
                  type="datetime-local"
                  value={inviteForm.custom_expiry_date}
                  onChange={(e) => setInviteForm({ ...inviteForm, custom_expiry_date: e.target.value })}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenInviteDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateInvite}>
            Send Invitation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Raise Warning Dialog */}
      <Dialog open={openWarningDialog} onClose={() => setOpenWarningDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Raise Compliance Warning</DialogTitle>
        <DialogContent>
          {selectedTenant && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Raising a warning for <strong>{selectedTenant.organization_name}</strong>. This will not suspend their operations - they can continue using the platform while addressing this issue.
              </Typography>
            </Alert>
          )}
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Warning Title"
                value={warningForm.title}
                onChange={(e) => setWarningForm({ ...warningForm, title: e.target.value })}
                placeholder="e.g., Business Registration Number Verification Required"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Issue Type</InputLabel>
                <Select value={warningForm.issue_type} onChange={(e) => setWarningForm({ ...warningForm, issue_type: e.target.value as any })} label="Issue Type">
                  <MenuItem value="Warning">General Warning</MenuItem>
                  <MenuItem value="Business_Verification">Business Verification</MenuItem>
                  <MenuItem value="Compliance_Review">Compliance Review</MenuItem>
                  <MenuItem value="Documentation_Missing">Documentation Missing</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Severity</InputLabel>
                <Select value={warningForm.severity} onChange={(e) => setWarningForm({ ...warningForm, severity: e.target.value as any })} label="Severity">
                  <MenuItem value="Low">Low Priority</MenuItem>
                  <MenuItem value="Medium">Medium Priority</MenuItem>
                  <MenuItem value="High">High Priority</MenuItem>
                  <MenuItem value="Critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={warningForm.description}
                onChange={(e) => setWarningForm({ ...warningForm, description: e.target.value })}
                placeholder="Describe the issue that needs attention..."
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Required Action"
                value={warningForm.required_action}
                onChange={(e) => setWarningForm({ ...warningForm, required_action: e.target.value })}
                placeholder="Clearly describe what the tenant needs to do to resolve this issue..."
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Days to Resolve" type="number" value={warningForm.due_days} onChange={(e) => setWarningForm({ ...warningForm, due_days: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenWarningDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRaiseWarning} color="warning" disabled={!warningForm.title || !warningForm.description || !warningForm.required_action}>
            Raise Warning
          </Button>
        </DialogActions>
      </Dialog>

      {/* Request Clarification Dialog */}
      <Dialog open={openClarificationDialog} onClose={() => setOpenClarificationDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Request Clarification</DialogTitle>
        <DialogContent>
          {selectedTenant && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Requesting clarification from <strong>{selectedTenant.organization_name}</strong>. This will not affect their operations - they can continue using the platform while responding.
              </Typography>
            </Alert>
          )}
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Clarification Title"
                value={clarificationForm.title}
                onChange={(e) => setClarificationForm({ ...clarificationForm, title: e.target.value })}
                placeholder="e.g., Contact Information Verification"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Issue Type</InputLabel>
                <Select value={clarificationForm.issue_type} onChange={(e) => setClarificationForm({ ...clarificationForm, issue_type: e.target.value as any })} label="Issue Type">
                  <MenuItem value="Clarification_Required">General Clarification</MenuItem>
                  <MenuItem value="Business_Verification">Business Information</MenuItem>
                  <MenuItem value="Compliance_Review">Compliance Details</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select value={clarificationForm.severity} onChange={(e) => setClarificationForm({ ...clarificationForm, severity: e.target.value as any })} label="Priority">
                  <MenuItem value="Low">Low Priority</MenuItem>
                  <MenuItem value="Medium">Medium Priority</MenuItem>
                  <MenuItem value="High">High Priority</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="What needs clarification?"
                value={clarificationForm.description}
                onChange={(e) => setClarificationForm({ ...clarificationForm, description: e.target.value })}
                placeholder="Describe what information or clarification you need from the tenant..."
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Requested Response"
                value={clarificationForm.required_action}
                onChange={(e) => setClarificationForm({ ...clarificationForm, required_action: e.target.value })}
                placeholder="Describe exactly what you need the tenant to provide or clarify..."
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Days to Respond"
                type="number"
                value={clarificationForm.due_days}
                onChange={(e) => setClarificationForm({ ...clarificationForm, due_days: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenClarificationDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleRequestClarification} color="info" disabled={!clarificationForm.title || !clarificationForm.description || !clarificationForm.required_action}>
            Send Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Tenant Confirmation Dialog */}
      <Dialog open={openRejectDialog} onClose={() => setOpenRejectDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reject Tenant Application</DialogTitle>
        <DialogContent>
          {tenantToReject && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Are you sure you want to reject the application for <strong>{tenantToReject.organization_name}</strong>? This action cannot be undone.
              </Typography>
            </Alert>
          )}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Rejection Reason (Optional)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Provide a reason for rejecting this tenant application..."
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => {
              setOpenRejectDialog(false);
              setTenantToReject(null);
              setRejectionReason("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              if (tenantToReject) {
                await handleRejectTenant(tenantToReject, rejectionReason || "Rejected via internal portal");
                setOpenRejectDialog(false);
                setTenantToReject(null);
                setRejectionReason("");
              }
            }}
            disabled={approvalLoading === tenantToReject?.id}
          >
            {approvalLoading === tenantToReject?.id ? "Rejecting..." : "Reject Application"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modern Snackbar */}
      <ModernSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} />

      {/* Resend Expired Invitation Dialog */}
      <Dialog
        open={openResendDialog}
        onClose={() => {
          setOpenResendDialog(false);
          setResendInvitation(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Resend Expired Invitation</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>Set a new expiry date and time for this invitation.</Typography>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Expires In</InputLabel>
                <Select value={resendExpiryOption} onChange={(e) => setResendExpiryOption(e.target.value as any)} label="Expires In">
                  <MenuItem value="1">1 Day</MenuItem>
                  <MenuItem value="3">3 Days</MenuItem>
                  <MenuItem value="7">7 Days</MenuItem>
                  <MenuItem value="14">14 Days</MenuItem>
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
          <Button variant="contained" onClick={handleConfirmResendExpired}>
            Resend Invitation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InternalTenantManagementPage;
