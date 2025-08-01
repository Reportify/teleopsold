// Client Management Page for both Circle and Vendor tenants
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import { Add, Edit, Delete, Visibility, Business, Email, Phone, LocationOn, Assignment, TrendingUp, Warning, CheckCircle } from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { ModernSnackbar } from "../components";

interface Client {
  id: string;
  name: string;
  organization_code: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  relationship_type: "Primary" | "Secondary" | "Prospect";
  status: "Active" | "Inactive" | "Pending";
  total_projects: number;
  active_projects: number;
  total_revenue: number;
  last_activity: string;
  created_at: string;
}

interface ClientForm {
  name: string;
  organization_code: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  relationship_type: "Primary" | "Secondary" | "Prospect";
}

const ClientManagementPage: React.FC = () => {
  const { getCurrentTenant } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientForm>({
    name: "",
    organization_code: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    relationship_type: "Primary",
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "info" | "success" | "warning" | "error",
  });

  const currentTenant = getCurrentTenant();

  // Mock data for demonstration
  useEffect(() => {
    const mockClients: Client[] = [
      {
        id: "1",
        name: "Vodafone MPCG",
        organization_code: "VOD_MPCG",
        contact_person: "Rajesh Kumar",
        email: "rajesh.kumar@vodafone.com",
        phone: "+91-9876543210",
        address: "Indore, Madhya Pradesh",
        relationship_type: "Primary",
        status: "Active",
        total_projects: 15,
        active_projects: 8,
        total_revenue: 2500000,
        last_activity: "2024-12-15",
        created_at: "2024-01-15",
      },
      {
        id: "2",
        name: "Airtel UP East",
        organization_code: "AIR_UPE",
        contact_person: "Priya Sharma",
        email: "priya.sharma@airtel.com",
        phone: "+91-9876543211",
        address: "Lucknow, Uttar Pradesh",
        relationship_type: "Secondary",
        status: "Active",
        total_projects: 8,
        active_projects: 3,
        total_revenue: 1200000,
        last_activity: "2024-12-10",
        created_at: "2024-03-20",
      },
      {
        id: "3",
        name: "BSNL Bihar",
        organization_code: "BSNL_BIHAR",
        contact_person: "Amit Singh",
        email: "amit.singh@bsnl.in",
        phone: "+91-9876543212",
        address: "Patna, Bihar",
        relationship_type: "Prospect",
        status: "Pending",
        total_projects: 0,
        active_projects: 0,
        total_revenue: 0,
        last_activity: "2024-12-05",
        created_at: "2024-11-15",
      },
    ];

    setTimeout(() => {
      setClients(mockClients);
      setLoading(false);
    }, 1000);
  }, []);

  const handleAddClient = () => {
    setEditingClient(null);
    setFormData({
      name: "",
      organization_code: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
      relationship_type: "Primary",
    });
    setDialogOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      organization_code: client.organization_code,
      contact_person: client.contact_person,
      email: client.email,
      phone: client.phone,
      address: client.address,
      relationship_type: client.relationship_type,
    });
    setDialogOpen(true);
  };

  const handleDeleteClient = (clientId: string) => {
    setClients(clients.filter((client) => client.id !== clientId));
    setSnackbar({
      open: true,
      message: "Client deleted successfully",
      severity: "success",
    });
  };

  const handleSaveClient = () => {
    if (editingClient) {
      // Update existing client
      setClients(clients.map((client) => (client.id === editingClient.id ? { ...client, ...formData } : client)));
      setSnackbar({
        open: true,
        message: "Client updated successfully",
        severity: "success",
      });
    } else {
      // Add new client
      const newClient: Client = {
        id: Date.now().toString(),
        ...formData,
        status: "Active",
        total_projects: 0,
        active_projects: 0,
        total_revenue: 0,
        last_activity: new Date().toISOString().split("T")[0],
        created_at: new Date().toISOString().split("T")[0],
      };
      setClients([...clients, newClient]);
      setSnackbar({
        open: true,
        message: "Client added successfully",
        severity: "success",
      });
    }
    setDialogOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "success";
      case "Inactive":
        return "error";
      case "Pending":
        return "warning";
      default:
        return "default";
    }
  };

  const getRelationshipColor = (type: string) => {
    switch (type) {
      case "Primary":
        return "primary";
      case "Secondary":
        return "secondary";
      case "Prospect":
        return "warning";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Client Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your client relationships and partnerships
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleAddClient} sx={{ borderRadius: 2 }}>
          Add Client
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Clients
              </Typography>
              <Typography variant="h4" component="div">
                {clients.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Active Clients
              </Typography>
              <Typography variant="h4" component="div">
                {clients.filter((c) => c.status === "Active").length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Projects
              </Typography>
              <Typography variant="h4" component="div">
                {clients.reduce((sum, client) => sum + client.total_projects, 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Revenue
              </Typography>
              <Typography variant="h4" component="div">
                ₹{clients.reduce((sum, client) => sum + client.total_revenue, 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Clients Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Client List
          </Typography>
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Client Name</TableCell>
                  <TableCell>Contact Person</TableCell>
                  <TableCell>Relationship</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Projects</TableCell>
                  <TableCell>Revenue</TableCell>
                  <TableCell>Last Activity</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {client.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {client.organization_code}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">{client.contact_person}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {client.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={client.relationship_type} color={getRelationshipColor(client.relationship_type) as any} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={client.status} color={getStatusColor(client.status) as any} size="small" />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {client.active_projects}/{client.total_projects}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Active/Total
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        ₹{client.total_revenue.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{new Date(client.last_activity).toLocaleDateString()}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Tooltip title="View Details">
                          <IconButton size="small">
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Client">
                          <IconButton size="small" onClick={() => handleEditClient(client)}>
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Client">
                          <IconButton size="small" color="error" onClick={() => handleDeleteClient(client.id)}>
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Add/Edit Client Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingClient ? "Edit Client" : "Add New Client"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Client Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Organization Code" value={formData.organization_code} onChange={(e) => setFormData({ ...formData, organization_code: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Contact Person" value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth label="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Relationship Type</InputLabel>
                <Select value={formData.relationship_type} label="Relationship Type" onChange={(e) => setFormData({ ...formData, relationship_type: e.target.value as any })}>
                  <MenuItem value="Primary">Primary</MenuItem>
                  <MenuItem value="Secondary">Secondary</MenuItem>
                  <MenuItem value="Prospect">Prospect</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Address" multiline rows={3} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveClient} variant="contained">
            {editingClient ? "Update" : "Add"} Client
          </Button>
        </DialogActions>
      </Dialog>

      <ModernSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })} />
    </Box>
  );
};

export default ClientManagementPage;
