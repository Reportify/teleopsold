import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Alert,
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
  useTheme,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import BusinessIcon from "@mui/icons-material/Business";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import BadgeIcon from "@mui/icons-material/Badge";
import { api } from "../services/api";

interface InvitationData {
  email: string;
  contact_name: string;
  tenant_type: "Corporate" | "Circle" | "Vendor";
  expires_at: string;
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
  circles: string[];

  // Circle-specific fields
  parent_tenant_id?: string;

  // Vendor-specific fields
  vendor_license_number: string;
  specialization: string[];
  coverage_areas: string[];
  service_capabilities: string[];
  years_in_business: number | null;
  employee_count: number | null;
  equipment_capabilities: string;
  certifications: string[];
}

const steps = ["Invitation Details", "Organization Information", "Complete Registration"];

const telecomCircles = [
  { code: "AP", name: "Andhra Pradesh" },
  { code: "AS", name: "Assam" },
  { code: "BH", name: "Bihar" },
  { code: "CH", name: "Chennai" },
  { code: "GJ", name: "Gujarat" },
  { code: "HR", name: "Haryana" },
  { code: "HP", name: "Himachal Pradesh" },
  { code: "JK", name: "Jammu & Kashmir" },
  { code: "KA", name: "Karnataka" },
  { code: "KL", name: "Kerala" },
  { code: "KO", name: "Kolkata" },
  { code: "MH", name: "Maharashtra & Goa" },
  { code: "MP", name: "Madhya Pradesh & Chhattisgarh" },
  { code: "MU", name: "Mumbai" },
  { code: "NE", name: "North East" },
  { code: "OR", name: "Odisha" },
  { code: "PB", name: "Punjab" },
  { code: "RJ", name: "Rajasthan" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "UPE", name: "UP (East)" },
  { code: "UPW", name: "UP (West)" },
  { code: "WB", name: "West Bengal" },
  { code: "MC", name: "Mumbai Corporate" },
];

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

const vendorServiceCapabilities = ["Dismantling", "Installation", "Maintenance", "Survey", "Planning", "Emergency Response", "Quality Assurance", "Documentation"];

const vendorCertifications = ["ISO 9001", "ISO 14001", "OHSAS 18001", "TEC Certification", "BIS Certification", "Industry Specific"];

const OnboardingPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [form, setForm] = useState<OnboardingForm>({
    organization_name: "",
    business_registration_number: "",
    primary_contact_name: "",
    primary_contact_email: "",
    primary_contact_phone: "",
    subdomain: "",
    circles: [],
    vendor_license_number: "",
    specialization: [],
    coverage_areas: [],
    service_capabilities: [],
    years_in_business: null,
    employee_count: null,
    equipment_capabilities: "",
    certifications: [],
  });

  const theme = useTheme();

  // Load invitation data
  useEffect(() => {
    if (token) {
      loadInvitationData();
    }
  }, [token]);

  const loadInvitationData = async () => {
    setLoading(true);
    try {
      // For now, we'll simulate loading invitation data
      // In production, you'd call an API to validate the token
      const mockInvitation: InvitationData = {
        email: "invited@example.com",
        contact_name: "John Doe",
        tenant_type: "Corporate",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      setInvitation(mockInvitation);
      setForm((prev) => ({
        ...prev,
        primary_contact_name: mockInvitation.contact_name,
        primary_contact_email: mockInvitation.email,
      }));
    } catch (err: any) {
      setError("Invalid or expired invitation link");
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

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await api.post("/public/invitations/accept/", {
        invitation_token: token,
        ...form,
      });

      if (response.status !== 200) {
        const errorData = response.data;
        throw new Error(errorData.message || "Registration failed");
      }

      const data = response.data;
      setActiveStep(2); // Show success step
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const getTenantTypeIcon = (type: string) => {
    switch (type) {
      case "Corporate":
        return <BusinessIcon sx={{ mr: 1 }} />;
      case "Circle":
        return <AccountTreeIcon sx={{ mr: 1 }} />;
      case "Vendor":
        return <BadgeIcon sx={{ mr: 1 }} />;
      default:
        return null;
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Invitation Details
            </Typography>
            {invitation && (
              <Box sx={{ p: theme.spacing(2), bgcolor: theme.palette.grey[50], borderRadius: theme.shape.borderRadius }}>
                <Typography variant="body1" gutterBottom>
                  <strong>Email:</strong> {invitation.email}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Contact Name:</strong> {invitation.contact_name}
                </Typography>
                <Typography variant="body1" gutterBottom sx={{ display: "flex", alignItems: "center" }}>
                  <strong>Tenant Type:</strong> {getTenantTypeIcon(invitation.tenant_type)} {invitation.tenant_type}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Expires:</strong> {new Date(invitation.expires_at).toLocaleDateString()}
                </Typography>
              </Box>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Organization Information
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: theme.spacing(3) }}>
              Please provide the required information for your {invitation?.tenant_type?.toLowerCase()} organization.
            </Typography>

            <Grid container spacing={theme.spacing(3)}>
              {/* Common Fields - Always shown */}
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Organization Name" value={form.organization_name} onChange={(e) => setForm({ ...form, organization_name: e.target.value })} fullWidth required />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Business Registration Number"
                  value={form.business_registration_number}
                  onChange={(e) => setForm({ ...form, business_registration_number: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Contact Name" value={form.primary_contact_name} onChange={(e) => setForm({ ...form, primary_contact_name: e.target.value })} fullWidth required />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Contact Email" type="email" value={form.primary_contact_email} onChange={(e) => setForm({ ...form, primary_contact_email: e.target.value })} fullWidth required />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Contact Phone" value={form.primary_contact_phone} onChange={(e) => setForm({ ...form, primary_contact_phone: e.target.value })} fullWidth required />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField label="Subdomain" value={form.subdomain} onChange={(e) => setForm({ ...form, subdomain: e.target.value })} fullWidth required helperText="e.g., mycompany-teleops" />
              </Grid>

              {/* Corporate-specific fields */}
              {invitation?.tenant_type === "Corporate" && (
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth required>
                    <InputLabel>Select Circles</InputLabel>
                    <Select
                      multiple
                      value={form.circles}
                      onChange={(e) => setForm({ ...form, circles: e.target.value as string[] })}
                      label="Select Circles"
                      renderValue={(selected) => (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: theme.spacing(0.5) }}>
                          {selected.map((value) => (
                            <Chip key={value} label={value} />
                          ))}
                        </Box>
                      )}
                    >
                      {telecomCircles.map((circle) => (
                        <MenuItem key={circle.code} value={circle.code}>
                          {circle.name} ({circle.code})
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>Select the telecom circles you operate in</FormHelperText>
                  </FormControl>
                </Grid>
              )}

              {/* Vendor-specific fields */}
              {invitation?.tenant_type === "Vendor" && (
                <>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField label="Vendor License Number" value={form.vendor_license_number} onChange={(e) => setForm({ ...form, vendor_license_number: e.target.value })} fullWidth required />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Years in Business"
                      type="number"
                      value={form.years_in_business || ""}
                      onChange={(e) => setForm({ ...form, years_in_business: parseInt(e.target.value) || null })}
                      fullWidth
                      required
                    />
                  </Grid>
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
                    <TextField
                      label="Equipment Capabilities"
                      value={form.equipment_capabilities}
                      onChange={(e) => setForm({ ...form, equipment_capabilities: e.target.value })}
                      fullWidth
                      multiline
                      rows={3}
                      helperText="Describe your equipment and technical capabilities"
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel>Specializations</InputLabel>
                      <Select
                        multiple
                        value={form.specialization}
                        onChange={(e) => setForm({ ...form, specialization: e.target.value as string[] })}
                        label="Specializations"
                        renderValue={(selected) => (
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: theme.spacing(0.5) }}>
                            {selected.map((value) => (
                              <Chip key={value} label={value} />
                            ))}
                          </Box>
                        )}
                      >
                        {vendorSpecializations.map((spec) => (
                          <MenuItem key={spec} value={spec}>
                            {spec}
                          </MenuItem>
                        ))}
                      </Select>
                      <FormHelperText>Select your areas of specialization</FormHelperText>
                    </FormControl>
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
                </>
              )}

              {/* Circle-specific fields - would need parent tenant selection */}
              {invitation?.tenant_type === "Circle" && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ p: theme.spacing(2), bgcolor: theme.palette.info.light, borderRadius: theme.shape.borderRadius }}>
                    Circle tenant setup will be handled by your corporate parent. Please contact your corporate administrator for circle-specific configuration.
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h6" gutterBottom color={theme.palette.success.main}>
              Registration Complete!
            </Typography>
            <Typography variant="body1" gutterBottom>
              Your {invitation?.tenant_type?.toLowerCase()} tenant has been created successfully. An admin will review and activate your account.
            </Typography>
            <Button variant="contained" onClick={() => navigate("/login")} sx={{ mt: theme.spacing(2) }}>
              Go to Login
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  if (loading && !invitation) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <Alert severity="error" sx={{ maxWidth: 400 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: theme.palette.grey[50], py: theme.spacing(4) }}>
      <Box sx={{ maxWidth: 800, mx: "auto", px: theme.spacing(2) }}>
        <Paper sx={{ p: theme.spacing(4) }}>
          <Box sx={{ textAlign: "center", mb: theme.spacing(4) }}>
            <Typography variant="h4" gutterBottom fontWeight={theme.typography.h6.fontWeight}>
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

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: theme.spacing(4) }}>
            <Button disabled={activeStep === 0} onClick={handleBack}>
              Back
            </Button>
            <Box>
              {activeStep === steps.length - 1 ? (
                <Button variant="contained" onClick={() => navigate("/login")}>
                  Go to Login
                </Button>
              ) : (
                <Button variant="contained" onClick={activeStep === steps.length - 2 ? handleSubmit : handleNext} disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : null}>
                  {activeStep === steps.length - 2 ? "Complete Registration" : "Next"}
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default OnboardingPage;
