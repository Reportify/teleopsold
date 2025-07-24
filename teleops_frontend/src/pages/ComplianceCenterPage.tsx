import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Alert,
  AlertTitle,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Avatar,
  useTheme,
  Divider,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Tabs,
  Tab,
  Snackbar,
} from "@mui/material";
import {
  Warning,
  Error,
  Info,
  CheckCircle,
  Schedule,
  Upload,
  Description,
  Chat,
  ExpandMore,
  Close,
  AttachFile,
  Send,
  Business,
  Gavel,
  AccountBalance,
  Security,
  Assignment,
} from "@mui/icons-material";

interface ComplianceIssue {
  id: string;
  title: string;
  description: string;
  required_action: string;
  issue_type: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "In_Progress" | "Resolved" | "Escalated" | "Closed";
  required_documents: string[];
  submitted_documents: any[];
  due_date: string;
  raised_at: string;
  tenant_response?: string;
  tenant_response_at?: string;
  is_overdue: boolean;
  days_until_due: number;
}

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

const ComplianceCenterPage: React.FC = () => {
  const theme = useTheme();
  const [selectedTab, setSelectedTab] = useState(0);
  const [issues, setIssues] = useState<ComplianceIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<ComplianceIssue | null>(null);
  const [openResponseDialog, setOpenResponseDialog] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" });

  // Mock data - replace with actual API call
  useEffect(() => {
    const mockIssues: ComplianceIssue[] = [
      {
        id: "1",
        title: "Business Registration Number Verification Required",
        description: "We need to verify your business registration number with the registrar. The provided number format appears to be incorrect for your jurisdiction.",
        required_action: "Please provide a clear copy of your business registration certificate and verify the registration number is correctly entered in your profile.",
        issue_type: "Business_Verification",
        severity: "High",
        status: "Open",
        required_documents: ["Business Registration Certificate", "GST Certificate"],
        submitted_documents: [],
        due_date: "2025-01-25T00:00:00Z",
        raised_at: "2025-01-20T10:00:00Z",
        is_overdue: false,
        days_until_due: 5,
      },
      {
        id: "2",
        title: "GST Compliance Documentation",
        description: "Your GST certificate appears to be expired. For compliance purposes, we need a current and valid GST certificate.",
        required_action: "Upload your renewed GST certificate or provide documentation showing renewal is in progress.",
        issue_type: "Documentation_Missing",
        severity: "Medium",
        status: "Open",
        required_documents: ["Current GST Certificate", "GST Renewal Application (if applicable)"],
        submitted_documents: [],
        due_date: "2025-01-27T00:00:00Z",
        raised_at: "2025-01-20T14:30:00Z",
        is_overdue: false,
        days_until_due: 7,
      },
      {
        id: "3",
        title: "Contact Information Clarification",
        description: "We were unable to reach your secondary contact person for verification. This is required for our Know Your Customer (KYC) process.",
        required_action: "Please verify the secondary contact information is correct, or provide an alternative contact person with their details.",
        issue_type: "Clarification_Required",
        severity: "Low",
        status: "In_Progress",
        required_documents: [],
        submitted_documents: [],
        due_date: "2025-01-30T00:00:00Z",
        raised_at: "2025-01-18T09:15:00Z",
        tenant_response: "We have updated the secondary contact information. The new contact person is Mr. Rajesh Kumar, reachable at +91-9876543210.",
        tenant_response_at: "2025-01-20T11:30:00Z",
        is_overdue: false,
        days_until_due: 10,
      },
    ];

    setIssues(mockIssues);
    setLoading(false);
  }, []);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return theme.palette.error.main;
      case "In_Progress":
        return theme.palette.warning.main;
      case "Resolved":
        return theme.palette.success.main;
      case "Escalated":
        return theme.palette.error.dark;
      default:
        return theme.palette.grey[500];
    }
  };

  const getIssueTypeIcon = (issueType: string) => {
    switch (issueType) {
      case "Business_Verification":
        return <Business />;
      case "Legal_Review":
        return <Gavel />;
      case "Financial_Verification":
        return <AccountBalance />;
      case "Compliance_Review":
        return <Security />;
      case "Documentation_Missing":
        return <Description />;
      case "Clarification_Required":
        return <Chat />;
      default:
        return <Assignment />;
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleSubmitResponse = async () => {
    if (!selectedIssue || !responseText.trim()) return;

    try {
      // Mock API call - replace with actual API
      console.log("Submitting response:", { issueId: selectedIssue.id, response: responseText });

      // Update local state
      setIssues(
        issues.map((issue) =>
          issue.id === selectedIssue.id
            ? {
                ...issue,
                status: "In_Progress" as const,
                tenant_response: responseText,
                tenant_response_at: new Date().toISOString(),
              }
            : issue
        )
      );

      setSnackbar({
        open: true,
        message: "Response submitted successfully",
        severity: "success",
      });

      setOpenResponseDialog(false);
      setResponseText("");
      setSelectedIssue(null);
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to submit response",
        severity: "error",
      });
    }
  };

  const getFilteredIssues = () => {
    switch (selectedTab) {
      case 0:
        return issues; // All
      case 1:
        return issues.filter((issue) => issue.status === "Open");
      case 2:
        return issues.filter((issue) => issue.severity === "Critical" || issue.severity === "High");
      case 3:
        return issues.filter((issue) => issue.status === "In_Progress");
      case 4:
        return issues.filter((issue) => issue.status === "Resolved");
      default:
        return issues;
    }
  };

  const openIssues = issues.filter((issue) => issue.status === "Open");
  const criticalIssues = issues.filter((issue) => issue.severity === "Critical");
  const overdueIssues = issues.filter((issue) => issue.is_overdue);

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Compliance Center
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Compliance Center
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Address compliance issues and warnings to maintain good standing. Your platform access remains active while resolving these items.
        </Typography>
      </Box>

      {/* Warning Banner */}
      {(criticalIssues.length > 0 || overdueIssues.length > 0) && (
        <Alert severity={criticalIssues.length > 0 ? "error" : "warning"} sx={{ mb: 3 }}>
          <AlertTitle>{criticalIssues.length > 0 ? "Critical Compliance Issues" : "Attention Required"}</AlertTitle>

          <Typography variant="body2" sx={{ mb: 2 }}>
            {criticalIssues.length > 0
              ? `You have ${criticalIssues.length} critical issue(s) requiring immediate attention.`
              : `You have ${overdueIssues.length} overdue issue(s) that need resolution.`}
          </Typography>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="contained" size="small" onClick={() => setSelectedTab(2)}>
              View Critical Issues
            </Button>
            <Button variant="outlined" size="small">
              Contact Support
            </Button>
          </Box>
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Open Issues
                  </Typography>
                  <Typography variant="h5" fontWeight={600}>
                    {openIssues.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.error.main }}>
                  <Warning />
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
                    Critical Issues
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="error.main">
                    {criticalIssues.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.error.dark }}>
                  <Error />
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
                    In Progress
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="warning.main">
                    {issues.filter((i) => i.status === "In_Progress").length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
                  <Schedule />
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
                    Resolved
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="success.main">
                    {issues.filter((i) => i.status === "Resolved").length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                  <CheckCircle />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Issues List */}
      <Paper elevation={3}>
        <Tabs value={selectedTab} onChange={handleTabChange} sx={{ px: 3, pt: 2 }}>
          <Tab
            label={
              <Badge badgeContent={issues.length} color="primary">
                All Issues
              </Badge>
            }
          />
          <Tab
            label={
              <Badge badgeContent={openIssues.length} color="error">
                Open
              </Badge>
            }
          />
          <Tab
            label={
              <Badge badgeContent={criticalIssues.length} color="error">
                Critical
              </Badge>
            }
          />
          <Tab
            label={
              <Badge badgeContent={issues.filter((i) => i.status === "In_Progress").length} color="warning">
                In Progress
              </Badge>
            }
          />
          <Tab
            label={
              <Badge badgeContent={issues.filter((i) => i.status === "Resolved").length} color="success">
                Resolved
              </Badge>
            }
          />
        </Tabs>

        <TabPanel value={selectedTab} index={0}>
          <ComplianceIssuesList
            issues={getFilteredIssues()}
            onRespond={(issue) => {
              setSelectedIssue(issue);
              setOpenResponseDialog(true);
            }}
          />
        </TabPanel>
        <TabPanel value={selectedTab} index={1}>
          <ComplianceIssuesList
            issues={getFilteredIssues()}
            onRespond={(issue) => {
              setSelectedIssue(issue);
              setOpenResponseDialog(true);
            }}
          />
        </TabPanel>
        <TabPanel value={selectedTab} index={2}>
          <ComplianceIssuesList
            issues={getFilteredIssues()}
            onRespond={(issue) => {
              setSelectedIssue(issue);
              setOpenResponseDialog(true);
            }}
          />
        </TabPanel>
        <TabPanel value={selectedTab} index={3}>
          <ComplianceIssuesList
            issues={getFilteredIssues()}
            onRespond={(issue) => {
              setSelectedIssue(issue);
              setOpenResponseDialog(true);
            }}
          />
        </TabPanel>
        <TabPanel value={selectedTab} index={4}>
          <ComplianceIssuesList
            issues={getFilteredIssues()}
            onRespond={(issue) => {
              setSelectedIssue(issue);
              setOpenResponseDialog(true);
            }}
          />
        </TabPanel>
      </Paper>

      {/* Response Dialog */}
      <Dialog open={openResponseDialog} onClose={() => setOpenResponseDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            Respond to Issue
            <IconButton onClick={() => setOpenResponseDialog(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedIssue && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {selectedIssue.title}
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Required Action:</strong> {selectedIssue.required_action}
                </Typography>
              </Alert>
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Your Response"
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder="Provide your clarification, explanation, or response to this issue..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenResponseDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitResponse} disabled={!responseText.trim()} startIcon={<Send />}>
            Submit Response
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

const ComplianceIssuesList: React.FC<{
  issues: ComplianceIssue[];
  onRespond: (issue: ComplianceIssue) => void;
}> = ({ issues, onRespond }) => {
  const theme = useTheme();

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

  const getIssueTypeIcon = (issueType: string) => {
    switch (issueType) {
      case "Business_Verification":
        return <Business />;
      case "Legal_Review":
        return <Gavel />;
      case "Financial_Verification":
        return <AccountBalance />;
      case "Compliance_Review":
        return <Security />;
      case "Documentation_Missing":
        return <Description />;
      case "Clarification_Required":
        return <Chat />;
      default:
        return <Assignment />;
    }
  };

  if (issues.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h6" color="text.secondary">
          No issues found in this category
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {issues.length === 0 ? "Great! You're all caught up." : ""}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {issues.map((issue, index) => (
        <Card key={issue.id} elevation={1} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start", mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "start", gap: 2, flex: 1 }}>
                <Avatar sx={{ bgcolor: theme.palette.grey[100] }}>{getIssueTypeIcon(issue.issue_type)}</Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {issue.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {issue.description}
                  </Typography>

                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      <strong>Required Action:</strong> {issue.required_action}
                    </Typography>
                  </Alert>

                  {issue.required_documents.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Required Documents:
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {issue.required_documents.map((doc, idx) => (
                          <Chip key={idx} label={doc} size="small" icon={<Description />} />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {issue.tenant_response && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Your Response:
                      </Typography>
                      <Paper elevation={0} sx={{ p: 2, bgcolor: "grey.50" }}>
                        <Typography variant="body2">{issue.tenant_response}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                          Submitted on {new Date(issue.tenant_response_at!).toLocaleDateString()}
                        </Typography>
                      </Paper>
                    </Box>
                  )}
                </Box>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "end", gap: 1 }}>
                <Chip label={issue.severity} color={getSeverityColor(issue.severity) as any} size="small" />
                <Chip label={issue.status ? issue.status.replace("_", " ") : "Unknown"} size="small" variant="outlined" />
                {issue.is_overdue && <Chip label="Overdue" color="error" size="small" icon={<Schedule />} />}
                <Typography variant="caption" color="text.secondary">
                  Due: {new Date(issue.due_date).toLocaleDateString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {issue.days_until_due} days left
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: "flex", gap: 1 }}>
              <Button variant="contained" size="small" onClick={() => onRespond(issue)} startIcon={<Chat />} disabled={issue.status === "Resolved"}>
                {issue.tenant_response ? "Update Response" : "Provide Response"}
              </Button>
              <Button variant="outlined" size="small" startIcon={<Upload />}>
                Upload Documents
              </Button>
              <Button variant="text" size="small" startIcon={<Info />}>
                Contact Support
              </Button>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default ComplianceCenterPage;
