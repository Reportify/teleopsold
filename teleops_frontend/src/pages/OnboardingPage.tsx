import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  FormHelperText,
  Divider,
  Checkbox,
  ListItemText,
  useTheme,
  Card,
  CardContent,
  CardHeader,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  Avatar,
  Alert,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import { Business, AccountTree, Badge, CheckCircleOutline, Warning, Info, Security, Gavel, Email, Phone, LocationOn, Domain, Assignment, VerifiedUser } from "@mui/icons-material";
import { api } from "../services/api";
import { ModernSnackbar } from "../components";

interface InvitationData {
  id: string;
  email: string;
  contact_name: string;
  tenant_type: "Corporate" | "Circle" | "Vendor";
  organization_name?: string;
  expires_at: string;
  status: "Pending" | "Accepted" | "Expired" | "Cancelled";
  circle_name?: string;
  invited_at: string;
  contact_phone?: string;
  // Circle-specific fields
  circle_id?: number | string;
  circle_code?: string;
  parent_tenant_id?: string;
  parent_subdomain?: string;
  invitation_type?: string;
}

interface OnboardingForm {
  // Common fields
  organization_name: string;
  business_registration_number: string;
  primary_contact_name: string;
  primary_contact_email: string;
  primary_contact_phone: string;
  subdomain: string;

  // Corporate-specific fields
  industry_sector: string;
  country: string;
  corporate_hq_address: string;
  website: string;
  secondary_contact_name: string;
  secondary_contact_email: string;
  secondary_contact_phone: string;
  administrative_contact_email: string;
  circles: string[];

  // Circle-specific fields
  parent_tenant_id?: string;

  // Vendor-specific fields
  business_address: string;
  local_office_address: string;
  circle_contact_person: string;
  coverage_areas: string[];
  service_capabilities: string[];
  employee_count: number | null;
  certifications: string[];
}

interface RegistrationResponse {
  message: string;
  user_id: string;
  email: string;
  verification_sent: boolean;
  // Legacy fields for backwards compatibility
  success?: boolean;
  tenant_id?: string;
  registration_status?: "Pending" | "Approved" | "Under_Review" | "Warnings_Raised";
  next_steps?: string[];
  compliance_requirements?: string[];
}

const steps = ["Invitation Verification", "Terms & Compliance", "Organization Details", "Registration Complete"];

const vendorSpecializations = [
  "Tower Installation",
  "Fiber Optic Installation",
  "Equipment Maintenance",
  "Site Survey",
  "Network Planning",
  "Emergency Services",
  "Civil Works",
  "Electrical Works",
  "Security Services",
  "Transportation",
];

const vendorServiceCapabilities = [
  "Installation",
  "Commissioning",
  "Dismantle",
  "Transportation",
  "Site Survey",
  "Network Planning",
  "Civil Work",
  "Tower Installation",
  "Fiber Optics Installation",
  "Maintenance",
  "Emergency Response",
  "Quality Assurance",
  "Documentation",
];

const vendorCertifications = ["ISO 9001", "ISO 14001", "ISO 45001", "OHSAS 18001", "TEC Certification", "BIS Certification", "Industry Specific"];

const industryOptions = ["Telecommunications", "Information Technology", "Infrastructure", "Construction", "Engineering Services", "Consulting", "Equipment Manufacturing", "Other"];

const countryOptions = ["India", "United States", "United Kingdom", "Singapore", "Other"];

// Component for accepted invitation message
const AcceptedInvitationMessage = ({ invitation }: { invitation: InvitationData }) => {
  const theme = useTheme();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: theme.palette.grey[50], py: theme.spacing(4) }}>
      <Box sx={{ maxWidth: 600, mx: "auto", px: theme.spacing(2) }}>
        <Paper sx={{ p: theme.spacing(4) }}>
          <Box sx={{ textAlign: "center", mb: theme.spacing(4) }}>
            <Avatar sx={{ bgcolor: "success.main", width: 80, height: 80, mx: "auto", mb: 2 }}>
              <CheckCircleOutline fontSize="large" />
            </Avatar>
            <Typography variant="h4" gutterBottom fontWeight="bold" color="success.main">
              Onboarding Complete!
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Welcome to Teleops, {invitation.contact_name}
            </Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body1" gutterBottom>
              <strong>Your onboarding has been successfully completed!</strong>
            </Typography>
            <Typography variant="body2">
              An email verification link has been sent to: <strong>{invitation.email}</strong>
            </Typography>
          </Alert>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Next Steps:
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Email color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Check Your Email" secondary="Look for the verification email in your inbox and spam folder" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <VerifiedUser color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Complete Verification" secondary="Click the verification link to activate your account" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Domain color="primary" />
                  </ListItemIcon>
                  <ListItemText primary="Access Your Portal" secondary="Once verified, you can log in to your Teleops portal" />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Email not received?</strong> Please check your spam folder. If you still don't see it, contact our support team for assistance.
            </Typography>
          </Alert>

          <Box sx={{ textAlign: "center" }}>
            <Button variant="outlined" color="primary" onClick={() => (window.location.href = "mailto:support@teleops.com")}>
              Contact Support
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

// Enhanced Terms & Conditions with Compliance Focus
const TermsAndConditionsContent = () => (
  <Box>
    <Typography variant="h5" fontWeight={700} gutterBottom>
      Terms & Conditions and Compliance Requirements
    </Typography>

    <Alert severity="info" sx={{ mb: 3 }}>
      <Typography variant="body2">
        <strong>Important:</strong> By proceeding, you acknowledge that your registration will be subject to Teleops' compliance review process. This helps ensure platform security and regulatory
        compliance.
      </Typography>
    </Alert>

    <Card elevation={1} sx={{ mb: 3 }}>
      <CardHeader
        title="Key Compliance Areas"
        avatar={
          <Avatar sx={{ bgcolor: "warning.main" }}>
            <Security />
          </Avatar>
        }
      />
      <CardContent>
        <List dense>
          <ListItem>
            <ListItemIcon>
              <Gavel fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Business Verification" secondary="Valid business registration and licensing documentation" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <VerifiedUser fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Identity Verification" secondary="Contact person verification and authorization documentation" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <Assignment fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Operational Compliance" secondary="Industry certifications and quality standards adherence" />
          </ListItem>
        </List>
      </CardContent>
    </Card>

    <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
      1. Platform Access Agreement
    </Typography>
    <Typography variant="body2" paragraph>
      By accepting this invitation and completing registration, you agree to comply with Teleops platform policies, security requirements, and operational standards. Your access is subject to ongoing
      compliance verification.
    </Typography>

    <Typography variant="h6" gutterBottom>
      2. Data Protection & Privacy
    </Typography>
    <Typography variant="body2" paragraph>
      We collect and process your business information in accordance with applicable data protection laws. Your data will be used for platform operations, compliance verification, and service
      delivery.
    </Typography>

    <Typography variant="h6" gutterBottom>
      3. Compliance Monitoring
    </Typography>
    <Typography variant="body2" paragraph>
      Teleops reserves the right to request additional documentation, conduct compliance reviews, and raise clarification requests at any time. Non-compliance may result in account restrictions.
    </Typography>

    <Typography variant="h6" gutterBottom>
      4. Service Terms
    </Typography>
    <Typography variant="body2" paragraph>
      Platform services are provided subject to availability, compliance with usage policies, and payment of applicable fees. Service levels and access permissions are determined based on your tenant
      type and compliance status.
    </Typography>

    <Alert severity="warning" sx={{ mt: 3 }}>
      <Typography variant="body2">
        <strong>Note:</strong> Registration approval is not guaranteed and is subject to Teleops' compliance review. For questions about compliance requirements, please contact support@teleops.com.
      </Typography>
    </Alert>
  </Box>
);

const OnboardingPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const theme = useTheme();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [registrationResult, setRegistrationResult] = useState<RegistrationResponse | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" | "info" });

  const [form, setForm] = useState<OnboardingForm>({
    organization_name: "",
    business_registration_number: "",
    primary_contact_name: "",
    primary_contact_email: "",
    primary_contact_phone: "",
    subdomain: "",
    industry_sector: "Telecommunications",
    country: "India",
    corporate_hq_address: "",
    website: "",
    secondary_contact_name: "",
    secondary_contact_email: "",
    secondary_contact_phone: "",
    administrative_contact_email: "",
    circles: [],
    business_address: "",
    local_office_address: "",
    circle_contact_person: "",
    coverage_areas: [],
    service_capabilities: [],
    employee_count: null,
    certifications: [],
  });

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [complianceAcknowledged, setComplianceAcknowledged] = useState(false);
  const [formErrors, setFormErrors] = useState<any>({});
  const [circleOptions, setCircleOptions] = useState<{ id: string; circle_code: string; circle_name: string; region: string }[]>([]);
  const [invitationAccepted, setInvitationAccepted] = useState(false);

  // Load invitation data
  useEffect(() => {
    if (token) {
      loadInvitationData();
    }
  }, [token]);

  // Fetch circles for coverage_areas dropdown
  useEffect(() => {
    if (invitation?.tenant_type === "Vendor") {
      api.get("/circles/").then((res) => {
        setCircleOptions(res.data || []);
      });
    }
  }, [invitation?.tenant_type]);

  const loadInvitationData = async () => {
    setLoading(true);
    try {
      const resp = await api.get(`/public/invitations/${token}/`);
      if (resp.status !== 200) {
        throw new Error("Invalid or expired invitation link");
      }
      const data = resp.data;

      // Check invitation status
      if (data.status === "Expired") {
        setSnackbar({
          open: true,
          message: "This invitation has expired. Please contact your administrator for a new invitation.",
          severity: "error",
        });
        return;
      }
      if (data.status === "Cancelled") {
        setSnackbar({
          open: true,
          message: "This invitation has been cancelled. Please contact your administrator.",
          severity: "error",
        });
        return;
      }
      if (data.status === "Accepted") {
        setInvitationAccepted(true);
        setInvitation(data); // Still set invitation data for display purposes
        return;
      }

      setInvitation(data);

      // For circle tenants, generate subdomain and use prefilled organization name
      let organizationName = data.organization_name || "";
      let subdomain = "";

      if (data.tenant_type === "Circle") {
        // Use the organization name from invitation (already formatted as "Company (CircleCode)")
        organizationName = data.organization_name || "";

        // Generate subdomain in format: organizationSubdomain_CircleCode
        if (data.circle_code) {
          // Extract base subdomain from organization name or use default
          const baseSubdomain = organizationName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "") // Remove special chars
            .substring(0, 10); // Limit length
          subdomain = `${baseSubdomain}_${data.circle_code.toLowerCase()}`;
        }
      }

      setForm((prev) => ({
        ...prev,
        organization_name: organizationName,
        primary_contact_name: data.contact_name || "",
        primary_contact_email: data.email || "",
        primary_contact_phone: data.contact_phone || "",
        subdomain: subdomain || prev.subdomain,
        circles: data.circles || [],
      }));

      setSnackbar({
        open: true,
        message: `Invitation verified for ${data.tenant_type} registration`,
        severity: "success",
      });
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: "Invalid or expired invitation link. Please check the URL or contact support.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const validateForm = () => {
    const errors: any = {};

    // Common validations (skip organization_name and subdomain for circle tenants)
    if (invitation?.tenant_type !== "Circle" && !form.organization_name?.trim()) {
      errors.organization_name = "Organization Name is required";
    }
    if (!form.primary_contact_name?.trim()) errors.primary_contact_name = "Contact Name is required";
    if (!form.primary_contact_email?.trim()) errors.primary_contact_email = "Contact Email is required";
    if (!form.primary_contact_phone?.trim()) errors.primary_contact_phone = "Contact Phone is required";
    if (invitation?.tenant_type !== "Circle" && !form.subdomain?.trim()) {
      errors.subdomain = "Subdomain is required";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (form.primary_contact_email && !emailRegex.test(form.primary_contact_email)) {
      errors.primary_contact_email = "Please enter a valid email address";
    }

    // Phone validation
    const phoneRegex = /^[\+]?[1-9][\d]{3,14}$/;
    if (form.primary_contact_phone && !phoneRegex.test(form.primary_contact_phone.replace(/\s+/g, ""))) {
      errors.primary_contact_phone = "Please enter a valid phone number";
    }

    // Subdomain validation (skip for circle tenants)
    if (invitation?.tenant_type !== "Circle") {
      const subdomainRegex = /^[a-z0-9-]+$/;
      if (form.subdomain && !subdomainRegex.test(form.subdomain)) {
        errors.subdomain = "Subdomain can only contain lowercase letters, numbers, and hyphens";
      }
    }

    // Business registration for non-Corporate
    if (invitation?.tenant_type !== "Corporate" && !form.business_registration_number?.trim()) {
      errors.business_registration_number = "Business Registration Number is required";
    }

    // Corporate-specific validations
    if (invitation?.tenant_type === "Corporate") {
      if (!form.industry_sector) errors.industry_sector = "Industry Sector is required";
      if (!form.country) errors.country = "Country is required";
      if (!form.corporate_hq_address?.trim()) errors.corporate_hq_address = "Corporate HQ Address is required";
    }

    // Vendor-specific validations
    if (invitation?.tenant_type === "Vendor") {
      if (!form.business_address?.trim()) errors.business_address = "Business Address is required";
      if (form.service_capabilities.length === 0) errors.service_capabilities = "At least one service capability is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setSnackbar({
        open: true,
        message: "Please fix the validation errors before proceeding",
        severity: "error",
      });
      return;
    }

    setLoading(true);
    setFormErrors({});

    try {
      // Prepare payload with circle-specific data for circle tenants
      let formData = { ...form };

      // For circle tenants, ensure organization_name and subdomain are set
      if (invitation?.tenant_type === "Circle") {
        // Use the organization name from invitation, or fallback
        formData.organization_name = invitation.organization_name || `Circle Tenant for ${invitation.contact_name}`;

        // Generate subdomain using parent tenant's subdomain + circle code
        const circleCode = invitation.circle_code || "circle";
        const parentSubdomain = invitation.parent_subdomain || "organization";
        formData.subdomain = `${parentSubdomain}_${circleCode.toLowerCase()}`.substring(0, 25); // Limit subdomain length
      }

      const payload: any = {
        invitation_token: token,
        ...formData,
        terms_accepted: termsAccepted,
        compliance_acknowledged: complianceAcknowledged,
      };

      // Add circle-specific data for circle tenants
      if (invitation?.tenant_type === "Circle") {
        // Only add circle data if it exists in the invitation
        if (invitation.circle_id) payload.circle_id = invitation.circle_id;
        if (invitation.circle_code) payload.circle_code = invitation.circle_code;
        if (invitation.parent_tenant_id) payload.parent_tenant_id = invitation.parent_tenant_id;
        if (invitation.parent_subdomain) payload.parent_subdomain = invitation.parent_subdomain;
        if (invitation.invitation_type) payload.invitation_type = invitation.invitation_type;

        // Ensure we have minimal required data for circle tenant
        payload.tenant_type = "Circle";
      }

      const response = await api.post("/public/invitations/accept/", payload);

      if (response.status !== 200 && response.status !== 201) {
        throw new Error("Registration failed. Please try again.");
      }

      const result: RegistrationResponse = response.data;
      setRegistrationResult(result);

      setSnackbar({
        open: true,
        message: result.message || "Registration completed successfully!",
        severity: "success",
      });

      setActiveStep(3); // Move to success step
    } catch (err: any) {
      console.error("Registration error:", err);

      // Enhanced error handling
      let errorMessage = "Registration failed. Please try again.";
      if (err.response?.data) {
        const errorData = err.response.data;
        if (errorData.non_field_errors) {
          errorMessage = errorData.non_field_errors.join(" ");
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.subdomain) {
          errorMessage = `Subdomain error: ${errorData.subdomain.join(" ")}`;
        }
      }

      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTenantTypeIcon = (type: string) => {
    switch (type) {
      case "Corporate":
        return <Business sx={{ fontSize: 40, color: theme.palette.primary.main }} />;
      case "Circle":
        return <AccountTree sx={{ fontSize: 40, color: theme.palette.secondary.main }} />;
      case "Vendor":
        return <Badge sx={{ fontSize: 40, color: theme.palette.success.main }} />;
      default:
        return <Business sx={{ fontSize: 40 }} />;
    }
  };

  const getTenantTypeDescription = (type: string) => {
    switch (type) {
      case "Corporate":
        return "Large enterprise organization with multiple operational circles";
      case "Circle":
        return "Regional operational unit within a corporate structure";
      case "Vendor":
        return "Service provider offering specialized services to circles";
      default:
        return "";
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Invitation Verification
            </Typography>

            {invitation ? (
              <Card elevation={2}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                    {getTenantTypeIcon(invitation.tenant_type)}
                    <Box sx={{ ml: 2, flex: 1 }}>
                      <Typography variant="h6" fontWeight={600}>
                        {invitation.tenant_type} Registration
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {getTenantTypeDescription(invitation.tenant_type)}
                      </Typography>
                    </Box>
                    <Chip label={invitation.status} color={invitation.status === "Pending" ? "warning" : "success"} variant="outlined" />
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                        <Email fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
                        <Typography variant="body2" fontWeight={600}>
                          Contact Email
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {invitation.email}
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                        <Assignment fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
                        <Typography variant="body2" fontWeight={600}>
                          Contact Person
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {invitation.contact_name}
                      </Typography>
                    </Grid>

                    {invitation.organization_name && (
                      <Grid size={{ xs: 12 }}>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                          <Business fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
                          <Typography variant="body2" fontWeight={600}>
                            Organization
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {invitation.organization_name}
                        </Typography>
                      </Grid>
                    )}

                    <Grid size={{ xs: 12, md: 6 }}>
                      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                        <Info fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
                        <Typography variant="body2" fontWeight={600}>
                          Invitation Date
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {invitation.invited_at
                          ? new Date(invitation.invited_at).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : "Date not available"}
                      </Typography>
                    </Grid>

                    <Grid size={{ xs: 12, md: 6 }}>
                      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                        <Warning fontSize="small" sx={{ mr: 1, color: "warning.main" }} />
                        <Typography variant="body2" fontWeight={600}>
                          Expires On
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {invitation.expires_at
                          ? new Date(invitation.expires_at).toLocaleDateString("en-IN", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "No expiry date"}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ) : (
              <Alert severity="warning">Loading invitation details...</Alert>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <TermsAndConditionsContent />

            <Box sx={{ mt: 4, p: 3, bgcolor: theme.palette.grey[50], borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                Required Acknowledgments
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Checkbox checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} size="small" />
                <Typography variant="body2" component="span" sx={{ ml: 1 }}>
                  I have read and agree to the Terms & Conditions outlined above
                </Typography>
              </Box>

              <Box>
                <Checkbox checked={complianceAcknowledged} onChange={(e) => setComplianceAcknowledged(e.target.checked)} size="small" />
                <Typography variant="body2" component="span" sx={{ ml: 1 }}>
                  I acknowledge that my registration is subject to Teleops' compliance review process and I will provide any additional documentation requested
                </Typography>
              </Box>

              {(!termsAccepted || !complianceAcknowledged) && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Please acknowledge both requirements to proceed with registration.
                </Alert>
              )}
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Organization Details
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: theme.spacing(3) }}>
              Please provide the required information for your {invitation?.tenant_type?.toLowerCase()} organization.
            </Typography>

            <Grid container spacing={3}>
              {/* Tenant Type (read-only) */}
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Tenant Type" value={invitation?.tenant_type || ""} disabled fullWidth sx={{ backgroundColor: theme.palette.grey[50] }} />
              </Grid>

              {/* Common Fields - Always shown */}
              {invitation?.tenant_type !== "Circle" && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Organization Name"
                    value={form.organization_name}
                    onChange={(e) => setForm({ ...form, organization_name: e.target.value })}
                    fullWidth
                    required
                    error={!!formErrors.organization_name}
                    helperText={formErrors.organization_name}
                  />
                </Grid>
              )}
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Business Registration Number"
                  value={form.business_registration_number}
                  onChange={(e) => setForm({ ...form, business_registration_number: e.target.value })}
                  fullWidth
                  required={invitation?.tenant_type !== "Corporate"}
                  error={!!formErrors.business_registration_number}
                  helperText={formErrors.business_registration_number}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Contact Name"
                  value={form.primary_contact_name}
                  onChange={(e) => setForm({ ...form, primary_contact_name: e.target.value })}
                  fullWidth
                  required
                  error={!!formErrors.primary_contact_name}
                  helperText={formErrors.primary_contact_name}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Contact Email"
                  type="email"
                  value={form.primary_contact_email}
                  onChange={(e) => setForm({ ...form, primary_contact_email: e.target.value })}
                  fullWidth
                  required
                  error={!!formErrors.primary_contact_email}
                  helperText={formErrors.primary_contact_email}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Contact Phone"
                  value={form.primary_contact_phone}
                  onChange={(e) => setForm({ ...form, primary_contact_phone: e.target.value })}
                  fullWidth
                  required
                  error={!!formErrors.primary_contact_phone}
                  helperText={formErrors.primary_contact_phone}
                />
              </Grid>
              {invitation?.tenant_type !== "Circle" && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    label="Subdomain"
                    value={form.subdomain}
                    onChange={(e) => setForm({ ...form, subdomain: e.target.value })}
                    fullWidth
                    required
                    error={!!formErrors.subdomain}
                    helperText={formErrors.subdomain}
                  />
                </Grid>
              )}

              {/* Circle tenant information */}
              {invitation?.tenant_type === "Circle" && (
                <Grid size={{ xs: 12 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      Circle Tenant Setup
                    </Typography>
                    <Typography variant="body2" component="div">
                      Circle tenant setup will be handled by your corporate parent. Please contact your corporate administrator for circle-specific configuration.
                      <br />
                      <strong>Organization:</strong> {invitation?.organization_name || `Circle Tenant for ${invitation?.contact_name}`}
                      <br />
                      <strong>Subdomain:</strong> {form.subdomain || "Will be auto-generated"}
                      <br />
                      <strong>Circle Code:</strong> {invitation?.circle_code || "Will be provided"}
                      <br />
                      <strong>Contact:</strong> {invitation?.contact_name} ({invitation?.email})
                    </Typography>
                  </Alert>
                </Grid>
              )}

              {/* Corporate-specific fields */}
              {invitation?.tenant_type === "Corporate" && (
                <>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Industry Sector"
                      value={form.industry_sector || "Telecommunications"}
                      onChange={(e) => setForm({ ...form, industry_sector: e.target.value })}
                      fullWidth
                      required
                      error={!!formErrors.industry_sector}
                      helperText={formErrors.industry_sector}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Country"
                      value={form.country || "India"}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      fullWidth
                      required
                      error={!!formErrors.country}
                      helperText={formErrors.country}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Corporate HQ Address"
                      value={form.corporate_hq_address || ""}
                      onChange={(e) => setForm({ ...form, corporate_hq_address: e.target.value })}
                      fullWidth
                      required
                      error={!!formErrors.corporate_hq_address}
                      helperText={formErrors.corporate_hq_address}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField label="Website" value={form.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} fullWidth placeholder="https://" />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField label="Secondary Contact Name" value={form.secondary_contact_name || ""} onChange={(e) => setForm({ ...form, secondary_contact_name: e.target.value })} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField label="Secondary Contact Email" value={form.secondary_contact_email || ""} onChange={(e) => setForm({ ...form, secondary_contact_email: e.target.value })} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField label="Secondary Contact Phone" value={form.secondary_contact_phone || ""} onChange={(e) => setForm({ ...form, secondary_contact_phone: e.target.value })} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Administrative Contact Email"
                      value={form.administrative_contact_email || ""}
                      onChange={(e) => setForm({ ...form, administrative_contact_email: e.target.value })}
                      fullWidth
                    />
                  </Grid>
                </>
              )}

              {/* Vendor-specific fields */}
              {invitation?.tenant_type === "Vendor" && (
                <>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Business Address"
                      value={form.business_address || ""}
                      onChange={(e) => setForm({ ...form, business_address: e.target.value })}
                      fullWidth
                      required
                      error={!!formErrors.business_address}
                      helperText={formErrors.business_address}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField label="Website" value={form.website || ""} onChange={(e) => setForm({ ...form, website: e.target.value })} fullWidth placeholder="https://" />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField label="Local Office Address" value={form.local_office_address || ""} onChange={(e) => setForm({ ...form, local_office_address: e.target.value })} fullWidth />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField label="Circle Contact Person" value={form.circle_contact_person || ""} onChange={(e) => setForm({ ...form, circle_contact_person: e.target.value })} fullWidth />
                  </Grid>
                  {/* Existing vendor fields (license, years, employee count, etc.) */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Employee Count"
                      type="number"
                      value={form.employee_count || ""}
                      onChange={(e) => setForm({ ...form, employee_count: parseInt(e.target.value) || null })}
                      fullWidth
                      required
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel>Service Capabilities</InputLabel>
                      <Select
                        multiple
                        value={form.service_capabilities}
                        onChange={(e) => setForm({ ...form, service_capabilities: e.target.value as string[] })}
                        label="Service Capabilities"
                        renderValue={(selected) => (
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: theme.spacing(0.5) }}>
                            {selected.map((value) => (
                              <Chip key={value} label={value} />
                            ))}
                          </Box>
                        )}
                      >
                        {vendorServiceCapabilities.map((capability) => (
                          <MenuItem key={capability} value={capability}>
                            {capability}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>Select the services you can provide</FormHelperText>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel>Certifications</InputLabel>
                      <Select
                        multiple
                        value={form.certifications}
                        onChange={(e) => setForm({ ...form, certifications: e.target.value as string[] })}
                        label="Certifications"
                        renderValue={(selected) => (
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: theme.spacing(0.5) }}>
                            {selected.map((value) => (
                              <Chip key={value} label={value} />
                            ))}
                          </Box>
                        )}
                      >
                        {vendorCertifications.map((cert) => (
                          <MenuItem key={cert} value={cert}>
                            {cert}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>Select your relevant certifications</FormHelperText>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel>Coverage Areas (Circles)</InputLabel>
                      <Select
                        multiple
                        value={form.coverage_areas}
                        onChange={(e) => setForm({ ...form, coverage_areas: e.target.value as string[] })}
                        label="Coverage Areas (Circles)"
                        renderValue={(selected) => (
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: theme.spacing(0.5) }}>
                            {selected.map((value) => {
                              const circle = circleOptions.find((c) => c.id === value || c.circle_code === value);
                              return <Chip key={value} label={circle ? circle.circle_name : value} />;
                            })}
                          </Box>
                        )}
                      >
                        {circleOptions.map((circle) => (
                          <MenuItem key={circle.id} value={circle.id}>
                            <Checkbox checked={form.coverage_areas.indexOf(circle.id) > -1} />
                            <ListItemText primary={circle.circle_name} secondary={circle.region} />
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>Select the circles you operate in</FormHelperText>
                    </FormControl>
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        );
      case 3:
        return (
          <Box sx={{ py: theme.spacing(4) }}>
            <Box sx={{ textAlign: "center", mb: theme.spacing(4) }}>
              <Email sx={{ fontSize: 64, color: theme.palette.primary.main, mb: theme.spacing(2) }} />
              <Typography variant="h5" gutterBottom color={theme.palette.success.main} fontWeight="bold">
                Invitation Accepted Successfully!
              </Typography>
              <Typography variant="body1" sx={{ mb: theme.spacing(2) }}>
                Your invitation for <b>{invitation?.tenant_type?.toLowerCase()}</b> organization <b>{form.organization_name}</b> has been accepted.
              </Typography>
            </Box>

            {registrationResult && (
              <Card elevation={2} sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <Avatar sx={{ bgcolor: "primary.main", mr: 2 }}>
                      <Assignment />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        Registration Status
                      </Typography>
                      <Chip label={registrationResult.registration_status || "Pending Review"} color={registrationResult.registration_status === "Approved" ? "success" : "warning"} sx={{ mt: 0.5 }} />
                    </Box>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {registrationResult.message}
                  </Typography>

                  {registrationResult.next_steps && registrationResult.next_steps.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        Next Steps:
                      </Typography>
                      <List dense>
                        {registrationResult.next_steps.map((step, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              <CheckCircleOutline fontSize="small" color="primary" />
                            </ListItemIcon>
                            <ListItemText primary={step} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}

                  {registrationResult.compliance_requirements && registrationResult.compliance_requirements.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Alert severity="info">
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                          Compliance Requirements:
                        </Typography>
                        <List dense>
                          {registrationResult.compliance_requirements.map((req, index) => (
                            <ListItem key={index}>
                              <ListItemIcon>
                                <Security fontSize="small" color="info" />
                              </ListItemIcon>
                              <ListItemText primary={req} />
                            </ListItem>
                          ))}
                        </List>
                      </Alert>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            <Card elevation={1} sx={{ bgcolor: theme.palette.grey[50] }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  What's Next?
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  A verification email has been sent to <strong>{registrationResult?.email || form.primary_contact_email}</strong>. Please check your email and click the verification link to complete
                  your account setup.
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  After verifying your email and setting up your profile, your organization will be created and you'll be able to log in to the platform.
                </Typography>
                <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
                  <Button variant="outlined" size="large" onClick={() => window.open("mailto:" + (registrationResult?.email || form.primary_contact_email))} sx={{ flex: 1 }}>
                    Check Email
                  </Button>
                  <Button variant="outlined" size="large" onClick={() => navigate("/support")} sx={{ flex: 1 }}>
                    Contact Support
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        );
      default:
        return null;
    }
  };

  // Show only error if invitation is invalid or expired
  if (snackbar.severity === "error" && (snackbar.message.toLowerCase().includes("invalid") || snackbar.message.toLowerCase().includes("expired"))) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Paper sx={{ p: theme.spacing(4), maxWidth: 480, mx: "auto" }}>
          <Typography variant="h5" align="center" fontWeight="bold">
            Tenant Onboarding
          </Typography>
          <Typography variant="body1" align="center" sx={{ mt: theme.spacing(2) }}>
            The invitation link you used is invalid or has expired. Please contact your administrator for a new invitation.
          </Typography>
          <Typography align="center" sx={{ mt: theme.spacing(3) }}>
            Need help?{" "}
            <a href="/support" style={{ color: theme.palette.primary.main, textDecoration: "underline" }}>
              Contact Support
            </a>
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (loading && !invitation) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  // Show accepted invitation message if invitation was already accepted
  if (invitationAccepted && invitation) {
    return <AcceptedInvitationMessage invitation={invitation} />;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: theme.palette.grey[50], py: theme.spacing(4) }}>
      <Box sx={{ maxWidth: 800, mx: "auto", px: theme.spacing(2) }}>
        <Paper sx={{ p: theme.spacing(4) }}>
          <Box sx={{ textAlign: "center", mb: theme.spacing(4) }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">
              Tenant Onboarding
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Complete your {invitation?.tenant_type?.toLowerCase()} organization registration
            </Typography>
          </Box>

          <Stepper activeStep={activeStep} sx={{ mb: theme.spacing(4) }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {getStepContent(activeStep)}

          {/* Only show navigation buttons if not on the final step */}
          {activeStep !== steps.length - 1 && (
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: theme.spacing(4), maxWidth: 520, mx: "auto" }}>
              <Button disabled={activeStep === 0} onClick={handleBack}>
                Back
              </Button>
              <Box>
                {activeStep === steps.length - 1 ? (
                  <Button variant="contained" onClick={() => navigate("/login")}>
                    Go to Login (After Email Verification)
                  </Button>
                ) : activeStep === 1 ? (
                  <Button variant="contained" color="primary" onClick={handleNext} disabled={!termsAccepted || !complianceAcknowledged}>
                    Continue
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={() => {
                      if (activeStep === steps.length - 2) {
                        handleSubmit();
                      } else {
                        handleNext();
                      }
                    }}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : null}
                  >
                    {activeStep === steps.length - 2 ? "Complete Registration" : "Next"}
                  </Button>
                )}
              </Box>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Modern Snackbar */}
      <ModernSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} />
    </Box>
  );
};

export default OnboardingPage;
