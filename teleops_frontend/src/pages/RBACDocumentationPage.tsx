import React, { useState } from "react";
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from "@mui/material";
import {
  Architecture as ArchitectureIcon,
  Dashboard as DashboardIcon,
  Code as CodeIcon,
  Api as ApiIcon,
  BugReport as BugReportIcon,
  Lightbulb as LightbulbIcon,
  CheckCircle as CheckCircleIcon,
  Visibility as VisibilityIcon,
  AccountTree as AccountTreeIcon,
  Storage as StorageIcon,
  Shield as ShieldIcon,
  Assignment as AssignmentIcon,
  Analytics as AnalyticsIcon,
  ExpandMore as ExpandMoreIcon,
  ContentCopy as ContentCopyIcon,
} from "@mui/icons-material";
import MermaidDiagram from "../components/MermaidDiagram";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} id={`documentation-tabpanel-${index}`} aria-labelledby={`documentation-tab-${index}`} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const RBACDocumentationPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 4, mb: 4, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white" }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: "bold" }}>
          🛡️ RBAC Module Documentation
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.9 }}>
          Comprehensive Role-Based Access Control System Manual
        </Typography>
        <Typography variant="body1" sx={{ mt: 2, opacity: 0.8 }}>
          Enterprise-grade permission management with intuitive interfaces and robust security
        </Typography>
      </Paper>

      {/* Navigation Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tab icon={<LightbulbIcon />} label="Overview" />
          <Tab icon={<ArchitectureIcon />} label="Architecture" />
          <Tab icon={<DashboardIcon />} label="Features" />
          <Tab icon={<CodeIcon />} label="Implementation" />
          <Tab icon={<ApiIcon />} label="API Reference" />
          <Tab icon={<BugReportIcon />} label="Troubleshooting" />
          <Tab icon={<VisibilityIcon />} label="Visual Diagrams" />
        </Tabs>
      </Paper>

      {/* Overview Tab */}
      <TabPanel value={tabValue} index={0}>
        <Typography variant="h4" gutterBottom>
          📋 Project Overview
        </Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          The RBAC module is a comprehensive, enterprise-grade permission management system built for the Teleops platform. It provides sophisticated access control mechanisms with intuitive user
          interfaces and robust backend architecture.
        </Alert>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          ✅ Key Achievements
        </Typography>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 4 }}>
          {[
            { title: "Three-Tier Permission System", description: "Designation → Group → Override hierarchy", icon: <AccountTreeIcon /> },
            { title: "Real-time Analytics", description: "Comprehensive dashboards and reporting", icon: <AnalyticsIcon /> },
            { title: "Administrator Privileges", description: "Special handling for full-access users", icon: <ShieldIcon /> },
            { title: "Audit Trail", description: "Complete tracking of permission changes", icon: <AssignmentIcon /> },
          ].map((feature, index) => (
            <Card key={index} sx={{ minWidth: 250, flex: "1 1 250px" }}>
              <CardContent sx={{ textAlign: "center" }}>
                <Box sx={{ color: "primary.main", mb: 2 }}>{feature.icon}</Box>
                <Typography variant="h6" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            🎯 Executive Summary
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            <Box sx={{ flex: "1 1 300px" }}>
              <Typography variant="h6" gutterBottom color="primary">
                🔒 Security Benefits
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary="Granular permission management" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary="Automated security monitoring" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary="Regulatory compliance" />
                </ListItem>
              </List>
            </Box>

            <Box sx={{ flex: "1 1 300px" }}>
              <Typography variant="h6" gutterBottom color="primary">
                ⚡ Operational Efficiency
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary="Streamlined workflows" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary="Self-service capabilities" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary="Automated reporting" />
                </ListItem>
              </List>
            </Box>

            <Box sx={{ flex: "1 1 300px" }}>
              <Typography variant="h6" gutterBottom color="primary">
                📈 Scalability
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary="Multi-tenant architecture" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary="Performance optimization" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="success" />
                  </ListItemIcon>
                  <ListItemText primary="External integrations" />
                </ListItem>
              </List>
            </Box>
          </Box>
        </Paper>
      </TabPanel>

      {/* Architecture Tab */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="h4" gutterBottom>
          🏗️ System Architecture
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            📊 Technology Stack
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            <Card sx={{ flex: "1 1 400px" }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Frontend Stack
                </Typography>
                <List dense>
                  {["React 18+ with TypeScript", "Material-UI (MUI) v5", "Axios for API communication", "Custom hooks for state management", "Responsive design patterns"].map((tech, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <CodeIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={tech} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>

            <Card sx={{ flex: "1 1 400px" }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Backend Stack
                </Typography>
                <List dense>
                  {["Django 4.x with Python 3.9+", "Django REST Framework", "PostgreSQL database", "Redis caching", "JWT authentication"].map((tech, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <StorageIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={tech} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Box>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            🔄 Permission Calculation Flow
          </Typography>
          <Box sx={{ bgcolor: "grey.50", p: 3, borderRadius: 2 }}>
            <Typography variant="body1" gutterBottom>
              <strong>1. Administrator Check:</strong> Special handling for admin users
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>2. Designation Permissions:</strong> Base role-based permissions
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>3. Group Permissions:</strong> Team/project additions
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>4. Override Permissions:</strong> Individual modifications
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>5. Conflict Resolution:</strong> Intelligent precedence rules
            </Typography>
            <Typography variant="body1">
              <strong>6. Caching:</strong> Performance optimization
            </Typography>
          </Box>
        </Paper>
      </TabPanel>

      {/* Features Tab */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h4" gutterBottom>
          🚀 Core Features
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            📊 Dashboard Components
          </Typography>
          <Typography variant="body1" gutterBottom>
            The RBAC module provides four main dashboard views for comprehensive permission management:
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <DashboardIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Overview Tab" secondary="System-wide permission matrix with interactive grid" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <DashboardIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="User Analysis Tab" secondary="Individual user permission breakdown and risk assessment" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <DashboardIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Permission Analysis Tab" secondary="Permission-centric view showing usage statistics" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <DashboardIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Analytics Tab" secondary="Trends, insights, and compliance reporting" />
            </ListItem>
          </List>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            🔐 Permission System Structure
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            Three-Tier Permission Model
          </Alert>

          <Typography variant="body1" gutterBottom>
            <strong>1. Designation Permissions (Base Level):</strong> Base permissions assigned to job roles/designations, inherited by all users.
          </Typography>

          <Typography variant="body1" gutterBottom>
            <strong>2. Group Permissions (Team/Project Level):</strong> Functional permissions for specific teams/projects, can supplement designation permissions.
          </Typography>

          <Typography variant="body1" gutterBottom>
            <strong>3. Override Permissions (Individual Level):</strong> Individual user-specific permissions with highest priority, can grant or deny access.
          </Typography>

          <Alert severity="success" sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Administrator Privileges
            </Typography>
            <Typography variant="body2">
              Users with "Administrator" designation receive special treatment: automatically granted ALL active permissions, bypasses normal calculation, cannot be restricted by overrides, and
              maintains full audit trail for compliance.
            </Typography>
          </Alert>
        </Paper>
      </TabPanel>

      {/* Implementation Tab */}
      <TabPanel value={tabValue} index={3}>
        <Typography variant="h4" gutterBottom>
          🔧 Implementation Details
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          The RBAC system is built with a modern, scalable architecture using React frontend and Django backend.
        </Alert>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            📱 Frontend Components
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="ComprehensivePermissionDashboard.tsx" secondary="Main dashboard container with 4 tabs, state management, and real-time data coordination" />
            </ListItem>
            <ListItem>
              <ListItemText primary="PermissionAssignmentPanel.tsx" secondary="Multi-step assignment workflow with form validation and submission handling" />
            </ListItem>
            <ListItem>
              <ListItemText primary="MyPermissionsPage.tsx" secondary="Personal permission view with real-time display and administrator badge logic" />
            </ListItem>
            <ListItem>
              <ListItemText primary="rbacAPI.ts" secondary="API service layer with HTTP request handling and error management" />
            </ListItem>
          </List>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            🔒 Security & Compliance
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            <Box sx={{ flex: "1 1 300px" }}>
              <Typography variant="h6" gutterBottom color="primary">
                Security Features
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="JWT token authentication" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Tenant isolation" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Real-time permission validation" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="IP address tracking" />
                </ListItem>
              </List>
            </Box>

            <Box sx={{ flex: "1 1 300px" }}>
              <Typography variant="h6" gutterBottom color="primary">
                Compliance Standards
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="SOX Compliance" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="ISO 27001" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="GDPR Support" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Custom Regulatory" />
                </ListItem>
              </List>
            </Box>
          </Box>
        </Paper>
      </TabPanel>

      {/* API Reference Tab */}
      <TabPanel value={tabValue} index={4}>
        <Typography variant="h4" gutterBottom>
          🔌 API Reference
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Base URL:</strong> /api/v1/tenants/rbac/
          <br />
          <strong>Authentication:</strong> JWT Bearer Token
          <br />
          <strong>Content-Type:</strong> application/json
        </Alert>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            📡 Core Endpoints
          </Typography>

          <List>
            <ListItem>
              <ListItemText primary="GET /groups/comprehensive_dashboard/" secondary="Main dashboard data with multiple view types (overview, user_analysis, permission_analysis, analytics)" />
            </ListItem>
            <ListItem>
              <ListItemText primary="POST /designations/{id}/assign_permissions/" secondary="Assign permissions to designations with permission levels and reasons" />
            </ListItem>
            <ListItem>
              <ListItemText primary="GET /user-permissions/current_profile/" secondary="Get current user profile and tenant information" />
            </ListItem>
            <ListItem>
              <ListItemText primary="POST /user-permissions/check_permission/" secondary="Real-time permission validation for users and permission codes" />
            </ListItem>
          </List>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            📊 Response Status Codes
          </Typography>

          <List>
            <ListItem>
              <ListItemText primary="200 - Success: Successful operations" />
            </ListItem>
            <ListItem>
              <ListItemText primary="201 - Created: Resource creation" />
            </ListItem>
            <ListItem>
              <ListItemText primary="400 - Bad Request: Invalid parameters" />
            </ListItem>
            <ListItem>
              <ListItemText primary="401 - Unauthorized: Authentication required" />
            </ListItem>
            <ListItem>
              <ListItemText primary="403 - Forbidden: Permission denied" />
            </ListItem>
            <ListItem>
              <ListItemText primary="404 - Not Found: Resource not found" />
            </ListItem>
          </List>
        </Paper>
      </TabPanel>

      {/* Troubleshooting Tab */}
      <TabPanel value={tabValue} index={5}>
        <Typography variant="h4" gutterBottom>
          🛠️ Troubleshooting Guide
        </Typography>

        <Alert severity="warning" sx={{ mb: 3 }}>
          Common issues and their solutions are documented here for quick resolution.
        </Alert>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            🔧 Common Issues
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom color="error">
              Issue: Permission Not Working
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Symptoms:</strong> User reports access denied, API returns 403 Forbidden
            </Typography>
            <Typography variant="body2">
              <strong>Solution:</strong> Check effective permissions, verify calculation logic, review cache status
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom color="error">
              Issue: Dashboard Not Loading Data
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Symptoms:</strong> Empty dashboard tabs, "Select a user" message persists
            </Typography>
            <Typography variant="body2">
              <strong>Solution:</strong> Check browser console, verify API responses, validate authentication
            </Typography>
          </Box>

          <Box>
            <Typography variant="h6" gutterBottom color="error">
              Issue: Permission Assignment Failing
            </Typography>
            <Typography variant="body2" gutterBottom>
              <strong>Symptoms:</strong> Assignment form shows error, changes not reflected
            </Typography>
            <Typography variant="body2">
              <strong>Solution:</strong> Check model fields match API payload, verify backend validation
            </Typography>
          </Box>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            🔧 Development Tools
          </Typography>

          <Typography variant="h6" gutterBottom>
            Django Commands
          </Typography>
          <Box sx={{ bgcolor: "grey.900", color: "white", p: 2, borderRadius: 1, fontFamily: "monospace", mb: 2 }}>
            <Typography variant="body2" component="pre">
              {`# Check user permissions
python manage.py shell
>>> from apps.tenants.services import get_rbac_service
>>> rbac_service = get_rbac_service()
>>> permissions = rbac_service.get_effective_permissions(user_profile)

# Clear caches
python manage.py shell
>>> from django.core.cache import cache
>>> cache.clear()`}
            </Typography>
          </Box>

          <Typography variant="h6" gutterBottom>
            Frontend Debugging
          </Typography>
          <Box sx={{ bgcolor: "grey.900", color: "white", p: 2, borderRadius: 1, fontFamily: "monospace" }}>
            <Typography variant="body2" component="pre">
              {`// Enable debug mode
localStorage.setItem('debug', 'true');

// Check API response
console.log('User analysis data:', userAnalysisData);
console.log('Loading state:', loading);

// Verify API calls
const response = await rbacAPI.getComprehensiveDashboard();
console.log('API Response:', response);`}
            </Typography>
          </Box>
        </Paper>
      </TabPanel>

      {/* Visual Diagrams Tab */}
      <TabPanel value={tabValue} index={6}>
        <Typography variant="h4" gutterBottom>
          📊 Visual Diagrams
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body1" gutterBottom>
            <strong>Interactive Mermaid Diagrams:</strong>
          </Typography>
          <Typography variant="body2">
            Each diagram below includes zoom controls, download options (PNG/SVG), fullscreen view, and copy functionality. Use the toolbar above each diagram to interact with it.
          </Typography>
        </Alert>

        {/* System Architecture Diagram */}
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="h6">🏗️ System Architecture Overview</Typography>
              <Chip label="Graph" size="small" color="primary" />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Complete system layers showing Frontend, API, Business Logic, Data, and Caching layers with their interconnections.
            </Typography>
            <MermaidDiagram
              id="system-architecture"
              title="System Architecture Overview"
              chart={`graph TB
    subgraph "Frontend Layer (React + TypeScript)"
        A[RBAC Management Dashboard]
        B[Permission Assignment Panel]
        C[My Permissions Page]
        D[User Management Interface]
        E[Analytics & Reporting]
    end

    subgraph "API Layer (Django REST Framework)"
        F[PermissionGroupViewSet]
        G[UserPermissionViewSet]
        H[TenantDesignationViewSet]
        I[PermissionRegistryViewSet]
        J[Comprehensive Dashboard API]
    end

    subgraph "Business Logic Layer"
        K[TenantRBACService]
        L[Permission Calculator]
        M[Audit Trail Service]
        N[Cache Manager]
    end

    subgraph "Data Layer (PostgreSQL)"
        O[PermissionRegistry]
        P[TenantUserProfile]
        Q[TenantDesignation]
        R[PermissionGroup]
        S[UserPermissionOverride]
        T[DesignationBasePermission]
        U[PermissionAuditTrail]
    end

    subgraph "Caching Layer (Redis)"
        V[User Permission Cache]
        W[System Stats Cache]
        X[Dashboard Data Cache]
    end

    %% Frontend to API connections
    A --> F
    A --> J
    B --> H
    B --> I
    C --> G
    D --> G
    E --> F

    %% API to Business Logic
    F --> K
    G --> K
    H --> K
    I --> L
    J --> K

    %% Business Logic to Data
    K --> O
    K --> P
    K --> Q
    L --> R
    L --> S
    L --> T
    M --> U

    %% Business Logic to Cache
    K --> V
    L --> W
    J --> X

    %% Cache to Data fallback
    V -.-> P
    W -.-> O
    X -.-> U

    %% External Integrations
    Y[HR Systems] --> G
    Z[Active Directory] --> G
    AA[SSO Systems] --> F

    style A fill:#e1f5fe
    style B fill:#e1f5fe
    style C fill:#e1f5fe
    style D fill:#e1f5fe
    style E fill:#e1f5fe
    style F fill:#f3e5f5
    style G fill:#f3e5f5
    style H fill:#f3e5f5
    style I fill:#f3e5f5
    style J fill:#f3e5f5
    style K fill:#fff3e0
    style L fill:#fff3e0
    style M fill:#fff3e0
    style N fill:#fff3e0
    style O fill:#e8f5e8
    style P fill:#e8f5e8
    style Q fill:#e8f5e8
    style R fill:#e8f5e8
    style S fill:#e8f5e8
    style T fill:#e8f5e8
    style U fill:#e8f5e8
    style V fill:#ffebee
    style W fill:#ffebee
    style X fill:#ffebee`}
            />
          </AccordionDetails>
        </Accordion>

        {/* Permission Calculation Flow */}
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="h6">🔄 Permission Calculation Flow</Typography>
              <Chip label="Flowchart" size="small" color="secondary" />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Shows the complete permission resolution process from user request to final effective permissions.
            </Typography>
            <MermaidDiagram
              id="permission-calculation-flow"
              title="Permission Calculation Flow"
              chart={`graph LR
    subgraph "Permission Hierarchy"
        A[User] --> B{Is Administrator?}
        B -->|Yes| C[ALL PERMISSIONS<br/>✅ Bypasses normal calculation<br/>✅ Cannot be overridden<br/>✅ Automatic grant]
        B -->|No| D[Normal Permission Calculation]
    end

    subgraph "Three-Tier Permission System"
        D --> E[1. Designation Permissions<br/>📋 Base role permissions<br/>👔 Job title based<br/>🔄 Inherited by all users]
        E --> F[2. Group Permissions<br/>👥 Team/project permissions<br/>🎯 Functional additions<br/>➕ Supplement designation]
        F --> G[3. Override Permissions<br/>👤 Individual user permissions<br/>🎛️ Highest priority<br/>✅ Grant or ❌ Deny]
    end

    subgraph "Conflict Resolution Engine"
        G --> H{Conflicts Detected?}
        H -->|Yes| I[Apply Priority Rules<br/>1. Explicit Deny Override<br/>2. Administrator Grant<br/>3. Explicit Grant Override<br/>4. Group Grant<br/>5. Designation Grant<br/>6. Default Deny]
        H -->|No| J[Direct Permission Merge]
        I --> K[Final Effective Permissions]
        J --> K
    end

    subgraph "Scope & Limitations"
        K --> L[Apply Scope Limitations<br/>🌍 Geographic Scope<br/>🏢 Functional Scope<br/>⏰ Temporal Scope<br/>🔐 Conditional Requirements]
    end

    subgraph "Caching & Delivery"
        L --> M[Cache Results<br/>⚡ Redis Storage<br/>🕐 1 hour TTL<br/>🔄 Auto-invalidation]
        M --> N[Return to User<br/>📱 Frontend Display<br/>🔍 Real-time Checking<br/>📊 Dashboard Updates]
    end

    style A fill:#e3f2fd
    style C fill:#c8e6c9
    style D fill:#fff9c4
    style E fill:#f3e5f5
    style F fill:#e1f5fe
    style G fill:#fce4ec
    style H fill:#fff3e0
    style I fill:#ffebee
    style J fill:#e8f5e8
    style K fill:#e0f2f1
    style L fill:#f1f8e9
    style M fill:#fafafa
    style N fill:#e8eaf6`}
            />
          </AccordionDetails>
        </Accordion>

        {/* User Experience Flow */}
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="h6">🎨 User Experience Flow</Typography>
              <Chip label="Flow Diagram" size="small" color="success" />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Complete user interaction flows across dashboard views, assignment workflows, and security features.
            </Typography>
            <MermaidDiagram
              id="user-experience-flow"
              title="User Experience Flow"
              chart={`graph TD
    subgraph "Dashboard Views"
        A[🏠 Overview Tab<br/>📊 Permission Matrix<br/>📈 System Statistics<br/>👥 All Users vs Permissions]
        B[👤 User Analysis Tab<br/>🔍 Individual User Deep-dive<br/>📋 Permission Breakdown<br/>⚠️ Risk Assessment]
        C[🔐 Permission Analysis Tab<br/>🎯 Permission-centric View<br/>👥 Who has what permissions<br/>📊 Usage Statistics]
        D[📈 Analytics Tab<br/>📉 Trends & Insights<br/>⚠️ Risk Dashboard<br/>📋 Compliance Reports]
    end

    subgraph "Permission Assignment Workflows"
        E[🎯 Designation Assignment<br/>1️⃣ Select Designation<br/>2️⃣ Choose Permissions<br/>3️⃣ Set Level & Reason<br/>4️⃣ Submit & Audit]
        F[👥 Group Assignment<br/>1️⃣ Create/Select Group<br/>2️⃣ Add Users<br/>3️⃣ Assign Permissions<br/>4️⃣ Set Parameters]
        G[👤 Override Assignment<br/>1️⃣ Select User<br/>2️⃣ Choose Permission<br/>3️⃣ Grant/Deny Override<br/>4️⃣ Business Justification]
    end

    subgraph "My Permissions Experience"
        H[📱 Personal Dashboard<br/>✅ Current Permissions<br/>🏷️ Administrator Badge<br/>📊 Permission Summary<br/>🔍 Source Breakdown]
        I[📋 Permission Categories<br/>🔧 User Management<br/>📁 Project Management<br/>🏢 Site Management<br/>⚙️ System Administration]
        J[⚠️ Risk Indicators<br/>🟢 Low Risk<br/>🟡 Medium Risk<br/>🔴 High Risk<br/>⚫ Critical Risk]
    end

    subgraph "Security & Compliance"
        K[🔒 Multi-layer Security<br/>🔐 JWT Authentication<br/>🏢 Tenant Isolation<br/>👁️ Permission Validation<br/>🛡️ Resource Access Control]
        L[📋 Audit & Compliance<br/>📝 Complete Audit Trail<br/>⚖️ SOX Compliance<br/>🏛️ ISO 27001<br/>🔐 GDPR Support]
        M[🚨 Threat Mitigation<br/>🔺 Privilege Escalation<br/>📈 Permission Creep<br/>👤 Insider Threats<br/>💻 Account Compromise]
    end

    %% Navigation flows
    A -.-> B
    B -.-> C
    C -.-> D
    D -.-> A

    E -.-> F
    F -.-> G
    G -.-> E

    H --> I
    I --> J

    K --> L
    L --> M

    %% Cross-connections
    A --> E
    B --> G
    C --> F
    H --> A

    style A fill:#e3f2fd
    style B fill:#f3e5f5
    style C fill:#e8f5e8
    style D fill:#fff3e0
    style E fill:#fce4ec
    style F fill:#e1f5fe
    style G fill:#f1f8e9
    style H fill:#e8eaf6
    style I fill:#e0f2f1
    style J fill:#ffebee
    style K fill:#e8f5e8
    style L fill:#fff9c4
    style M fill:#ffebee`}
            />
          </AccordionDetails>
        </Accordion>

        {/* API Data Flow Sequence */}
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="h6">📡 API Data Flow Sequence</Typography>
              <Chip label="Sequence" size="small" color="warning" />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Detailed sequence diagram showing API interactions between frontend, backend, and database layers.
            </Typography>
            <MermaidDiagram
              id="api-data-flow"
              title="API Data Flow Sequence"
              chart={`sequenceDiagram
    participant U as User
    participant F as Frontend (React)
    participant A as API Layer
    participant S as RBAC Service
    participant C as Cache (Redis)
    participant D as Database

    Note over U,D: User Permission Check Flow

    U->>F: Access Dashboard/Feature
    F->>A: GET /comprehensive_dashboard/

    A->>S: calculate_permissions(user_id)
    S->>C: check_cache(user_key)

    alt Cache Hit
        C-->>S: cached_permissions
        S-->>A: return_cached_data
    else Cache Miss
        S->>D: fetch_user_profile()
        S->>D: fetch_designations()
        S->>D: fetch_group_memberships()
        S->>D: fetch_overrides()

        Note over S: Permission Calculation Logic
        S->>S: is_administrator_check()
        alt Is Administrator
            S->>D: get_all_permissions()
            S->>S: format_admin_permissions()
        else Normal User
            S->>S: calculate_designation_permissions()
            S->>S: calculate_group_permissions()
            S->>S: calculate_override_permissions()
            S->>S: resolve_conflicts()
            S->>S: apply_scope_limitations()
        end

        S->>C: store_cache(calculated_permissions)
        S-->>A: return_effective_permissions
    end

    A-->>F: JSON response with permissions
    F->>F: update_component_state()
    F->>F: render_permission_data()
    F-->>U: Display updated interface

    Note over U,D: Permission Assignment Flow

    U->>F: Assign Permission Action
    F->>A: POST /designations/{id}/assign_permissions/

    A->>S: validate_assignment_request()
    S->>D: check_user_permissions()
    S->>D: validate_targets()

    alt Valid Assignment
        A->>D: create_permission_assignment()
        A->>D: log_audit_trail()
        A->>C: invalidate_affected_caches()
        A-->>F: success_response
        F->>F: show_success_message()
        F->>A: refresh_dashboard_data()
    else Invalid Assignment
        A-->>F: error_response
        F->>F: show_error_message()
    end

    F-->>U: Updated interface with changes`}
            />
          </AccordionDetails>
        </Accordion>

        {/* Component Architecture Detail */}
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="h6">🧩 Component Architecture Detail</Typography>
              <Chip label="Architecture" size="small" color="info" />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Detailed view of frontend components, backend APIs, service layer, and database models with their relationships.
            </Typography>
            <MermaidDiagram
              id="component-architecture"
              title="Component Architecture Detail"
              chart={`graph TB
    subgraph "Frontend Components Architecture"
        A["🎛️ ComprehensivePermissionDashboard.tsx<br/>📊 Main dashboard container<br/>🔄 Tab state management<br/>📡 API data coordination"]

        B["📋 PermissionAssignmentPanel.tsx<br/>🎯 Multi-step assignment workflow<br/>✅ Form validation & submission<br/>🔄 State management for assignment types"]

        C["👤 MyPermissionsPage.tsx<br/>📱 Personal permission view<br/>🏷️ Administrator badge logic<br/>📊 Real-time permission display"]

        D["🔧 rbacAPI.ts<br/>🌐 API service layer<br/>📡 HTTP request handling<br/>❌ Error management"]
    end

    subgraph "Backend API Architecture"
        E["🎯 PermissionGroupViewSet<br/>📊 comprehensive_dashboard endpoint<br/>👥 Group management<br/>🔄 User assignments"]

        F["👤 UserPermissionViewSet<br/>👁️ Permission checking<br/>📋 User profile management<br/>🔍 Designation queries"]

        G["🏢 TenantDesignationViewSet<br/>🎯 Permission assignment to roles<br/>📋 Designation management<br/>✅ Assignment validation"]

        H["📋 PermissionRegistryViewSet<br/>🔐 Permission CRUD operations<br/>🔍 Permission search & filtering<br/>📊 Bulk operations"]
    end

    subgraph "Service Layer"
        I["⚙️ TenantRBACService<br/>🧮 Permission calculation engine<br/>🔍 Effective permission resolution<br/>👑 Administrator privilege handling"]

        J["📝 PermissionAuditService<br/>📋 Change tracking<br/>🔍 Audit trail management<br/>📊 Compliance reporting"]

        K["⚡ CacheService<br/>🗄️ Redis cache management<br/>⏱️ Cache invalidation<br/>🔄 Performance optimization"]
    end

    subgraph "Database Models"
        L["📋 PermissionRegistry<br/>🔐 Permission definitions<br/>⚠️ Risk levels<br/>🏷️ Categories"]

        M["👤 TenantUserProfile<br/>👥 User tenant relationships<br/>🏢 Department assignments<br/>📊 Profile metadata"]

        N["🎯 TenantDesignation<br/>📋 Role definitions<br/>🏢 Organizational hierarchy<br/>⚖️ Authority levels"]

        O["👥 PermissionGroup<br/>🎯 Functional teams<br/>📋 Project-based permissions<br/>🔄 Dynamic memberships"]

        P["👤 UserPermissionOverride<br/>🎛️ Individual exceptions<br/>⏰ Temporal restrictions<br/>📝 Business justifications"]

        Q["📝 PermissionAuditTrail<br/>📋 Complete change history<br/>👤 Actor tracking<br/>🌐 IP address logging"]
    end

    %% Frontend connections
    A --> D
    B --> D
    C --> D

    %% API connections
    D --> E
    D --> F
    D --> G
    D --> H

    %% Service connections
    E --> I
    F --> I
    G --> I
    H --> I
    I --> J
    I --> K

    %% Database connections
    I --> L
    I --> M
    I --> N
    I --> O
    I --> P
    J --> Q

    %% Cache connections
    K -.-> M
    K -.-> L
    K -.-> Q

    style A fill:#e3f2fd
    style B fill:#f3e5f5
    style C fill:#e8f5e8
    style D fill:#fff3e0
    style E fill:#fce4ec
    style F fill:#e1f5fe
    style G fill:#f1f8e9
    style H fill:#e8eaf6
    style I fill:#fff9c4
    style J fill:#ffebee
    style K fill:#e0f2f1
    style L fill:#f9fbe7
    style M fill:#f3e5f5
    style N fill:#e8f5e8
    style O fill:#e1f5fe
    style P fill:#fce4ec
    style Q fill:#fff3e0`}
            />
          </AccordionDetails>
        </Accordion>

        {/* Enhanced Quick Access */}
        <Paper sx={{ p: 3, bgcolor: "primary.50", mt: 3 }}>
          <Typography variant="h5" gutterBottom>
            🚀 Quick Access & Download Options
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Each diagram above includes built-in controls for enhanced interaction and export capabilities.
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 2 }}>
            <Button variant="contained" href="https://mermaid.live/" target="_blank" startIcon={<VisibilityIcon />}>
              Mermaid Live Editor
            </Button>
            <Button variant="outlined" href="https://mermaid.js.org/syntax/gitgraph.html" target="_blank">
              Mermaid Documentation
            </Button>
            <Button variant="outlined" onClick={() => window.print()}>
              Print This Page
            </Button>
          </Box>

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              💡 Pro Tips:
            </Typography>
            <Typography variant="body2">
              • Use zoom controls to focus on specific parts of complex diagrams
              <br />
              • Download PNG for presentations, SVG for scalable graphics
              <br />
              • Fullscreen mode provides better visibility for large diagrams
              <br />• Copy Mermaid code to customize diagrams in external tools
            </Typography>
          </Alert>
        </Paper>
      </TabPanel>

      {/* Footer */}
      <Paper sx={{ mt: 4, p: 3, textAlign: "center", bgcolor: "grey.50" }}>
        <Typography variant="h6" gutterBottom>
          🎉 RBAC Module - Production Ready
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Enterprise-grade permission management system with comprehensive documentation and visual guides.
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary">
          For technical support or feature requests, contact the development team.
        </Typography>
      </Paper>
    </Container>
  );
};

export default RBACDocumentationPage;
