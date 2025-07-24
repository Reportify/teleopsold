// Vendor Operations Management Page
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
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
  Switch,
  FormControlLabel,
  Alert,
  Autocomplete,
  Checkbox,
} from "@mui/material";
import { Add, Business, School, People, Assignment, MoreVert, Edit, Delete, Visibility, CheckCircle, Cancel, Warning, Search, FilterList, Download, Refresh, PersonAdd } from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { ModernSnackbar } from "../components";

// ============================================================================
// Types and Interfaces
// ============================================================================

interface Department {
  id: string;
  name: string;
  code: string;
  description: string;
  parent_department: string | null;
  parent_department_name?: string;
  is_operational: boolean;
  is_active: boolean;
  full_name: string;
  sub_departments_count: number;
  designations_count: number;
  employees_count: number;
}

interface CertificationType {
  id: string;
  name: string;
  code: string;
  description: string;
  category: string;
  is_predefined: boolean;
  is_mandatory_for_field: boolean;
  validity_period_days: number | null;
  renewal_required: boolean;
  advance_notification_days: number;
  is_active: boolean;
  employees_with_certification: number;
  designations_requiring: number;
}

interface VendorOperationalDesignation {
  id: string;
  name: string;
  code: string;
  description: string;
  department: string;
  department_name: string;
  department_full_name: string;
  is_field_designation: boolean;
  requires_supervision: boolean;
  can_supervise_others: boolean;
  max_team_size: number | null;
  required_certifications: string[];
  required_certifications_list: CertificationType[];
  rbac_permissions: string[];
  parent_designation: string | null;
  parent_designation_name?: string;
  hierarchy_level: number;
  is_active: boolean;
  employees_count: number;
  field_ready_employees_count: number;
}

interface VendorEmployee {
  id: string;
  name: string;
  email: string;
  phone: string;
  employee_id: string;
  designation: string;
  designation_name: string;
  department_name: string;
  date_of_joining: string;
  employment_type: string;
  is_field_ready: boolean;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  status: "Active" | "Inactive" | "Suspended" | "Terminated";
  certification_compliance_rate: number;
  active_certifications_count: number;
  expired_certifications_count: number;
  expiring_soon_count: number;
  required_certifications_count: number;
}

interface EmployeeCertification {
  id: string;
  employee: string;
  employee_name: string;
  certification_type: string;
  certification_name: string;
  certification_category: string;
  certificate_number: string;
  issuing_authority: string;
  issue_date: string;
  expiry_date: string | null;
  status: "Active" | "Expired" | "Suspended" | "Revoked";
  is_verified: boolean;
  is_active: boolean;
  days_to_expiry: number | null;
  is_expiring_soon: boolean;
}

interface OperationalDashboard {
  employee_metrics: {
    total_employees: number;
    active_employees: number;
    field_ready_employees: number;
    field_readiness_rate: number;
  };
  designation_metrics: {
    total_designations: number;
    field_designations: number;
    departments_with_employees: number;
  };
  certification_metrics: {
    total_certifications: number;
    active_certifications: number;
    expired_certifications: number;
    expiring_soon: number;
    compliance_rate: number;
  };
}

// ============================================================================
// Form Interfaces
// ============================================================================

interface DepartmentForm {
  name: string;
  code: string;
  description: string;
  parent_department: string;
  is_operational: boolean;
}

interface CertificationTypeForm {
  name: string;
  code: string;
  description: string;
  category: string;
  is_mandatory_for_field: boolean;
  validity_period_days: number | null;
  renewal_required: boolean;
  advance_notification_days: number;
}

interface DesignationForm {
  name: string;
  code: string;
  description: string;
  department: string;
  is_field_designation: boolean;
  requires_supervision: boolean;
  can_supervise_others: boolean;
  max_team_size: number | null;
  required_certifications: string[];
  rbac_permissions: string[];
  parent_designation: string;
  hierarchy_level: number;
}

interface EmployeeForm {
  name: string;
  email: string;
  phone: string;
  employee_id: string;
  designation: string;
  date_of_joining: string;
  employment_type: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

// ============================================================================
// Main Component
// ============================================================================

const VendorOperationsManagementPage: React.FC = () => {
  const { getCurrentTenant } = useAuth();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // Dashboard data
  const [dashboardData, setDashboardData] = useState<OperationalDashboard | null>(null);

  // Data states
  const [departments, setDepartments] = useState<Department[]>([]);
  const [certificationTypes, setCertificationTypes] = useState<CertificationType[]>([]);
  const [designations, setDesignations] = useState<VendorOperationalDesignation[]>([]);
  const [employees, setEmployees] = useState<VendorEmployee[]>([]);

  // Dialog states
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [certificationDialogOpen, setCertificationDialogOpen] = useState(false);
  const [designationDialogOpen, setDesignationDialogOpen] = useState(false);
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);

  // Form states
  const [departmentForm, setDepartmentForm] = useState<DepartmentForm>({
    name: "",
    code: "",
    description: "",
    parent_department: "",
    is_operational: true,
  });

  const [certificationForm, setCertificationForm] = useState<CertificationTypeForm>({
    name: "",
    code: "",
    description: "",
    category: "Safety",
    is_mandatory_for_field: false,
    validity_period_days: 365,
    renewal_required: true,
    advance_notification_days: 30,
  });

  const [designationForm, setDesignationForm] = useState<DesignationForm>({
    name: "",
    code: "",
    description: "",
    department: "",
    is_field_designation: true,
    requires_supervision: false,
    can_supervise_others: false,
    max_team_size: null,
    required_certifications: [],
    rbac_permissions: [],
    parent_designation: "",
    hierarchy_level: 1,
  });

  const [employeeForm, setEmployeeForm] = useState<EmployeeForm>({
    name: "",
    email: "",
    phone: "",
    employee_id: "",
    designation: "",
    date_of_joining: new Date().toISOString().split("T")[0],
    employment_type: "Full-time",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });

  // Menu states
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "info" | "success" | "warning" | "error",
  });

  const currentTenant = getCurrentTenant();

  // ========================================================================
  // Data Loading Functions
  // ========================================================================

  const loadDashboardData = useCallback(async () => {
    if (!currentTenant) return;

    try {
      const response = await fetch(`/api/v1/vendor-operations/tenants/${currentTenant.id}/dashboard/`);
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    }
  }, [currentTenant]);

  const loadDepartments = useCallback(async () => {
    if (!currentTenant) return;

    try {
      const response = await fetch(`/api/v1/vendor-operations/tenants/${currentTenant.id}/departments/`);
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      }
    } catch (error) {
      console.error("Failed to load departments:", error);
    }
  }, [currentTenant]);

  const loadCertificationTypes = useCallback(async () => {
    if (!currentTenant) return;

    try {
      const response = await fetch(`/api/v1/vendor-operations/tenants/${currentTenant.id}/certification-types/`);
      if (response.ok) {
        const data = await response.json();
        setCertificationTypes(data);
      }
    } catch (error) {
      console.error("Failed to load certification types:", error);
    }
  }, [currentTenant]);

  const loadDesignations = useCallback(async () => {
    if (!currentTenant) return;

    try {
      const response = await fetch(`/api/v1/vendor-operations/tenants/${currentTenant.id}/designations/`);
      if (response.ok) {
        const data = await response.json();
        setDesignations(data);
      }
    } catch (error) {
      console.error("Failed to load designations:", error);
    }
  }, [currentTenant]);

  const loadEmployees = useCallback(async () => {
    if (!currentTenant) return;

    try {
      const response = await fetch(`/api/v1/vendor-operations/tenants/${currentTenant.id}/employees/`);
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error("Failed to load employees:", error);
    }
  }, [currentTenant]);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadDashboardData(), loadDepartments(), loadCertificationTypes(), loadDesignations(), loadEmployees()]);
    } finally {
      setLoading(false);
    }
  }, [loadDashboardData, loadDepartments, loadCertificationTypes, loadDesignations, loadEmployees]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ========================================================================
  // Form Handlers
  // ========================================================================

  const handleCreateDepartment = async () => {
    if (!currentTenant) return;

    try {
      const response = await fetch(`/api/v1/vendor-operations/tenants/${currentTenant.id}/departments/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(departmentForm),
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: "Department created successfully!",
          severity: "success",
        });
        setDepartmentDialogOpen(false);
        setDepartmentForm({
          name: "",
          code: "",
          description: "",
          parent_department: "",
          is_operational: true,
        });
        loadDepartments();
      } else {
        throw new Error("Failed to create department");
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to create department. Please try again.",
        severity: "error",
      });
    }
  };

  const handleCreateCertificationType = async () => {
    if (!currentTenant) return;

    try {
      const response = await fetch(`/api/v1/vendor-operations/tenants/${currentTenant.id}/certification-types/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(certificationForm),
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: "Certification type created successfully!",
          severity: "success",
        });
        setCertificationDialogOpen(false);
        setCertificationForm({
          name: "",
          code: "",
          description: "",
          category: "Safety",
          is_mandatory_for_field: false,
          validity_period_days: 365,
          renewal_required: true,
          advance_notification_days: 30,
        });
        loadCertificationTypes();
      } else {
        throw new Error("Failed to create certification type");
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to create certification type. Please try again.",
        severity: "error",
      });
    }
  };

  const handleCreateDesignation = async () => {
    if (!currentTenant) return;

    try {
      const response = await fetch(`/api/v1/vendor-operations/tenants/${currentTenant.id}/designations/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(designationForm),
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: "Designation created successfully!",
          severity: "success",
        });
        setDesignationDialogOpen(false);
        setDesignationForm({
          name: "",
          code: "",
          description: "",
          department: "",
          is_field_designation: true,
          requires_supervision: false,
          can_supervise_others: false,
          max_team_size: null,
          required_certifications: [],
          rbac_permissions: [],
          parent_designation: "",
          hierarchy_level: 1,
        });
        loadDesignations();
      } else {
        throw new Error("Failed to create designation");
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to create designation. Please try again.",
        severity: "error",
      });
    }
  };

  const handleCreateEmployee = async () => {
    if (!currentTenant) return;

    try {
      const response = await fetch(`/api/v1/vendor-operations/tenants/${currentTenant.id}/employees/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(employeeForm),
      });

      if (response.ok) {
        setSnackbar({
          open: true,
          message: "Employee created successfully!",
          severity: "success",
        });
        setEmployeeDialogOpen(false);
        setEmployeeForm({
          name: "",
          email: "",
          phone: "",
          employee_id: "",
          designation: "",
          date_of_joining: new Date().toISOString().split("T")[0],
          employment_type: "Full-time",
          address: "",
          emergency_contact_name: "",
          emergency_contact_phone: "",
        });
        loadEmployees();
        loadDashboardData(); // Refresh dashboard
      } else {
        throw new Error("Failed to create employee");
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to create employee. Please try again.",
        severity: "error",
      });
    }
  };

  const handleCreatePredefinedCertifications = async () => {
    if (!currentTenant) return;

    try {
      const response = await fetch(`/api/v1/vendor-operations/tenants/${currentTenant.id}/certification-types/create-predefined/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSnackbar({
          open: true,
          message: data.message,
          severity: "success",
        });
        loadCertificationTypes();
      } else {
        throw new Error("Failed to create predefined certifications");
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to create predefined certifications. Please try again.",
        severity: "error",
      });
    }
  };

  // ========================================================================
  // Filter Functions
  // ========================================================================

  const getFilteredEmployees = useCallback(() => {
    let filtered = [...employees];

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (employee) =>
          employee.name.toLowerCase().includes(search) ||
          employee.email.toLowerCase().includes(search) ||
          employee.employee_id.toLowerCase().includes(search) ||
          employee.designation_name.toLowerCase().includes(search)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((employee) => employee.status === statusFilter);
    }

    if (departmentFilter) {
      filtered = filtered.filter((employee) => employee.department_name === departmentFilter);
    }

    return filtered;
  }, [employees, searchTerm, statusFilter, departmentFilter]);

  // ========================================================================
  // Tab Content Renderers
  // ========================================================================

  const renderDashboardTab = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom fontWeight={600}>
        Operations Dashboard
      </Typography>

      {dashboardData && (
        <Grid container spacing={3}>
          {/* Employee Metrics */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total Employees
                    </Typography>
                    <Typography variant="h4" fontWeight={600}>
                      {dashboardData.employee_metrics.total_employees}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {dashboardData.employee_metrics.active_employees} active
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                    <People />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Field Ready
                    </Typography>
                    <Typography variant="h4" fontWeight={600} color="success.main">
                      {dashboardData.employee_metrics.field_ready_employees}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {dashboardData.employee_metrics.field_readiness_rate.toFixed(1)}% ready
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                    <CheckCircle />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Designations
                    </Typography>
                    <Typography variant="h4" fontWeight={600}>
                      {dashboardData.designation_metrics.total_designations}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {dashboardData.designation_metrics.field_designations} field roles
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: theme.palette.info.main }}>
                    <Assignment />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Certification Metrics */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Certification Overview
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                  <Box>
                    <Typography variant="h5" fontWeight={600}>
                      {dashboardData.certification_metrics.total_certifications}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Certifications
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="h5" fontWeight={600} color="success.main">
                      {dashboardData.certification_metrics.compliance_rate.toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Compliance Rate
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Chip label={`${dashboardData.certification_metrics.active_certifications} Active`} color="success" size="small" />
                  <Chip label={`${dashboardData.certification_metrics.expired_certifications} Expired`} color="error" size="small" />
                  <Chip label={`${dashboardData.certification_metrics.expiring_soon} Expiring Soon`} color="warning" size="small" />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Button variant="outlined" startIcon={<Add />} onClick={() => setEmployeeDialogOpen(true)} fullWidth>
                    Add New Employee
                  </Button>
                  <Button variant="outlined" startIcon={<School />} onClick={handleCreatePredefinedCertifications} fullWidth>
                    Setup Standard Certifications
                  </Button>
                  <Button variant="outlined" startIcon={<Download />} fullWidth>
                    Export Compliance Report
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );

  const renderDepartmentsTab = () => (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Departments
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDepartmentDialogOpen(true)}>
          Add Department
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Code</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Parent</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Type
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Designations
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Employees
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {departments.map((department) => (
              <TableRow key={department.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      {department.name}
                    </Typography>
                    {department.description && (
                      <Typography variant="caption" color="text.secondary">
                        {department.description}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={department.code} size="small" variant="outlined" />
                </TableCell>
                <TableCell>{department.parent_department_name || "-"}</TableCell>
                <TableCell align="center">
                  <Chip label={department.is_operational ? "Operational" : "Support"} color={department.is_operational ? "primary" : "default"} size="small" />
                </TableCell>
                <TableCell align="center">{department.designations_count}</TableCell>
                <TableCell align="center">{department.employees_count}</TableCell>
                <TableCell align="center">
                  <IconButton size="small">
                    <MoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderCertificationsTab = () => (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Certification Types
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="outlined" onClick={handleCreatePredefinedCertifications}>
            Setup Standard Certs
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => setCertificationDialogOpen(true)}>
            Add Certification Type
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Certification</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Field Required
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Validity
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Employees
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Designations
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {certificationTypes.map((cert) => (
              <TableRow key={cert.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      {cert.name}
                    </Typography>
                    <Chip label={cert.code} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                    {cert.is_predefined && <Chip label="Standard" size="small" color="info" sx={{ mt: 0.5, ml: 1 }} />}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={cert.category} size="small" />
                </TableCell>
                <TableCell align="center">{cert.is_mandatory_for_field ? <CheckCircle color="error" /> : <Cancel color="disabled" />}</TableCell>
                <TableCell align="center">{cert.validity_period_days ? `${cert.validity_period_days} days` : "No expiry"}</TableCell>
                <TableCell align="center">{cert.employees_with_certification}</TableCell>
                <TableCell align="center">{cert.designations_requiring}</TableCell>
                <TableCell align="center">
                  <IconButton size="small">
                    <MoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderDesignationsTab = () => (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Operational Designations
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setDesignationDialogOpen(true)}>
          Add Designation
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Designation</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Type
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Level
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Employees
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Field Ready
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {designations.map((designation) => (
              <TableRow key={designation.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      {designation.name}
                    </Typography>
                    <Chip label={designation.code} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{designation.department_name}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip label={designation.is_field_designation ? "Field" : "Office"} color={designation.is_field_designation ? "primary" : "default"} size="small" />
                </TableCell>
                <TableCell align="center">
                  <Chip label={`Level ${designation.hierarchy_level}`} size="small" variant="outlined" />
                </TableCell>
                <TableCell align="center">{designation.employees_count}</TableCell>
                <TableCell align="center">
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {designation.field_ready_employees_count}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      / {designation.employees_count}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small">
                    <MoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderEmployeesTab = () => (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h5" fontWeight={600}>
          Employees
        </Typography>
        <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setEmployeeDialogOpen(true)}>
          Add Employee
        </Button>
      </Box>

      {/* Filters */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: "text.secondary" }} />,
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
                <MenuItem value="Suspended">Suspended</MenuItem>
                <MenuItem value="Terminated">Terminated</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Department</InputLabel>
              <Select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} label="Department">
                <MenuItem value="">All Departments</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.name}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <Button variant="outlined" startIcon={<Refresh />} onClick={loadEmployees} fullWidth>
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Employee</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Designation</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Department</TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Status
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Field Ready
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Compliance
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getFilteredEmployees().map((employee) => (
              <TableRow key={employee.id} hover>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar sx={{ bgcolor: theme.palette.primary.main }}>{employee.name.charAt(0)}</Avatar>
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        {employee.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {employee.employee_id}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        📧 {employee.email}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{employee.designation_name}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{employee.department_name}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={employee.status}
                    color={employee.status === "Active" ? "success" : employee.status === "Suspended" ? "warning" : employee.status === "Terminated" ? "error" : "default"}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">{employee.is_field_ready ? <CheckCircle color="success" /> : <Warning color="warning" />}</TableCell>
                <TableCell align="center">
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                    <Typography variant="body2" fontWeight={600} color={employee.certification_compliance_rate >= 80 ? "success.main" : "warning.main"}>
                      {employee.certification_compliance_rate.toFixed(0)}%
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {employee.active_certifications_count}/{employee.required_certifications_count}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small">
                    <MoreVert />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // ========================================================================
  // Render
  // ========================================================================

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Vendor Operations Management
        </Typography>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Loading operational data...
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
            Vendor Operations Management
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage operational designations, certifications, and employee readiness for {currentTenant?.organization_name}
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<Refresh />} onClick={loadAllData} disabled={loading}>
          Refresh Data
        </Button>
      </Box>

      {/* Main Content */}
      <Paper elevation={3}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tab label="Dashboard" icon={<Business />} />
          <Tab label="Departments" icon={<Business />} />
          <Tab label="Certifications" icon={<School />} />
          <Tab label="Designations" icon={<Assignment />} />
          <Tab label="Employees" icon={<People />} />
        </Tabs>

        {activeTab === 0 && renderDashboardTab()}
        {activeTab === 1 && renderDepartmentsTab()}
        {activeTab === 2 && renderCertificationsTab()}
        {activeTab === 3 && renderDesignationsTab()}
        {activeTab === 4 && renderEmployeesTab()}
      </Paper>

      {/* Department Dialog */}
      <Dialog open={departmentDialogOpen} onClose={() => setDepartmentDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Department</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label="Department Name" value={departmentForm.name} onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })} fullWidth required />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label="Department Code" value={departmentForm.code} onChange={(e) => setDepartmentForm({ ...departmentForm, code: e.target.value })} fullWidth required />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Description" value={departmentForm.description} onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })} fullWidth multiline rows={3} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Parent Department</InputLabel>
                <Select value={departmentForm.parent_department} onChange={(e) => setDepartmentForm({ ...departmentForm, parent_department: e.target.value })} label="Parent Department">
                  <MenuItem value="">None (Top Level)</MenuItem>
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={<Switch checked={departmentForm.is_operational} onChange={(e) => setDepartmentForm({ ...departmentForm, is_operational: e.target.checked })} />}
                label="Operational Department"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepartmentDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateDepartment}>
            Create Department
          </Button>
        </DialogActions>
      </Dialog>

      {/* Certification Type Dialog */}
      <Dialog open={certificationDialogOpen} onClose={() => setCertificationDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Certification Type</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label="Certification Name" value={certificationForm.name} onChange={(e) => setCertificationForm({ ...certificationForm, name: e.target.value })} fullWidth required />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label="Certification Code" value={certificationForm.code} onChange={(e) => setCertificationForm({ ...certificationForm, code: e.target.value })} fullWidth required />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Description"
                value={certificationForm.description}
                onChange={(e) => setCertificationForm({ ...certificationForm, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select value={certificationForm.category} onChange={(e) => setCertificationForm({ ...certificationForm, category: e.target.value })} label="Category">
                  <MenuItem value="Safety">Safety</MenuItem>
                  <MenuItem value="Technical">Technical</MenuItem>
                  <MenuItem value="Medical">Medical</MenuItem>
                  <MenuItem value="Compliance">Compliance</MenuItem>
                  <MenuItem value="Quality">Quality</MenuItem>
                  <MenuItem value="Custom">Custom</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Validity Period (Days)"
                type="number"
                value={certificationForm.validity_period_days || ""}
                onChange={(e) =>
                  setCertificationForm({
                    ...certificationForm,
                    validity_period_days: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                fullWidth
                helperText="Leave empty for no expiry"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Advance Notification (Days)"
                type="number"
                value={certificationForm.advance_notification_days}
                onChange={(e) =>
                  setCertificationForm({
                    ...certificationForm,
                    advance_notification_days: parseInt(e.target.value) || 30,
                  })
                }
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={<Switch checked={certificationForm.is_mandatory_for_field} onChange={(e) => setCertificationForm({ ...certificationForm, is_mandatory_for_field: e.target.checked })} />}
                label="Mandatory for Field Work"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={<Switch checked={certificationForm.renewal_required} onChange={(e) => setCertificationForm({ ...certificationForm, renewal_required: e.target.checked })} />}
                label="Renewal Required"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCertificationDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateCertificationType}>
            Create Certification Type
          </Button>
        </DialogActions>
      </Dialog>

      {/* Designation Dialog */}
      <Dialog open={designationDialogOpen} onClose={() => setDesignationDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Add New Designation</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label="Designation Name" value={designationForm.name} onChange={(e) => setDesignationForm({ ...designationForm, name: e.target.value })} fullWidth required />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label="Designation Code" value={designationForm.code} onChange={(e) => setDesignationForm({ ...designationForm, code: e.target.value })} fullWidth required />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Description"
                value={designationForm.description}
                onChange={(e) => setDesignationForm({ ...designationForm, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Department</InputLabel>
                <Select value={designationForm.department} onChange={(e) => setDesignationForm({ ...designationForm, department: e.target.value })} label="Department">
                  {departments.map((dept) => (
                    <MenuItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Hierarchy Level"
                type="number"
                value={designationForm.hierarchy_level}
                onChange={(e) =>
                  setDesignationForm({
                    ...designationForm,
                    hierarchy_level: parseInt(e.target.value) || 1,
                  })
                }
                fullWidth
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Parent Designation</InputLabel>
                <Select value={designationForm.parent_designation} onChange={(e) => setDesignationForm({ ...designationForm, parent_designation: e.target.value })} label="Parent Designation">
                  <MenuItem value="">None (Top Level)</MenuItem>
                  {designations.map((designation) => (
                    <MenuItem key={designation.id} value={designation.id}>
                      {designation.name} (Level {designation.hierarchy_level})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Max Team Size"
                type="number"
                value={designationForm.max_team_size || ""}
                onChange={(e) =>
                  setDesignationForm({
                    ...designationForm,
                    max_team_size: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                fullWidth
                helperText="Leave empty for no limit"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Autocomplete
                multiple
                options={certificationTypes}
                getOptionLabel={(option) => option.name}
                value={certificationTypes.filter((cert) => designationForm.required_certifications.includes(cert.id))}
                onChange={(_, newValue) =>
                  setDesignationForm({
                    ...designationForm,
                    required_certifications: newValue.map((cert) => cert.id),
                  })
                }
                renderInput={(params) => <TextField {...params} label="Required Certifications" placeholder="Select certifications required for this designation" />}
                renderOption={(props, option, { selected }) => (
                  <li {...props}>
                    <Checkbox style={{ marginRight: 8 }} checked={selected} />
                    <Box>
                      <Typography variant="body2">{option.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.category} • {option.is_mandatory_for_field ? "Field Required" : "Optional"}
                      </Typography>
                    </Box>
                  </li>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControlLabel
                control={<Switch checked={designationForm.is_field_designation} onChange={(e) => setDesignationForm({ ...designationForm, is_field_designation: e.target.checked })} />}
                label="Field Designation"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControlLabel
                control={<Switch checked={designationForm.requires_supervision} onChange={(e) => setDesignationForm({ ...designationForm, requires_supervision: e.target.checked })} />}
                label="Requires Supervision"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControlLabel
                control={<Switch checked={designationForm.can_supervise_others} onChange={(e) => setDesignationForm({ ...designationForm, can_supervise_others: e.target.checked })} />}
                label="Can Supervise Others"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDesignationDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateDesignation}>
            Create Designation
          </Button>
        </DialogActions>
      </Dialog>

      {/* Employee Dialog */}
      <Dialog open={employeeDialogOpen} onClose={() => setEmployeeDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Employee</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label="Full Name" value={employeeForm.name} onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })} fullWidth required />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label="Employee ID" value={employeeForm.employee_id} onChange={(e) => setEmployeeForm({ ...employeeForm, employee_id: e.target.value })} fullWidth required />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label="Email" type="email" value={employeeForm.email} onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })} fullWidth required />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField label="Phone" value={employeeForm.phone} onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })} fullWidth required />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>Designation</InputLabel>
                <Select value={employeeForm.designation} onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value })} label="Designation">
                  {designations.map((designation) => (
                    <MenuItem key={designation.id} value={designation.id}>
                      {designation.name} ({designation.department_name})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Date of Joining"
                type="date"
                value={employeeForm.date_of_joining}
                onChange={(e) => setEmployeeForm({ ...employeeForm, date_of_joining: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Employment Type</InputLabel>
                <Select value={employeeForm.employment_type} onChange={(e) => setEmployeeForm({ ...employeeForm, employment_type: e.target.value })} label="Employment Type">
                  <MenuItem value="Full-time">Full-time</MenuItem>
                  <MenuItem value="Part-time">Part-time</MenuItem>
                  <MenuItem value="Contract">Contract</MenuItem>
                  <MenuItem value="Temporary">Temporary</MenuItem>
                  <MenuItem value="Consultant">Consultant</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Address" value={employeeForm.address} onChange={(e) => setEmployeeForm({ ...employeeForm, address: e.target.value })} fullWidth multiline rows={2} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Emergency Contact Name"
                value={employeeForm.emergency_contact_name}
                onChange={(e) => setEmployeeForm({ ...employeeForm, emergency_contact_name: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Emergency Contact Phone"
                value={employeeForm.emergency_contact_phone}
                onChange={(e) => setEmployeeForm({ ...employeeForm, emergency_contact_phone: e.target.value })}
                fullWidth
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmployeeDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateEmployee}>
            Add Employee
          </Button>
        </DialogActions>
      </Dialog>

      <ModernSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} />
    </Box>
  );
};

export default VendorOperationsManagementPage;
