import React, { useState, useEffect } from "react";
import { Alert, AlertTitle, Box, Typography, Button, Chip, Collapse, IconButton, useTheme } from "@mui/material";
import { Warning, Error, ExpandMore, ExpandLess, Close, Assignment, Schedule } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

interface ComplianceIssue {
  id: string;
  title: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "In_Progress" | "Resolved" | "Escalated" | "Closed";
  is_overdue: boolean;
  days_until_due: number;
  issue_type: string;
}

interface ComplianceWarningBannerProps {
  className?: string;
  onDismiss?: () => void;
  allowDismiss?: boolean;
}

const ComplianceWarningBanner: React.FC<ComplianceWarningBannerProps> = ({ className, onDismiss, allowDismiss = false }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [issues, setIssues] = useState<ComplianceIssue[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data - replace with actual API call
  useEffect(() => {
    const mockIssues: ComplianceIssue[] = [
      {
        id: "1",
        title: "Business Registration Number Verification Required",
        severity: "High",
        status: "Open",
        is_overdue: false,
        days_until_due: 5,
        issue_type: "Business_Verification",
      },
      {
        id: "2",
        title: "GST Compliance Documentation",
        severity: "Medium",
        status: "Open",
        is_overdue: false,
        days_until_due: 7,
        issue_type: "Documentation_Missing",
      },
      {
        id: "3",
        title: "Contact Information Clarification",
        severity: "Low",
        status: "In_Progress",
        is_overdue: false,
        days_until_due: 10,
        issue_type: "Clarification_Required",
      },
    ];

    setIssues(mockIssues);
    setLoading(false);
  }, []);

  const openIssues = issues.filter((issue) => issue.status === "Open" || issue.status === "In_Progress");
  const criticalIssues = openIssues.filter((issue) => issue.severity === "Critical");
  const highPriorityIssues = openIssues.filter((issue) => issue.severity === "High");
  const overdueIssues = openIssues.filter((issue) => issue.is_overdue);

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical":
        return "error";
      case "High":
        return "warning";
      case "Medium":
        return "info";
      case "Low":
        return "success";
      default:
        return "default";
    }
  };

  // Don't show banner if no issues, loading, or dismissed
  if (loading || openIssues.length === 0 || dismissed) {
    return null;
  }

  const bannerSeverity = criticalIssues.length > 0 ? "error" : highPriorityIssues.length > 0 || overdueIssues.length > 0 ? "warning" : "info";

  const getTitle = () => {
    if (criticalIssues.length > 0) return "Critical Compliance Issues Require Immediate Attention";
    if (overdueIssues.length > 0) return "Overdue Compliance Issues";
    if (highPriorityIssues.length > 0) return "High Priority Compliance Issues";
    return "Compliance Attention Required";
  };

  const getMessage = () => {
    if (criticalIssues.length > 0) {
      return `You have ${criticalIssues.length} critical compliance issue(s) that require immediate attention. Your operations can continue while you address these items.`;
    }
    if (overdueIssues.length > 0) {
      return `You have ${overdueIssues.length} overdue compliance issue(s). Please address these as soon as possible.`;
    }
    return `You have ${openIssues.length} compliance issue(s) that need attention. Your operations can continue while you address these items.`;
  };

  return (
    <Alert
      severity={bannerSeverity}
      sx={{
        mb: 3,
        "& .MuiAlert-message": { width: "100%" },
      }}
      className={className}
      action={
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton size="small" onClick={() => setExpanded(!expanded)} sx={{ color: "inherit" }}>
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
          {allowDismiss && (
            <IconButton size="small" onClick={handleDismiss} sx={{ color: "inherit" }}>
              <Close />
            </IconButton>
          )}
        </Box>
      }
    >
      <AlertTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {bannerSeverity === "error" ? <Error /> : <Warning />}
        {getTitle()}
      </AlertTitle>

      <Typography variant="body2" sx={{ mb: 2 }}>
        {getMessage()}
      </Typography>

      {/* Quick Summary Chips */}
      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
        {criticalIssues.length > 0 && <Chip label={`${criticalIssues.length} Critical`} color="error" size="small" icon={<Error />} />}
        {highPriorityIssues.length > 0 && <Chip label={`${highPriorityIssues.length} High Priority`} color="warning" size="small" icon={<Warning />} />}
        {overdueIssues.length > 0 && <Chip label={`${overdueIssues.length} Overdue`} color="error" size="small" variant="outlined" icon={<Schedule />} />}
        <Chip label={`${openIssues.filter((i) => i.status === "In_Progress").length} In Progress`} color="info" size="small" variant="outlined" />
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: "flex", gap: 1, mb: expanded ? 2 : 0, flexWrap: "wrap" }}>
        <Button
          variant="contained"
          size="small"
          onClick={() => navigate("/compliance-center")}
          sx={{
            bgcolor: "white",
            color: bannerSeverity === "error" ? "error.main" : "warning.main",
            "&:hover": {
              bgcolor: "grey.100",
            },
          }}
        >
          View All Issues
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => navigate("/compliance-center?tab=upload")}
          sx={{
            borderColor: "white",
            color: "white",
            "&:hover": {
              borderColor: "white",
              bgcolor: "rgba(255,255,255,0.1)",
            },
          }}
        >
          Upload Documents
        </Button>
        {criticalIssues.length > 0 && (
          <Button
            variant="contained"
            size="small"
            onClick={() => navigate("/compliance-center?filter=critical")}
            sx={{
              bgcolor: theme.palette.error.dark,
              "&:hover": {
                bgcolor: theme.palette.error.dark,
              },
            }}
          >
            Address Critical Issues
          </Button>
        )}
        <Button
          variant="text"
          size="small"
          onClick={() => navigate("/support")}
          sx={{
            color: "white",
            "&:hover": {
              bgcolor: "rgba(255,255,255,0.1)",
            },
          }}
        >
          Contact Support
        </Button>
      </Box>

      {/* Expanded Details */}
      <Collapse in={expanded}>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Outstanding Issues:
          </Typography>
          <Box sx={{ pl: 2 }}>
            {openIssues.slice(0, 5).map((issue) => (
              <Box key={issue.id} sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                <Assignment fontSize="small" />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {issue.title}
                </Typography>
                <Chip label={issue.severity} color={getSeverityColor(issue.severity) as any} size="small" />
                {issue.is_overdue && <Chip label="Overdue" color="error" size="small" variant="outlined" />}
                <Typography variant="caption" color="inherit">
                  {issue.days_until_due}d left
                </Typography>
              </Box>
            ))}
            {openIssues.length > 5 && (
              <Typography variant="caption" color="inherit">
                ...and {openIssues.length - 5} more issues
              </Typography>
            )}
          </Box>
        </Box>
      </Collapse>
    </Alert>
  );
};

export default ComplianceWarningBanner;
