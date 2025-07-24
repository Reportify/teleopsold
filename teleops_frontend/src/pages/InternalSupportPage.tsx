import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
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
  Alert,
  Snackbar,
  LinearProgress,
  Tooltip,
  Badge,
  TextareaAutosize,
} from "@mui/material";
import {
  Add,
  Search,
  FilterList,
  Assignment,
  CheckCircle,
  Schedule,
  Error,
  Warning,
  Info,
  SupportAgent,
  People,
  TrendingUp,
  TrendingDown,
  Assessment,
  MoreVert,
  Reply,
  TrendingUp as Escalate,
  Close,
  Business,
  AccessTime,
  Star,
  Message,
} from "@mui/icons-material";

interface SupportTicket {
  id: number;
  ticket_number: string;
  tenant_id?: string;
  tenant_name?: string;
  subject: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  category?: string;
  reporter_name: string;
  reporter_email: string;
  reporter_user_id?: number;
  assigned_to?: number;
  assigned_staff_name?: string;
  assigned_at?: string;
  ticket_status: "open" | "in_progress" | "pending_customer" | "resolved" | "closed";
  resolution?: string;
  satisfaction_rating?: number;
  sla_priority?: string;
  response_due_at?: string;
  resolution_due_at?: string;
  first_response_at?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

interface SupportStaff {
  id: number;
  name: string;
  email: string;
  role: string;
  active_tickets: number;
  avg_response_time: number;
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

const InternalSupportPage: React.FC = () => {
  const theme = useTheme();
  const [selectedTab, setSelectedTab] = useState(0);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [supportStaff, setSupportStaff] = useState<SupportStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [openTicketDialog, setOpenTicketDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [openResolveDialog, setOpenResolveDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" });
  const [filters, setFilters] = useState({
    status: "all",
    priority: "all",
    assigned_to: "all",
    category: "all",
  });

  const [ticketForm, setTicketForm] = useState({
    subject: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "critical",
    category: "",
    reporter_name: "",
    reporter_email: "",
    tenant_name: "",
  });

  const [assignForm, setAssignForm] = useState({
    assigned_to: "",
    notes: "",
  });

  const [resolveForm, setResolveForm] = useState({
    resolution: "",
    satisfaction_survey: false,
  });

  // Mock data - would be replaced with API calls
  const mockTickets: SupportTicket[] = [
    {
      id: 1,
      ticket_number: "TKT-2024-001",
      tenant_id: "tenant-1",
      tenant_name: "Acme Corporation",
      subject: "Unable to access billing dashboard",
      description: "User is getting 404 error when trying to access the billing section. This started happening after the recent update.",
      priority: "high",
      category: "Technical Issue",
      reporter_name: "John Smith",
      reporter_email: "john.smith@acmecorp.com",
      assigned_to: 1,
      assigned_staff_name: "Sarah Johnson",
      assigned_at: "2024-01-15T10:30:00Z",
      ticket_status: "in_progress",
      sla_priority: "business_hours",
      response_due_at: "2024-01-15T14:30:00Z",
      resolution_due_at: "2024-01-16T10:30:00Z",
      first_response_at: "2024-01-15T11:15:00Z",
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-15T11:15:00Z",
    },
    {
      id: 2,
      ticket_number: "TKT-2024-002",
      tenant_id: "tenant-2",
      tenant_name: "TechFlow Solutions",
      subject: "Feature request: Export functionality",
      description: "We need the ability to export project reports in PDF format. Currently only Excel export is available.",
      priority: "medium",
      category: "Feature Request",
      reporter_name: "Emma Davis",
      reporter_email: "emma.davis@techflow.com",
      assigned_to: 2,
      assigned_staff_name: "Mike Wilson",
      assigned_at: "2024-01-14T15:20:00Z",
      ticket_status: "pending_customer",
      sla_priority: "standard",
      response_due_at: "2024-01-15T15:20:00Z",
      resolution_due_at: "2024-01-17T15:20:00Z",
      first_response_at: "2024-01-14T16:45:00Z",
      created_at: "2024-01-14T15:00:00Z",
      updated_at: "2024-01-14T16:45:00Z",
    },
    {
      id: 3,
      ticket_number: "TKT-2024-003",
      tenant_id: "tenant-3",
      tenant_name: "DataSync Inc",
      subject: "Critical: Database connection errors",
      description: "Our application is experiencing frequent database timeouts and connection failures. This is affecting our production environment.",
      priority: "critical",
      category: "Technical Issue",
      reporter_name: "Robert Chen",
      reporter_email: "robert.chen@datasync.com",
      assigned_to: 1,
      assigned_staff_name: "Sarah Johnson",
      assigned_at: "2024-01-13T09:00:00Z",
      ticket_status: "resolved",
      resolution: "Identified and fixed database connection pool configuration. Monitoring shows stable connections now.",
      sla_priority: "critical",
      response_due_at: "2024-01-13T10:00:00Z",
      resolution_due_at: "2024-01-13T17:00:00Z",
      first_response_at: "2024-01-13T09:30:00Z",
      resolved_at: "2024-01-13T14:20:00Z",
      satisfaction_rating: 5,
      created_at: "2024-01-13T08:45:00Z",
      updated_at: "2024-01-13T14:20:00Z",
    },
    {
      id: 4,
      ticket_number: "TKT-2024-004",
      subject: "Password reset not working",
      description: "Multiple users report that password reset emails are not being received.",
      priority: "medium",
      category: "Account Issue",
      reporter_name: "Lisa Anderson",
      reporter_email: "lisa@example.com",
      ticket_status: "open",
      sla_priority: "standard",
      response_due_at: "2024-01-16T12:00:00Z",
      resolution_due_at: "2024-01-18T12:00:00Z",
      created_at: "2024-01-16T08:00:00Z",
      updated_at: "2024-01-16T08:00:00Z",
    },
  ];

  const mockSupportStaff: SupportStaff[] = [
    { id: 1, name: "Sarah Johnson", email: "sarah.johnson@teleops.com", role: "Senior Support Engineer", active_tickets: 8, avg_response_time: 2.3 },
    { id: 2, name: "Mike Wilson", email: "mike.wilson@teleops.com", role: "Support Engineer", active_tickets: 12, avg_response_time: 3.1 },
    { id: 3, name: "Jennifer Brown", email: "jennifer.brown@teleops.com", role: "Technical Lead", active_tickets: 5, avg_response_time: 1.8 },
    { id: 4, name: "David Kim", email: "david.kim@teleops.com", role: "Support Engineer", active_tickets: 9, avg_response_time: 2.7 },
  ];

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setTickets(mockTickets);
      setSupportStaff(mockSupportStaff);
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, ticket: SupportTicket) => {
    setAnchorEl(event.currentTarget);
    setSelectedTicket(ticket);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTicket(null);
  };

  const handleCreateTicket = async () => {
    try {
      const newTicket: SupportTicket = {
        id: Date.now(),
        ticket_number: `TKT-2024-${String(tickets.length + 1).padStart(3, "0")}`,
        subject: ticketForm.subject,
        description: ticketForm.description,
        priority: ticketForm.priority,
        category: ticketForm.category,
        reporter_name: ticketForm.reporter_name,
        reporter_email: ticketForm.reporter_email,
        tenant_name: ticketForm.tenant_name,
        ticket_status: "open",
        sla_priority: "standard",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setTickets((prev) => [newTicket, ...prev]);
      setOpenTicketDialog(false);
      setTicketForm({
        subject: "",
        description: "",
        priority: "medium",
        category: "",
        reporter_name: "",
        reporter_email: "",
        tenant_name: "",
      });
      setSnackbar({
        open: true,
        message: "Support ticket created successfully",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to create ticket",
        severity: "error",
      });
    }
  };

  const handleAssignTicket = async () => {
    if (!selectedTicket) return;

    try {
      const staffMember = supportStaff.find((s) => s.id === Number(assignForm.assigned_to));
      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === selectedTicket.id
            ? {
                ...ticket,
                assigned_to: Number(assignForm.assigned_to),
                assigned_staff_name: staffMember?.name,
                assigned_at: new Date().toISOString(),
                ticket_status: "in_progress",
                updated_at: new Date().toISOString(),
              }
            : ticket
        )
      );
      setOpenAssignDialog(false);
      setAssignForm({ assigned_to: "", notes: "" });
      setSnackbar({
        open: true,
        message: "Ticket assigned successfully",
        severity: "success",
      });
      handleMenuClose();
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to assign ticket",
        severity: "error",
      });
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket) return;

    try {
      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === selectedTicket.id
            ? {
                ...ticket,
                ticket_status: "resolved",
                resolution: resolveForm.resolution,
                resolved_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            : ticket
        )
      );
      setOpenResolveDialog(false);
      setResolveForm({ resolution: "", satisfaction_survey: false });
      setSnackbar({
        open: true,
        message: "Ticket resolved successfully",
        severity: "success",
      });
      handleMenuClose();
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to resolve ticket",
        severity: "error",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "critical":
        return theme.palette.error.main;
      case "high":
        return theme.palette.warning.main;
      case "medium":
        return theme.palette.info.main;
      case "low":
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "critical":
        return <Error />;
      case "high":
        return <Warning />;
      case "medium":
        return <Info />;
      case "low":
        return <CheckCircle />;
      default:
        return <Info />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "resolved":
      case "closed":
        return theme.palette.success.main;
      case "in_progress":
        return theme.palette.warning.main;
      case "pending_customer":
        return theme.palette.info.main;
      case "open":
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const supportMetrics = {
    totalTickets: tickets.length,
    openTickets: tickets.filter((t) => t.ticket_status === "open").length,
    inProgressTickets: tickets.filter((t) => t.ticket_status === "in_progress").length,
    resolvedTickets: tickets.filter((t) => t.ticket_status === "resolved").length,
    avgResponseTime: 2.5, // Mock data
    avgResolutionTime: 24.3, // Mock data
    satisfactionRating: 4.6, // Mock data
    criticalTickets: tickets.filter((t) => t.priority === "critical").length,
    highPriorityTickets: tickets.filter((t) => t.priority === "high").length,
  };

  const formatTimeToResponse = (ticket: SupportTicket) => {
    if (!ticket.response_due_at) return "No SLA";
    const due = new Date(ticket.response_due_at);
    const now = new Date();
    const diff = due.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (diff < 0) return "Overdue";
    if (hours < 1) return "Due soon";
    return `${hours}h left`;
  };

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Support Management
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Typography variant="h4" fontWeight={700}>
          Support Ticket Management
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpenTicketDialog(true)} sx={{ borderRadius: 2 }}>
          Create Ticket
        </Button>
      </Box>

      {/* Support Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Open Tickets
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="error.main">
                    {supportMetrics.openTickets}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.error.main }}>
                  <Schedule />
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
                    In Progress
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="warning.main">
                    {supportMetrics.inProgressTickets}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.warning.main }}>
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
                    Resolved
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="success.main">
                    {supportMetrics.resolvedTickets}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.success.main }}>
                  <CheckCircle />
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
                    Avg Response
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="primary.main">
                    {supportMetrics.avgResponseTime}h
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                  <AccessTime />
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
                    Satisfaction
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="secondary.main">
                    {supportMetrics.satisfactionRating}/5
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                  <Star />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabbed Content */}
      <Paper elevation={3}>
        <Tabs value={selectedTab} onChange={handleTabChange} sx={{ px: 3, pt: 2 }}>
          <Tab
            label={
              <Badge badgeContent={supportMetrics.openTickets + supportMetrics.inProgressTickets} color="error">
                Active Tickets
              </Badge>
            }
          />
          <Tab label="All Tickets" />
          <Tab label="Team Performance" />
          <Tab label="Analytics" />
        </Tabs>

        <TabPanel value={selectedTab} index={0}>
          {/* Active Tickets */}
          <Box sx={{ p: 3 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Ticket Details</TableCell>
                    <TableCell>Reporter</TableCell>
                    <TableCell align="center">Priority</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell>Assigned To</TableCell>
                    <TableCell>Response Due</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tickets
                    .filter((t) => t.ticket_status === "open" || t.ticket_status === "in_progress")
                    .map((ticket) => (
                      <TableRow key={ticket.id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body1" fontWeight={600}>
                              {ticket.ticket_number}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
                              {ticket.subject}
                            </Typography>
                            {ticket.tenant_name && (
                              <Typography variant="caption" color="primary.main">
                                {ticket.tenant_name}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography variant="body2">{ticket.reporter_name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {ticket.reporter_email}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={getPriorityIcon(ticket.priority)}
                            label={ticket.priority}
                            size="small"
                            sx={{
                              bgcolor: getPriorityColor(ticket.priority),
                              color: "white",
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={ticket.ticket_status.replace("_", " ")}
                            size="small"
                            variant="outlined"
                            sx={{
                              borderColor: getStatusColor(ticket.ticket_status),
                              color: getStatusColor(ticket.ticket_status),
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {ticket.assigned_staff_name ? (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Avatar sx={{ width: 24, height: 24, bgcolor: theme.palette.primary.main }}>{ticket.assigned_staff_name.charAt(0)}</Avatar>
                              <Typography variant="body2">{ticket.assigned_staff_name}</Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Unassigned
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color={formatTimeToResponse(ticket) === "Overdue" ? "error.main" : formatTimeToResponse(ticket) === "Due soon" ? "warning.main" : "text.primary"}>
                            {formatTimeToResponse(ticket)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton onClick={(e) => handleMenuClick(e, ticket)} size="small">
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={1}>
          {/* All Tickets */}
          <Box sx={{ p: 3 }}>
            {/* Filters */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} label="Status">
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="open">Open</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="pending_customer">Pending Customer</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                    <MenuItem value="closed">Closed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Priority</InputLabel>
                  <Select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} label="Priority">
                    <MenuItem value="all">All Priority</MenuItem>
                    <MenuItem value="critical">Critical</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Assigned To</InputLabel>
                  <Select value={filters.assigned_to} onChange={(e) => setFilters({ ...filters, assigned_to: e.target.value })} label="Assigned To">
                    <MenuItem value="all">All Staff</MenuItem>
                    {supportStaff.map((staff) => (
                      <MenuItem key={staff.id} value={staff.id.toString()}>
                        {staff.name}
                      </MenuItem>
                    ))}
                    <MenuItem value="unassigned">Unassigned</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search tickets..."
                  InputProps={{
                    startAdornment: <Search fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />,
                  }}
                />
              </Grid>
            </Grid>

            {/* All Tickets Table */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Ticket Details</TableCell>
                    <TableCell>Reporter</TableCell>
                    <TableCell align="center">Priority</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell>Assigned To</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body1" fontWeight={600}>
                            {ticket.ticket_number}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
                            {ticket.subject}
                          </Typography>
                          {ticket.tenant_name && (
                            <Typography variant="caption" color="primary.main">
                              {ticket.tenant_name}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">{ticket.reporter_name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {ticket.reporter_email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={getPriorityIcon(ticket.priority)}
                          label={ticket.priority}
                          size="small"
                          sx={{
                            bgcolor: getPriorityColor(ticket.priority),
                            color: "white",
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={ticket.ticket_status.replace("_", " ")}
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor: getStatusColor(ticket.ticket_status),
                            color: getStatusColor(ticket.ticket_status),
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {ticket.assigned_staff_name ? (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Avatar sx={{ width: 24, height: 24, bgcolor: theme.palette.primary.main }}>{ticket.assigned_staff_name.charAt(0)}</Avatar>
                            <Typography variant="body2">{ticket.assigned_staff_name}</Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Unassigned
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{new Date(ticket.created_at).toLocaleDateString()}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton onClick={(e) => handleMenuClick(e, ticket)} size="small">
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={2}>
          {/* Team Performance */}
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Support Team Performance
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Team Member</TableCell>
                    <TableCell align="center">Active Tickets</TableCell>
                    <TableCell align="center">Avg Response Time</TableCell>
                    <TableCell align="center">Workload</TableCell>
                    <TableCell align="center">Performance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {supportStaff.map((staff) => (
                    <TableRow key={staff.id} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Avatar sx={{ bgcolor: theme.palette.primary.main }}>{staff.name.charAt(0)}</Avatar>
                          <Box>
                            <Typography variant="body1" fontWeight={600}>
                              {staff.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {staff.role}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="h6" color="primary.main">
                          {staff.active_tickets}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body1">{staff.avg_response_time}h</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={(staff.active_tickets / 15) * 100}
                            sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                            color={staff.active_tickets > 12 ? "error" : staff.active_tickets > 8 ? "warning" : "success"}
                          />
                          <Typography variant="caption">{Math.round((staff.active_tickets / 15) * 100)}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
                          {staff.avg_response_time < 2 ? <TrendingUp color="success" fontSize="small" /> : <TrendingDown color="error" fontSize="small" />}
                          <Typography variant="body2" color={staff.avg_response_time < 2 ? "success.main" : "error.main"}>
                            {staff.avg_response_time < 2 ? "Excellent" : "Needs Improvement"}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={3}>
          {/* Support Analytics */}
          <Grid container spacing={3} sx={{ p: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardHeader title="Response Time Metrics" />
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Average First Response
                    </Typography>
                    <Typography variant="h6">{supportMetrics.avgResponseTime} hours</Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Average Resolution Time
                    </Typography>
                    <Typography variant="h6">{supportMetrics.avgResolutionTime} hours</Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Customer Satisfaction
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="h6">{supportMetrics.satisfactionRating}/5.0</Typography>
                      <Star color="warning" />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardHeader title="Ticket Distribution" />
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2">Critical & High Priority</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {supportMetrics.criticalTickets + supportMetrics.highPriorityTickets}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={((supportMetrics.criticalTickets + supportMetrics.highPriorityTickets) / supportMetrics.totalTickets) * 100}
                      color="error"
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2">Open Tickets</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {supportMetrics.openTickets}
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={(supportMetrics.openTickets / supportMetrics.totalTickets) * 100} color="warning" sx={{ height: 6, borderRadius: 3 }} />
                  </Box>
                  <Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2">Resolution Rate</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {Math.round((supportMetrics.resolvedTickets / supportMetrics.totalTickets) * 100)}%
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={(supportMetrics.resolvedTickets / supportMetrics.totalTickets) * 100} color="success" sx={{ height: 6, borderRadius: 3 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
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
        <MenuItem onClick={handleMenuClose}>
          <Message fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem
          onClick={() => {
            setOpenAssignDialog(true);
            handleMenuClose();
          }}
        >
          <Assignment fontSize="small" sx={{ mr: 1 }} />
          Assign Ticket
        </MenuItem>
        <MenuItem
          onClick={() => {
            setOpenResolveDialog(true);
            handleMenuClose();
          }}
        >
          <CheckCircle fontSize="small" sx={{ mr: 1 }} />
          Resolve Ticket
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Escalate fontSize="small" sx={{ mr: 1 }} />
          Escalate Priority
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose} sx={{ color: "error.main" }}>
          <Close fontSize="small" sx={{ mr: 1 }} />
          Close Ticket
        </MenuItem>
      </Menu>

      {/* Create Ticket Dialog */}
      <Dialog open={openTicketDialog} onClose={() => setOpenTicketDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Support Ticket</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Subject" value={ticketForm.subject} onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select value={ticketForm.priority} onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value as any })} label="Priority">
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Reporter Name" value={ticketForm.reporter_name} onChange={(e) => setTicketForm({ ...ticketForm, reporter_name: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Reporter Email" type="email" value={ticketForm.reporter_email} onChange={(e) => setTicketForm({ ...ticketForm, reporter_email: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Tenant/Company" value={ticketForm.tenant_name} onChange={(e) => setTicketForm({ ...ticketForm, tenant_name: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Category" value={ticketForm.category} onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline rows={4} label="Description" value={ticketForm.description} onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenTicketDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateTicket}>
            Create Ticket
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Ticket Dialog */}
      <Dialog open={openAssignDialog} onClose={() => setOpenAssignDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Ticket</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Assign To</InputLabel>
              <Select value={assignForm.assigned_to} onChange={(e) => setAssignForm({ ...assignForm, assigned_to: e.target.value })} label="Assign To">
                {supportStaff.map((staff) => (
                  <MenuItem key={staff.id} value={staff.id.toString()}>
                    {staff.name} - {staff.role}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField fullWidth multiline rows={3} label="Assignment Notes (Optional)" value={assignForm.notes} onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenAssignDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAssignTicket}>
            Assign Ticket
          </Button>
        </DialogActions>
      </Dialog>

      {/* Resolve Ticket Dialog */}
      <Dialog open={openResolveDialog} onClose={() => setOpenResolveDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Resolve Ticket</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Resolution Details"
              value={resolveForm.resolution}
              onChange={(e) => setResolveForm({ ...resolveForm, resolution: e.target.value })}
              placeholder="Describe how the issue was resolved..."
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenResolveDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleResolveTicket}>
            Resolve Ticket
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

export default InternalSupportPage;
