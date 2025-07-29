/**
 * Smart Resource Type Selector
 * Helps users map custom permissions to application functionality
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Autocomplete,
  Box,
  Typography,
  Chip,
  Alert,
  Tooltip,
  IconButton,
  Collapse,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
} from "@mui/material";
import { AutoFixHigh, Lightbulb, CheckCircle, Warning, ExpandMore, ExpandLess, Info, Visibility, Edit, Add, Security, Settings } from "@mui/icons-material";
import rbacAPI, { ResourceType } from "../services/rbacAPI";

// Resource types are now fetched from the backend API

// Keywords for auto-detection
const KEYWORD_MAPPINGS = {
  project: ["project", "proj", "initiative", "campaign"],
  task: ["task", "activity", "todo", "assignment", "work"],
  site: ["site", "location", "facility", "premises", "branch"],
  user: ["user", "person", "employee", "staff", "member", "profile"],
  deviation: ["deviation", "exception", "variance", "non-conformance", "incident"],
  report: ["report", "analytics", "dashboard", "metrics", "statistics", "data"],
  compliance: ["compliance", "regulatory", "audit", "standard", "policy"],
  vendor: ["vendor", "supplier", "contractor", "partner", "external"],
  asset: ["asset", "equipment", "tool", "inventory", "resource"],
  document: ["document", "file", "pdf", "attachment", "paper"],
  audit: ["audit", "log", "history", "trace", "record"],
  system: ["system", "admin", "config", "setting", "maintenance"],
  workflow: ["workflow", "process", "flow", "approval", "routing"],
  notification: ["notification", "alert", "message", "email", "sms"],
  rbac: ["rbac", "permission", "role", "access", "authorization", "security"],
};

interface ResourceTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  permissionName?: string;
  permissionCode?: string;
  permissionCategory?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const ResourceTypeSelector: React.FC<ResourceTypeSelectorProps> = ({
  value,
  onChange,
  permissionName = "",
  permissionCode = "",
  permissionCategory = "",
  error,
  helperText,
  required = false,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFeatureMapping, setShowFeatureMapping] = useState(false);
  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch resource types from backend
  useEffect(() => {
    const fetchResourceTypes = async () => {
      try {
        setLoading(true);
        const types = await rbacAPI.getResourceTypes();
        setResourceTypes(types);
      } catch (error) {
        console.error("Error fetching resource types:", error);
        // Fallback to hardcoded types if API fails
        setResourceTypes([
          { value: "project", label: "Project Management", icon: "📋", description: "Project creation, tracking, and management" },
          { value: "task", label: "Task Management", icon: "✅", description: "Task assignment, updates, and completion" },
          { value: "site", label: "Site Management", icon: "📍", description: "Site information, locations, and details" },
          { value: "user", label: "User Management", icon: "👥", description: "User profiles, roles, and access control" },
          { value: "deviation", label: "Deviation Management", icon: "⚠️", description: "Deviation records, approvals, and reports" },
          { value: "report", label: "Reporting & Analytics", icon: "📊", description: "Reports, dashboards, and data analysis" },
          { value: "compliance", label: "Compliance Management", icon: "📜", description: "Compliance tracking and regulatory requirements" },
          { value: "vendor", label: "Vendor Management", icon: "🏢", description: "Vendor relationships and contracts" },
          { value: "asset", label: "Asset Management", icon: "🔧", description: "Equipment, tools, and asset tracking" },
          { value: "document", label: "Document Management", icon: "📄", description: "Document storage, sharing, and version control" },
          { value: "audit", label: "Audit & Logging", icon: "🔍", description: "Audit trails, logs, and security monitoring" },
          { value: "system", label: "System Administration", icon: "⚙️", description: "System settings, configuration, and maintenance" },
          { value: "workflow", label: "Workflow Management", icon: "🔄", description: "Business processes and workflow automation" },
          { value: "notification", label: "Notification Management", icon: "🔔", description: "Alerts, notifications, and communication" },
          { value: "custom", label: "Custom Resource", icon: "🎯", description: "Custom functionality specific to your organization" },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchResourceTypes();
  }, []);

  // Auto-detect resource type based on permission details
  const detectedResourceTypes = useMemo(() => {
    if (resourceTypes.length === 0) return [];

    const text = `${permissionName} ${permissionCode} ${permissionCategory}`.toLowerCase();
    const detected: Array<{ type: string; confidence: number; matches: string[] }> = [];

    Object.entries(KEYWORD_MAPPINGS).forEach(([resourceType, keywords]) => {
      const matches = keywords.filter((keyword) => text.includes(keyword));
      if (matches.length > 0) {
        const confidence = matches.length / keywords.length;
        detected.push({ type: resourceType, confidence, matches });
      }
    });

    return detected.sort((a, b) => b.confidence - a.confidence);
  }, [permissionName, permissionCode, permissionCategory, resourceTypes]);

  // Auto-select highest confidence detection
  useEffect(() => {
    if (!value && detectedResourceTypes.length > 0 && detectedResourceTypes[0].confidence > 0.3) {
      onChange(detectedResourceTypes[0].type);
    }
  }, [detectedResourceTypes, value, onChange]);

  // Get features that would be controlled by this resource type
  const getFeatureMapping = (resourceType: string) => {
    const examples = {
      project: ["View project details", "Create new projects", "Edit project information", "Delete projects"],
      task: ["View task lists", "Create tasks", "Assign tasks to users", "Update task status"],
      site: ["View site information", "Edit site details", "Manage site access"],
      user: ["View user profiles", "Create user accounts", "Edit user information", "Deactivate users"],
      deviation: ["View deviation reports", "Create deviation records", "Approve deviations", "Export deviation data"],
      report: ["View analytics dashboards", "Generate reports", "Export data", "Configure report parameters"],
      compliance: ["View compliance status", "Update compliance records", "Generate compliance reports"],
      vendor: ["View vendor information", "Manage vendor contracts", "Approve vendor payments"],
      asset: ["View asset inventory", "Add new assets", "Update asset status", "Schedule maintenance"],
      document: ["View documents", "Upload files", "Share documents", "Version control"],
      audit: ["View audit logs", "Generate audit reports", "Configure audit settings"],
      system: ["Manage system settings", "Configure integrations", "System maintenance"],
      workflow: ["Design workflows", "Start workflow processes", "Approve workflow steps"],
      notification: ["Configure notifications", "Send alerts", "Manage notification preferences"],
    };

    return examples[resourceType as keyof typeof examples] || [];
  };

  const selectedResourceType = resourceTypes.find((rt) => rt.value === value);

  return (
    <Box sx={{ width: "100%" }}>
      {/* Main Resource Type Selector */}
      <FormControl fullWidth error={!!error}>
        <InputLabel required={required}>Application Feature/Module</InputLabel>
        <Select value={value} onChange={(e) => onChange(e.target.value)} label="Application Feature/Module" disabled={loading}>
          {loading ? (
            <MenuItem disabled>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={16} />
                <Typography>Loading resource types...</Typography>
              </Box>
            </MenuItem>
          ) : (
            resourceTypes.map((resourceType) => (
              <MenuItem key={resourceType.value} value={resourceType.value}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                  <Typography sx={{ fontSize: "1.2em" }}>{resourceType.icon}</Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1">{resourceType.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {resourceType.description}
                    </Typography>
                  </Box>
                  {detectedResourceTypes.find((d) => d.type === resourceType.value) && <Chip label="Detected" size="small" color="primary" variant="outlined" icon={<AutoFixHigh />} />}
                </Box>
              </MenuItem>
            ))
          )}
        </Select>
        {(error || helperText) && (
          <Typography variant="caption" color={error ? "error" : "text.secondary"} sx={{ mt: 0.5, ml: 1.5 }}>
            {error || helperText}
          </Typography>
        )}
      </FormControl>

      {/* Auto-detection Results */}
      {detectedResourceTypes.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <AutoFixHigh color="primary" fontSize="small" />
            <Typography variant="body2" fontWeight={600}>
              Smart Detection Results
            </Typography>
            <Tooltip title="Based on your permission name, code, and category">
              <IconButton size="small">
                <Info fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {detectedResourceTypes.slice(0, 3).map((detected) => {
              const resourceType = resourceTypes.find((rt) => rt.value === detected.type);
              if (!resourceType) return null;

              return (
                <Chip
                  key={detected.type}
                  label={`${resourceType.icon} ${resourceType.label}`}
                  variant={value === detected.type ? "filled" : "outlined"}
                  color={value === detected.type ? "primary" : "default"}
                  onClick={() => onChange(detected.type)}
                  clickable
                  size="small"
                  sx={{
                    opacity: detected.confidence > 0.5 ? 1 : 0.7,
                    border: detected.confidence > 0.5 ? 2 : 1,
                  }}
                />
              );
            })}
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
            Detected keywords: {detectedResourceTypes[0]?.matches.join(", ")}
          </Typography>
        </Box>
      )}

      {/* Feature Mapping Preview */}
      {selectedResourceType && (
        <Card sx={{ mt: 2, bgcolor: "background.default" }}>
          <CardContent sx={{ pb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontSize: "1.1em" }}>{selectedResourceType.icon}</Typography>
                <Typography variant="subtitle2" fontWeight={600}>
                  {selectedResourceType.label} Features
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setShowFeatureMapping(!showFeatureMapping)}>
                {showFeatureMapping ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Your permission will control access to these features:
            </Typography>

            <Collapse in={showFeatureMapping}>
              <List dense sx={{ pt: 0 }}>
                {getFeatureMapping(selectedResourceType.value)
                  .slice(0, 4)
                  .map((feature, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            bgcolor: "primary.main",
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText primary={feature} primaryTypographyProps={{ variant: "body2" }} />
                    </ListItem>
                  ))}
              </List>
            </Collapse>

            {!showFeatureMapping && (
              <Typography variant="caption" color="primary" sx={{ cursor: "pointer" }} onClick={() => setShowFeatureMapping(true)}>
                Click to see what features this controls →
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Validation Messages */}
      {value && selectedResourceType && (
        <Alert severity="success" sx={{ mt: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CheckCircle fontSize="small" />
            <Typography variant="body2">
              Perfect! Your permission will automatically control <strong>{selectedResourceType.label}</strong> functionality.
            </Typography>
          </Box>
        </Alert>
      )}

      {!value && permissionName && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Warning fontSize="small" />
            <Typography variant="body2">Please select which application feature this permission should control.</Typography>
          </Box>
        </Alert>
      )}
    </Box>
  );
};

export default ResourceTypeSelector;
