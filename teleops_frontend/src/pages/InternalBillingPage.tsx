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
} from "@mui/material";
import {
  Receipt,
  Payment,
  Send,
  GetApp,
  MoreVert,
  CheckCircle,
  Error,
  Schedule,
  MonetizationOn,
  TrendingUp,
  TrendingDown,
  Assessment,
  Refresh,
  Add,
  Search,
  FilterList,
  Warning,
  AccountBalance,
  CreditCard,
  Business,
} from "@mui/icons-material";

interface Invoice {
  id: number;
  invoice_number: string;
  tenant_id: string;
  tenant_name: string;
  subscription_id?: number;
  invoice_date: string;
  due_date: string;
  billing_period_start?: string;
  billing_period_end?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency_code: string;
  invoice_status: "draft" | "sent" | "paid" | "overdue" | "cancelled" | "refunded";
  payment_status: "pending" | "paid" | "failed" | "refunded" | "disputed";
  payment_method?: string;
  payment_date?: string;
  payment_reference?: string;
}

interface PaymentRecord {
  id: number;
  invoice_id: number;
  amount: number;
  payment_method: string;
  payment_date: string;
  status: "success" | "failed" | "pending" | "refunded";
  reference_id: string;
  failure_reason?: string;
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

const InternalBillingPage: React.FC = () => {
  const theme = useTheme();
  const [selectedTab, setSelectedTab] = useState(0);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [openInvoiceDialog, setOpenInvoiceDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" });
  const [filters, setFilters] = useState({
    status: "all",
    payment_status: "all",
    date_range: "30d",
  });

  // Mock data - would be replaced with API calls
  const mockInvoices: Invoice[] = [
    {
      id: 1,
      invoice_number: "INV-2024-001",
      tenant_id: "tenant-1",
      tenant_name: "Acme Corporation",
      subscription_id: 1,
      invoice_date: "2024-01-01",
      due_date: "2024-01-31",
      billing_period_start: "2024-01-01",
      billing_period_end: "2024-01-31",
      subtotal: 2499,
      tax_amount: 449.82,
      discount_amount: 0,
      total_amount: 2948.82,
      currency_code: "INR",
      invoice_status: "paid",
      payment_status: "paid",
      payment_method: "Credit Card",
      payment_date: "2024-01-15",
      payment_reference: "TXN123456789",
    },
    {
      id: 2,
      invoice_number: "INV-2024-002",
      tenant_id: "tenant-2",
      tenant_name: "TechFlow Solutions",
      subscription_id: 2,
      invoice_date: "2024-01-05",
      due_date: "2024-02-04",
      billing_period_start: "2024-01-05",
      billing_period_end: "2024-02-04",
      subtotal: 4999,
      tax_amount: 899.82,
      discount_amount: 500,
      total_amount: 5398.82,
      currency_code: "INR",
      invoice_status: "overdue",
      payment_status: "failed",
      payment_method: "Bank Transfer",
    },
    {
      id: 3,
      invoice_number: "INV-2024-003",
      tenant_id: "tenant-3",
      tenant_name: "DataSync Inc",
      subscription_id: 1,
      invoice_date: "2024-01-10",
      due_date: "2024-02-09",
      billing_period_start: "2024-01-10",
      billing_period_end: "2024-02-09",
      subtotal: 999,
      tax_amount: 179.82,
      discount_amount: 100,
      total_amount: 1078.82,
      currency_code: "INR",
      invoice_status: "sent",
      payment_status: "pending",
    },
  ];

  const mockPayments: PaymentRecord[] = [
    {
      id: 1,
      invoice_id: 1,
      amount: 2948.82,
      payment_method: "Credit Card",
      payment_date: "2024-01-15",
      status: "success",
      reference_id: "TXN123456789",
    },
    {
      id: 2,
      invoice_id: 2,
      amount: 5398.82,
      payment_method: "Bank Transfer",
      payment_date: "2024-01-20",
      status: "failed",
      reference_id: "TXN987654321",
      failure_reason: "Insufficient funds",
    },
  ];

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setInvoices(mockInvoices);
      setPayments(mockPayments);
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, invoice: Invoice) => {
    setAnchorEl(event.currentTarget);
    setSelectedInvoice(invoice);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedInvoice(null);
  };

  const handleMarkAsPaid = async (invoice: Invoice) => {
    try {
      setInvoices((prev) => prev.map((inv) => (inv.id === invoice.id ? { ...inv, payment_status: "paid", invoice_status: "paid", payment_date: new Date().toISOString() } : inv)));
      setSnackbar({
        open: true,
        message: "Invoice marked as paid successfully",
        severity: "success",
      });
      handleMenuClose();
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to update invoice status",
        severity: "error",
      });
    }
  };

  const handleSendInvoice = async (invoice: Invoice) => {
    try {
      setInvoices((prev) => prev.map((inv) => (inv.id === invoice.id ? { ...inv, invoice_status: "sent" } : inv)));
      setSnackbar({
        open: true,
        message: "Invoice sent successfully",
        severity: "success",
      });
      handleMenuClose();
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Failed to send invoice",
        severity: "error",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "success";
      case "pending":
        return "warning";
      case "overdue":
        return "error";
      case "failed":
        return "error";
      case "draft":
        return "default";
      case "sent":
        return "info";
      case "refunded":
        return "secondary";
      default:
        return "default";
    }
  };

  const billingMetrics = {
    totalInvoices: invoices.length,
    totalRevenue: invoices.filter((inv) => inv.payment_status === "paid").reduce((sum, inv) => sum + inv.total_amount, 0),
    pendingAmount: invoices.filter((inv) => inv.payment_status === "pending").reduce((sum, inv) => sum + inv.total_amount, 0),
    overdueAmount: invoices.filter((inv) => inv.invoice_status === "overdue").reduce((sum, inv) => sum + inv.total_amount, 0),
    paidInvoices: invoices.filter((inv) => inv.payment_status === "paid").length,
    pendingInvoices: invoices.filter((inv) => inv.payment_status === "pending").length,
    overdueInvoices: invoices.filter((inv) => inv.invoice_status === "overdue").length,
    paymentSuccessRate: invoices.length > 0 ? (invoices.filter((inv) => inv.payment_status === "paid").length / invoices.length) * 100 : 0,
  };

  const recentActivity = [
    { type: "payment", description: "Payment received from Acme Corporation", amount: 2948.82, time: "2 hours ago" },
    { type: "invoice", description: "Invoice sent to TechFlow Solutions", amount: 5398.82, time: "5 hours ago" },
    { type: "failure", description: "Payment failed for DataSync Inc", amount: 1078.82, time: "1 day ago" },
    { type: "refund", description: "Refund processed for CloudNet Solutions", amount: 1999.99, time: "2 days ago" },
  ];

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Billing & Invoice Management
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
          Billing & Invoice Management
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="outlined" startIcon={<Refresh />}>
            Sync Payments
          </Button>
          <Button variant="contained" startIcon={<Add />}>
            Generate Invoices
          </Button>
        </Box>
      </Box>

      {/* Billing Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Revenue
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="success.main">
                    {formatCurrency(billingMetrics.totalRevenue)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.success.main }}>
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
                    Pending Amount
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="warning.main">
                    {formatCurrency(billingMetrics.pendingAmount)}
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
                    Overdue Amount
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="error.main">
                    {formatCurrency(billingMetrics.overdueAmount)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.error.main }}>
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
                    Success Rate
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="primary.main">
                    {billingMetrics.paymentSuccessRate.toFixed(1)}%
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                  <Assessment />
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
              <Badge badgeContent={billingMetrics.totalInvoices} color="primary">
                Invoices
              </Badge>
            }
          />
          <Tab
            label={
              <Badge badgeContent={payments.length} color="secondary">
                Payments
              </Badge>
            }
          />
          <Tab label="Reports" />
          <Tab label="Activity" />
        </Tabs>

        <TabPanel value={selectedTab} index={0}>
          {/* Invoices Management */}
          <Box sx={{ p: 3 }}>
            {/* Filters */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Invoice Status</InputLabel>
                  <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} label="Invoice Status">
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="sent">Sent</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="overdue">Overdue</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Payment Status</InputLabel>
                  <Select value={filters.payment_status} onChange={(e) => setFilters({ ...filters, payment_status: e.target.value })} label="Payment Status">
                    <MenuItem value="all">All Payments</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Date Range</InputLabel>
                  <Select value={filters.date_range} onChange={(e) => setFilters({ ...filters, date_range: e.target.value })} label="Date Range">
                    <MenuItem value="7d">Last 7 days</MenuItem>
                    <MenuItem value="30d">Last 30 days</MenuItem>
                    <MenuItem value="90d">Last 90 days</MenuItem>
                    <MenuItem value="1y">Last year</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search invoices..."
                  InputProps={{
                    startAdornment: <Search fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />,
                  }}
                />
              </Grid>
            </Grid>

            {/* Invoices Table */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice Details</TableCell>
                    <TableCell>Tenant</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="center">Invoice Status</TableCell>
                    <TableCell align="center">Payment Status</TableCell>
                    <TableCell>Due Date</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body1" fontWeight={600}>
                            {invoice.invoice_number}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(invoice.invoice_date).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main }}>
                            <Business fontSize="small" />
                          </Avatar>
                          <Typography variant="body2">{invoice.tenant_name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" fontWeight={600}>
                          {formatCurrency(invoice.total_amount)}
                        </Typography>
                        {invoice.discount_amount > 0 && (
                          <Typography variant="caption" color="success.main">
                            -{formatCurrency(invoice.discount_amount)} discount
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={invoice.invoice_status} color={getStatusColor(invoice.invoice_status) as any} size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={invoice.payment_status} color={getStatusColor(invoice.payment_status) as any} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={new Date(invoice.due_date) < new Date() && invoice.payment_status !== "paid" ? "error.main" : "text.primary"}>
                          {new Date(invoice.due_date).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton onClick={(e) => handleMenuClick(e, invoice)} size="small">
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
          {/* Payments Management */}
          <Box sx={{ p: 3 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Payment Details</TableCell>
                    <TableCell>Invoice</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Reference</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body1" fontWeight={600}>
                            Payment #{payment.id}
                          </Typography>
                          {payment.failure_reason && (
                            <Typography variant="caption" color="error.main">
                              {payment.failure_reason}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{invoices.find((inv) => inv.id === payment.invoice_id)?.invoice_number}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" fontWeight={600}>
                          {formatCurrency(payment.amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <CreditCard fontSize="small" />
                          <Typography variant="body2">{payment.payment_method}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={payment.status} color={getStatusColor(payment.status) as any} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{new Date(payment.payment_date).toLocaleDateString()}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                          {payment.reference_id}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={2}>
          {/* Billing Reports */}
          <Grid container spacing={3} sx={{ p: 3 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardHeader title="Revenue Summary" />
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Paid Invoices
                    </Typography>
                    <Typography variant="h6">{billingMetrics.paidInvoices}</Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Revenue (This Month)
                    </Typography>
                    <Typography variant="h6" color="success.main">
                      {formatCurrency(billingMetrics.totalRevenue)}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Outstanding Amount
                    </Typography>
                    <Typography variant="h6" color="warning.main">
                      {formatCurrency(billingMetrics.pendingAmount + billingMetrics.overdueAmount)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Payment Success Rate
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                      <LinearProgress variant="determinate" value={billingMetrics.paymentSuccessRate} sx={{ flexGrow: 1, height: 8, borderRadius: 4 }} />
                      <Typography variant="body2" fontWeight={600}>
                        {billingMetrics.paymentSuccessRate.toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardHeader title="Invoice Status Breakdown" />
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2">Paid</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {billingMetrics.paidInvoices}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(billingMetrics.paidInvoices / billingMetrics.totalInvoices) * 100}
                      sx={{ height: 6, borderRadius: 3, bgcolor: theme.palette.grey[200] }}
                    />
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2">Pending</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {billingMetrics.pendingInvoices}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(billingMetrics.pendingInvoices / billingMetrics.totalInvoices) * 100}
                      color="warning"
                      sx={{ height: 6, borderRadius: 3, bgcolor: theme.palette.grey[200] }}
                    />
                  </Box>
                  <Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2">Overdue</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {billingMetrics.overdueInvoices}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(billingMetrics.overdueInvoices / billingMetrics.totalInvoices) * 100}
                      color="error"
                      sx={{ height: 6, borderRadius: 3, bgcolor: theme.palette.grey[200] }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={selectedTab} index={3}>
          {/* Recent Activity */}
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Billing Activity
            </Typography>
            {recentActivity.map((activity, index) => (
              <Paper key={index} elevation={1} sx={{ p: 2, mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: activity.type === "payment" ? "success.main" : activity.type === "invoice" ? "info.main" : activity.type === "failure" ? "error.main" : "warning.main",
                        width: 40,
                        height: 40,
                      }}
                    >
                      {activity.type === "payment" && <CheckCircle />}
                      {activity.type === "invoice" && <Receipt />}
                      {activity.type === "failure" && <Error />}
                      {activity.type === "refund" && <AccountBalance />}
                    </Avatar>
                    <Box>
                      <Typography variant="body1">{activity.description}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {activity.time}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="h6" fontWeight={600}>
                    {formatCurrency(activity.amount)}
                  </Typography>
                </Box>
              </Paper>
            ))}
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
        <MenuItem
          onClick={() => {
            /* View invoice details */ handleMenuClose();
          }}
        >
          <Receipt fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={() => handleSendInvoice(selectedInvoice!)}>
          <Send fontSize="small" sx={{ mr: 1 }} />
          Send Invoice
        </MenuItem>
        <MenuItem onClick={() => handleMarkAsPaid(selectedInvoice!)}>
          <CheckCircle fontSize="small" sx={{ mr: 1 }} />
          Mark as Paid
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <GetApp fontSize="small" sx={{ mr: 1 }} />
          Download PDF
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose} sx={{ color: "error.main" }}>
          <Warning fontSize="small" sx={{ mr: 1 }} />
          Cancel Invoice
        </MenuItem>
      </Menu>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default InternalBillingPage;
